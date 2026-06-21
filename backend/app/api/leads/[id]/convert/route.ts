import { getPayloadInstance, json } from '../../../_shared/payloadApi'

type Args = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Args) {
  const { id } = await params
  const payload = await getPayloadInstance()

  let lead: any
  try {
    lead = await payload.findByID({
      collection: 'leads',
      id,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return json({ error: '线索不存在' }, 404)
  }

  if (lead.leadType !== 'transfer') {
    return json({ error: '只有店铺转让类型的线索才能转为招商机会' }, 400)
  }

  // Check if already converted to avoid duplicate projects
  const existingProjects = await payload.find({
    collection: 'projects',
    where: {
      and: [
        { title: { contains: `(转让线索ID: ${id})` } }
      ]
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existingProjects.docs.length > 0) {
    return json({ error: '该线索已转换过招商项目' }, 400)
  }

  const details = lead.transferDetails || {}
  
  // Create project data
  const projectData = {
    opportunityType: 'transfer',
    title: `${lead.businessType || '商铺'}转让 (${details.locationText || lead.regionPreference || '未指定区域'}) (转让线索ID: ${id})`,
    city: lead.city || '广州',
    district: details.locationText || lead.regionPreference || '',
    addressText: details.locationText || '',
    schoolName: '',
    schoolAlias: '',
    showFullSchoolName: false,
    projectType: '店铺转让',
    areaText: '',
    feeText: details.feeText || '面议',
    suitableBusiness: lead.businessType ? [{ item: lead.businessType }] : [],
    unsuitableBusiness: [],
    highlights: [],
    trafficTags: [],
    facilityTags: [],
    advisorTips: lead.remark || '',
    customerInfo: '',
    cooperationMode: '承接现有合同',
    viewingTimeText: '需提前预约顾问',
    coverImage: lead.attachments?.[0],
    images: lead.attachments || [],
    transferInfo: {
      currentBusiness: lead.businessType || '',
      monthlyRent: details.feeText || '',
      remainingTerm: details.remainingTerm || '',
      includesEquipment: !!details.includesEquipment,
      expectedTransferFee: details.transferFee || '',
      contractTransferAllowed: '待核实',
    },
    status: 'draft',
    auditStatus: 'pending',
    isRecommended: false,
    sort: 0,
    remark: `由店铺转让线索一键生成。联系人：${lead.name}，电话：${lead.phone}`,
  }

  try {
    const project = await payload.create({
      collection: 'projects',
      data: projectData as any,
      overrideAccess: true,
    })

    // Update lead status to viewed
    await payload.update({
      collection: 'leads',
      id,
      data: {
        status: 'viewed',
        remark: `${lead.remark || ''}\n【系统提示】已于 ${new Date().toLocaleString()} 一键转为招商项目草稿 (ID: ${project.id})。`.trim(),
      },
      overrideAccess: true,
    })

    return json({ success: true, projectId: project.id, projectTitle: project.title })
  } catch (err: any) {
    console.error('Failed to convert lead to project:', err)
    return json({ error: err.message || '转换项目失败' }, 500)
  }
}
