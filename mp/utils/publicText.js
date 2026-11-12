// Presentation-only cleanup; source records and customer-authored notes stay intact.
function projectText(value) {
  return String(value || '')
    .replace(/[【\[](?:纯)?(?:演示|测试|内审|验收|联调|示例|样例|demo)(?:版|数据|房源)?[】\]]\s*/gi, '')
    .replace(/[（(](?:纯)?(?:演示|测试|内审|验收|联调|demo)(?:版|用|数据)?[）)]/gi, '')
    .replace(/(?:样例房源[，,]?)?仅用于(?:联调|测试|内审|验收)[。；;]?/g, '')
    .replace(/(?:演示资料|样例数据)[，,]?/g, '')
    .replace(/(^|[。；;])(?:纯)?(?:演示|测试|内审|验收|联调|demo)[：:]\s*/gi, '$1')
    .replace(/^(?:示例|样例|演示)(?!图|照片|画面)/, '')
    .replace(/^[\s，,。；;·]+|[\s，,；;·]+$/g, '')
    .trim();
}

module.exports = { projectText };
