import { getPayload } from 'payload'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { demoFollows, demoLeads, demoMedia, demoProjects } from './demo-data'

type Collection = 'media' | 'projects' | 'leads' | 'follow-records'

function loadLocalEnv() {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const envPath = resolve(currentDir, '../.env')
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

async function findBySeedKey(payload: Awaited<ReturnType<typeof getPayload>>, collection: Collection, seedKey: string) {
  const result = await payload.find({
    collection,
    where: { seedKey: { equals: seedKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  } as never)

  return result.docs[0] as { id: string | number } | undefined
}

async function upsert(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: Collection,
  seedKey: string,
  data: Record<string, unknown>,
) {
  const existing = await findBySeedKey(payload, collection, seedKey)
  if (existing) {
    const updated = await payload.update({
      collection,
      id: existing.id,
      data: { seedKey, ...data },
      overrideAccess: true,
    } as never)
    return updated as unknown as { id: string | number }
  }

  const created = await payload.create({
    collection,
    data: { seedKey, ...data },
    overrideAccess: true,
  } as never)
  return created as unknown as { id: string | number }
}

async function downloadImage(url: string, filename: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`)

  const input = Buffer.from(await response.arrayBuffer())
  const output = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer()

  return {
    data: output,
    mimetype: 'image/jpeg',
    name: filename.replace(/\.[^.]+$/, '.jpg'),
    size: output.length,
  }
}

async function upsertMedia(payload: Awaited<ReturnType<typeof getPayload>>) {
  const ids = new Map<string, string | number>()

  for (const media of demoMedia) {
    const file = await downloadImage(media.sourceUrl, media.filename)
    const existing = await findBySeedKey(payload, 'media', media.seedKey)

    if (existing) {
      await payload.delete({ collection: 'media', id: existing.id, overrideAccess: true })
    }

    const created = await payload.create({
      collection: 'media',
      data: {
        seedKey: media.seedKey,
        alt: media.alt,
        source: 'seed_demo',
        originalFilename: media.filename,
        compressedSize: file.size,
      },
      file,
      overrideAccess: true,
    } as never)
    ids.set(media.seedKey, (created as unknown as { id: string | number }).id)
  }

  return ids
}

async function main() {
  loadLocalEnv()
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  const mediaIds = await upsertMedia(payload)
  const projectIds = new Map<string, string | number>()
  const leadIds = new Map<string, string | number>()

  for (const project of demoProjects) {
    const projectImages = project.mediaSeedKeys.map(seedKey => mediaIds.get(seedKey)).filter(Boolean)
    const [coverImage] = projectImages
    const saved = await upsert(payload, 'projects', project.seedKey, {
      opportunityType: project.opportunityType,
      title: project.title,
      city: project.city,
      district: project.district,
      addressText: project.addressText,
      schoolName: project.schoolName,
      schoolAlias: project.schoolAlias,
      showFullSchoolName: project.showFullSchoolName,
      projectType: project.projectType,
      areaText: project.areaText,
      feeText: project.feeText,
      suitableBusiness: project.suitableBusiness,
      unsuitableBusiness: project.unsuitableBusiness,
      highlights: project.highlights,
      trafficTags: project.trafficTags,
      facilityTags: project.facilityTags,
      advisorTips: project.advisorTips,
      customerInfo: project.customerInfo,
      cooperationMode: project.cooperationMode,
      viewingTimeText: project.viewingTimeText,
      coverImage,
      images: projectImages,
      transferInfo: 'transferInfo' in project ? project.transferInfo : undefined,
      status: project.status,
      auditStatus: project.auditStatus,
      isRecommended: project.isRecommended,
      sort: project.sort,
      remark: project.remark,
    })
    projectIds.set(project.seedKey, saved.id)
  }

  for (const lead of demoLeads) {
    const saved = await upsert(payload, 'leads', lead.seedKey, {
      submitterOpenId: lead.submitterOpenId,
      leadType: lead.leadType,
      sourceChannel: lead.sourceChannel,
      name: lead.name,
      phone: lead.phone,
      businessType: lead.businessType,
      budgetRange: lead.budgetRange,
      regionPreference: lead.regionPreference,
      hasCampusExperience: lead.hasCampusExperience,
      transferDetails: 'transferDetails' in lead ? lead.transferDetails : undefined,
      equipmentDetails: 'equipmentDetails' in lead ? lead.equipmentDetails : undefined,
      remark: lead.remark,
      status: lead.status,
      owner: lead.owner,
      project: 'projectSeedKey' in lead ? projectIds.get(lead.projectSeedKey) : undefined,
    })
    leadIds.set(lead.seedKey, saved.id)
  }

  for (const follow of demoFollows) {
    const nextFollowAt = new Date()
    nextFollowAt.setDate(nextFollowAt.getDate() + follow.nextFollowAtOffsetDays)

    await upsert(payload, 'follow-records', follow.seedKey, {
      lead: leadIds.get(follow.leadSeedKey),
      content: follow.content,
      operatorName: follow.operatorName,
      nextFollowAt: nextFollowAt.toISOString(),
    })
  }

  payload.logger.info(`Seeded ${demoProjects.length} projects, ${demoLeads.length} leads, ${demoFollows.length} follow records.`)
}

main().then(() => {
  process.exit(0)
}).catch(error => {
  console.error(error)
  process.exit(1)
})
