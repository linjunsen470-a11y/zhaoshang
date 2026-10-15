const options = require('../config/commercial.js');
const PUBLIC = ['online', 'coming', 'full'];
function sceneOf(p) {
  return p.businessScene || (options.campusTypes.includes(p.projectType) ? 'campus' : '');
}
function rangeText(min, max, unit) {
  if (typeof min !== 'number' || typeof max !== 'number') return '';
  return (min === max ? String(min) : `${min}—${max}`) + unit;
}
function campusLabel(p) {
  const place = `${p.city || ''}${p.district || ''}`;
  return place ? `${place}某学校` : '某学校';
}
function schoolNames(p) {
  return [p.schoolName, p.schoolAlias].map(value => String(value || '').trim()).filter(value => value.length >= 2).sort((left, right) => right.length - left.length);
}
function scrubText(value, names, label) {
  return names.reduce((current, name) => String(current || '').split(name).join(label), String(value || ''));
}
function contains(text, part) {
  const value = String(part || '').trim();
  return Boolean(value) && String(text || '').includes(value);
}
function summaryPlace(title, label, city, district) {
  const place = String(label || '').trim();
  const titled = String(title || '');
  const extra = [city, district]
    .map(part => String(part || '').trim())
    .filter(part => part && !contains(titled, part) && !contains(place, part));
  if (place && !contains(titled, place)) return extra.concat(place).join(' · ');
  return extra.join(' · ');
}
function detailPlace(scene, label, city, district) {
  if (scene === 'campus') return String(label || '').trim();
  const parts = [];
  [city, district, label].forEach(part => {
    const text = String(part || '').trim();
    if (!text || parts.some(item => item === text || item.includes(text) || text.includes(item))) return;
    parts.push(text);
  });
  return parts.join(' · ');
}
function decorate(p) {
  const businessScene = sceneOf(p);
  const campusName = campusLabel(p);
  const names = schoolNames(p);
  const rewrite = value => names.length ? scrubText(value, names, campusName) : String(value || '');
  const label = businessScene === 'campus' ? campusName : rewrite(p.venueName || p.district || '');
  const title = rewrite(p.title);
  const feeText = rewrite(p.feeText);
  const rentText = rangeText(p.monthlyRentMin, p.monthlyRentMax, '元/月');
  const highlights = Array.isArray(p.highlights) ? p.highlights.map(rewrite) : p.highlights;
  const transferInfo = p.transferInfo && typeof p.transferInfo === 'object' ? Object.keys(p.transferInfo).reduce((info, key) => {
    info[key] = typeof p.transferInfo[key] === 'string' ? rewrite(p.transferInfo[key]) : p.transferInfo[key];
    return info;
  }, {}) : p.transferInfo;
  const parent = p.parentProject && typeof p.parentProject === 'object' ? { ...p.parentProject, title: rewrite(p.parentProject.title) } : p.parentProject;
  return { ...p, businessScene, listingKind: p.listingKind || 'unit',
    isDemoImage: [p.coverImage, ...(Array.isArray(p.images) ? p.images : [])].some(url => /^\/images\/(demo\/|shop-demo-)/.test(url || '')),
    sceneLabel: (options.scenes.find(s => s.value === businessScene) || {}).label || '待分类',
    kindLabel: p.listingKind === 'project' ? '项目招商' : '具体铺位',
    locationLabel: label,
    placeText: summaryPlace(title, label, p.city, p.district),
    placeDetail: detailPlace(businessScene, label, p.city, p.district),
    title,
    addressText: rewrite(p.addressText),
    customerInfo: rewrite(p.customerInfo),
    introduction: rewrite(p.introduction),
    operatingRequirements: rewrite(p.operatingRequirements),
    venueName: businessScene === 'campus' ? '' : rewrite(p.venueName),
    showVenue: businessScene !== 'campus' && Boolean(rewrite(p.venueName)) && !detailPlace(businessScene, label, p.city, p.district).includes(rewrite(p.venueName)),
    unitLocation: rewrite(p.unitLocation),
    communityInfo: rewrite(p.communityInfo),
    tourismInfo: rewrite(p.tourismInfo),
    mallInfo: rewrite(p.mallInfo),
    premisesConditions: rewrite(p.premisesConditions),
    cooperationMode: rewrite(p.cooperationMode),
    viewingTimeText: rewrite(p.viewingTimeText),
    feeText,
    priceText: rentText || feeText || '面议',
    priceLabel: rentText ? '基础月租' : '费用',
    areaText: rewrite(p.areaText),
    highlights,
    transferInfo,
    parentProject: parent,
    schoolName: '',
    schoolAlias: '',
    showFullSchoolName: false,
    areaRangeText: rangeText(p.areaMin, p.areaMax, '㎡') || rewrite(p.areaText) || '面积待确认',
    monthlyRentText: rentText || '面议',
  };
}
function parentId(p) { return p.parentProject && typeof p.parentProject === 'object' ? p.parentProject.id : p.parentProject; }
function publicRecord(p, all) {
  if (!p || !PUBLIC.includes(p.status)) return false;
  if (!parentId(p)) return true;
  const parent = all.find(item => String(item.id) === String(parentId(p)));
  return Boolean(parent && parent.listingKind === 'project' && PUBLIC.includes(parent.status));
}
function overlaps(p, min, max, range) {
  return typeof p[min] === 'number' && typeof p[max] === 'number'
    && p[max] >= range.min && (range.max === null || p[min] < range.max);
}
function queryLocal(all, params) {
  let docs = all.filter(p => publicRecord(p, all)).map(p => {
    const parent = all.find(item => String(item.id) === String(parentId(p)));
    return decorate({ ...p, parentProject: parent ? { id: parent.id, title: parent.title, status: parent.status } : null });
  });
  ['district', 'projectType', 'status', 'opportunityType', 'businessScene', 'listingKind'].forEach(key => {
    if (params[key] && params[key] !== '全部') docs = docs.filter(p => p[key] === params[key]);
  });
  if (params.parentProject) docs = docs.filter(p => String(parentId(p)) === String(params.parentProject));
  if (params.recommended === true || params.recommended === 'true') docs = docs.filter(p => p.isRecommended);
  if (params.ids !== undefined) { const ids = String(params.ids).split(','); docs = docs.filter(p => ids.includes(String(p.id))); }
  if (params.business && params.business !== '全部') docs = docs.filter(p => (p.suitableBusiness || []).includes(params.business));
  if (params.q) { const q = params.q.toLowerCase().trim(); docs = docs.filter(p => [p.title, p.venueName, p.schoolName, p.schoolAlias, p.district, p.addressText, ...(p.suitableBusiness || [])].some(v => String(v || '').toLowerCase().includes(q))); }
  [['area', options.areas, 'areaMin', 'areaMax'], ['rent', options.rents, 'monthlyRentMin', 'monthlyRentMax']].forEach(([key, ranges, min, max]) => {
    if (!params[key] || params[key] === '全部') return;
    const range = ranges.find(r => r.value === params[key]);
    if (!range) throw new Error('筛选无效');
    docs = docs.filter(p => overlaps(p, min, max, range));
  });
  const timestamp = value => typeof value === 'number' ? value : Date.parse(value) || 0;
  docs.sort((a, b) => (params.sort === 'latest' ? 0 : (b.sort || 0) - (a.sort || 0)) || timestamp(b.createdAt) - timestamp(a.createdAt) || String(b.id).localeCompare(String(a.id)));
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const paginated = params.pagination === true || params.pagination === 'true';
  const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit) || (paginated ? 20 : 100))));
  const totalDocs = docs.length;
  const totalPages = Math.ceil(totalDocs / limit);
  docs = docs.slice((page - 1) * limit, page * limit);
  return paginated ? { docs, page, totalDocs, totalPages, hasNextPage: page < totalPages } : docs;
}
function scrubKnownText(value, project) {
  if (!project) return String(value || '');
  const names = schoolNames(project);
  return names.length ? scrubText(value, names, campusLabel(project)) : String(value || '');
}
module.exports = { options, sceneOf, decorate, publicRecord, overlaps, queryLocal, scrubKnownText };
