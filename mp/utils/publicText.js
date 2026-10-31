// Presentation-only cleanup; source records and customer-authored notes stay intact.
function projectText(value) {
  return String(value || '')
    .replace(/[【\[](?:纯)?(?:演示|示意|测试|内审|验收|联调|示例|样例|demo)(?:版|数据|房源|图)?[】\]]\s*/gi, '')
    .replace(/[（(](?:纯)?(?:演示|示意|测试|内审|验收|联调|demo)(?:版|用|数据|图)?[）)]/gi, '')
    .replace(/(?:样例房源[，,]?)?仅用于(?:联调|测试|内审|验收)[。；;]?/g, '')
    .replace(/仅用于界面体验[，,]不代表真实招商[。；;]?/g, '')
    .replace(/(?:演示资料|样例数据)[，,]?/g, '')
    .replace(/(^|[。；;])(?:纯)?(?:演示|测试|内审|验收|联调|demo)[：:]\s*/gi, '$1')
    .replace(/^(?:示例|样例)/, '')
    .replace(/(?:摄影示意|示意图|示意|演示|示例|样例|非项目实拍|非实拍)/g, '')
    .replace(/^[\s，,。；;·]+|[\s，,；;·]+$/g, '')
    .trim();
}

module.exports = { projectText };
