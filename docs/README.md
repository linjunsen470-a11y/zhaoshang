# 项目文档索引

更新日期：2026-10-30。文档中的历史测试结果仅适用于对应版本，不代表当前环境已部署。

## 当前开发与运维入口

- [项目说明](../README.md)：结构、开发命令、配置和验证入口。
- [后台说明](../backend/README.md)：Payload、权限及数据库维护。
- [CMS 操作指南](payload-cms-quickstart.md)：日常运营操作。
- [腾讯文档同步操作说明](腾讯文档同步-demo操作说明.md)：连接、主源规则及演示流程。
- [同步修复记录](tencent-sync-fixes-2026-10-29.md)：代码变更、数据库连接失败及视图更新未完成的边界；运行前必读。
- [数据库初始化](schema-setup.md)、[运营录入](商业项目接入-运营录入说明.md)：当前数据结构与录入约定。
- [自动化测试](miniprogram-automation-test.md)、[上线清单](miniprogram-launch-checklist.md)：测试环境与上线验收。
- [静态公司网站](../website/README.md)：独立托管目录，不属于 Next/Payload 构建。

## 近期变更与待办记录

- [小程序体验跟进（10-28）](miniprogram-ux-followup-2026-10-28.md)
- [容量评估（10-29）](scalability-review-2026-10-29.md)
- [首页与找铺分组（10-25）](首页与找铺分组改版-2026-10-25.md)
- [视觉与交互调整（10-25）](小程序视觉与交互优化-2026-10-25.md)
- [前端业务范围（10-25）](前端业务范围与体验调整-2026-10-25.md)
- [微信联系方式授权](wechat-contact-authorization.md)

## 历史与设计材料

`code_audit_report.md`、`prelaunch-audit-2026-10-12.md`、`demo-prelaunch-audit-2026-10-16.md`、`miniprogram-interface-acceptance-2026-10-15.md`、`商业项目接入-验收记录.md` 为历史验收，不作为当前上线结论。

PRD、UX audit、`frontend-visual-refresh.md`、商业业态可行性报告、腾讯协同架构建议保留作为设计背景。与当前实现冲突时，应核对代码、最新修复记录及实际环境；不能直接按历史文档执行迁移。

## 清理约定

仅清理可再生构建缓存和确认无引用的文件。旧版本转换脚本和相关说明已移除；仅维护当前数据格式。`tests/unit/` 与根层微信端测试即使名称相近也分别保留。不要将 `.env`、同步凭证、上传素材或 `scratch/backups/` 纳入 Git。
