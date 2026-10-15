const { options } = require('./commercial.js');
const ALL = '全部';
const all = [{ label: ALL, value: ALL }];
const strings = values => [...all, ...values.map(value => ({ label: value, value }))];
const FILTERS = [
  { key: 'businessScene', label: '场景', options: [...all, ...options.scenes] },
  { key: 'listingKind', label: '内容', options: [...all, ...options.kinds] },
  { key: 'district', label: '区域', options: strings(options.districts) },
  { key: 'opportunityType', label: '业务', options: [...all, { label: '招商', value: 'leasing' }, { label: '转让', value: 'transfer' }] },
  { key: 'projectType', label: '校园细类', options: strings(options.campusTypes) },
  { key: 'area', label: '面积', options: [...all, ...options.areas] },
  { key: 'rent', label: '月租', options: [...all, ...options.rents] },
  { key: 'business', label: '经营品类', options: strings(options.businesses) },
  { key: 'status', label: '状态', options: [...all, { label: '开放中', value: 'online' }, { label: '即将开放', value: 'coming' }, { label: '已满/已转', value: 'full' }] }
];
function defaults() { return Object.fromEntries(FILTERS.map(f => [f.key, ALL])); }
function normalize(filters) {
  const next = defaults();
  FILTERS.forEach(f => { if (f.options.some(o => o.value === filters[f.key])) next[f.key] = filters[f.key]; });
  if (next.businessScene !== 'campus') next.projectType = ALL;
  return next;
}
function tabs(filters) {
  return FILTERS.filter(f => f.key !== 'projectType' || filters.businessScene === 'campus').map(f => {
    const active = filters[f.key] !== ALL;
    return { key: f.key, label: active ? f.options.find(o => o.value === filters[f.key]).label : f.label, active };
  });
}
function moreGroups(filters) {
  return FILTERS.filter(f => ['opportunityType', 'business', 'status', 'projectType'].includes(f.key) && (f.key !== 'projectType' || filters.businessScene === 'campus'))
    .map(f => ({ ...f, selected: filters[f.key] }));
}
module.exports = { ALL, FILTERS, defaults, normalize, tabs, moreGroups };
