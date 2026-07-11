/** Mini-program share copy helpers for staff CMS. */

export type ShareableProject = {
  id: string | number
  title?: string | null
  schoolName?: string | null
  schoolAlias?: string | null
  district?: string | null
  areaText?: string | null
  feeText?: string | null
  projectType?: string | null
  opportunityType?: string | null
  status?: string | null
}

export function miniProgramDetailPath(projectId: string | number) {
  return `/pages/detail/detail?id=${projectId}`
}

export function buildShareMaterial(project: ShareableProject) {
  const id = String(project.id)
  const title = (project.title || '校园商铺').trim()
  const school = (project.schoolName || project.schoolAlias || '').trim()
  const district = (project.district || '').trim()
  const area = (project.areaText || '').trim()
  const fee = (project.feeText || '').trim()
  const type = project.opportunityType === 'transfer' ? '店铺转让' : '招商铺位'
  const path = miniProgramDetailPath(id)

  const lines = [
    `【${type}】${title}`,
    school ? `📍 学校：${school}` : '',
    district ? `🗺 区域：${district}` : '',
    area ? `📐 面积：${area}` : '',
    fee ? `💰 费用：${fee}` : '',
    '',
    '感兴趣可打开小程序查看详情或提交咨询。',
    `小程序路径：${path}`,
  ].filter(line => line !== undefined)

  return {
    path,
    headline: `【校园商铺】${title}`,
    copyText: lines.filter(Boolean).join('\n'),
    shortText: [title, school || district, fee].filter(Boolean).join(' · '),
  }
}
