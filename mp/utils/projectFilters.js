const { options } = require('./commercial.js');
const ALL = '全部';
const all = [{ label: ALL, value: ALL }];
const strings = values => [...all, ...values.map(value => ({ label: value, value }))];
const FILTERS = [
  { key: 'sceneGroup', label: '场所', options: [...all, ...options.browseGroups] },
  { key: 'businessScene', label: '物业类型', options: [...all, ...options.scenes] },
  { key: 'listingKind', label: '内容', options: [...all, ...options.kinds] },
  { key: 'district', label: '区域', options: strings(options.districts) },
  { key: 'opportunityType', label: '业务', options: [...all, { label: '招商', value: 'leasing' }, { label: '转让', value: 'transfer' }] },
  { key: 'projectType', label: '校园细类', options: strings(options.campusTypes) },
  { key: 'area', label: '面积', options: [...all, ...options.areas] },
  { key: 'rent', label: '月租', options: [...all, ...options.rents] },
  { key: 'business', label: '经营品类', options: strings(options.businesses) },
  { key: 'status', label: '状态', options: [{ label: '可咨询', value: ALL }, { label: '开放中', value: 'online' }, { label: '即将开放', value: 'coming' }, { label: '已租满 / 已转', value: 'full' }] }
];
function defaults() { return Object.fromEntries(FILTERS.map(f => [f.key, ALL])); }
function normalize(filters) {
  const next = defaults();
  FILTERS.forEach(f => { if (f.options.some(o => o.value === filters[f.key])) next[f.key] = filters[f.key]; });
  if (next.sceneGroup === ALL && next.businessScene !== ALL) next.sceneGroup = options.browseGroups.find(group => group.scenes.includes(next.businessScene)).value;
  if (next.sceneGroup === 'campus') next.businessScene = 'campus';
  if (next.sceneGroup === 'workplace' && !['industrial_park', 'office'].includes(next.businessScene)) next.businessScene = ALL;
  if (next.businessScene !== 'campus') next.projectType = ALL;
  return next;
}
function tabs(filters) {
  return FILTERS.filter(f => (f.key !== 'projectType' || filters.sceneGroup === 'campus') && (f.key !== 'businessScene' || filters.sceneGroup === 'workplace')).map(f => {
    const active = filters[f.key] !== ALL;
    return { key: f.key, label: active ? f.options.find(o => o.value === filters[f.key]).label : f.label, active };
  });
}
function moreGroups(filters) {
  return FILTERS.filter(f => ['listingKind', 'opportunityType', 'business', 'status', 'projectType', 'businessScene'].includes(f.key)
    && (f.key !== 'projectType' || filters.sceneGroup === 'campus') && (f.key !== 'businessScene' || filters.sceneGroup === 'workplace'))
    .map(f => ({ ...f, options: f.key === 'businessScene' ? [{ label: '不限', value: ALL }, ...options.scenes.filter(scene => scene.value !== 'campus')] : f.options, selected: filters[f.key] }));
}
module.exports = { ALL, FILTERS, defaults, normalize, tabs, moreGroups };
