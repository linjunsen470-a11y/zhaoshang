# 项目文档索引

更新日期：2026-10-29。文档中的历史测试结果仅适用于对应版本，不代表当前环境已部署。

## 当前开发与运维入口

- [项目说明](../README.md)：结构、开发命令、配置和验证入口。
- [后台说明](../backend/README.md)：Payload、权限及数据库维护。
- [CMS 操作指南](payload-cms-quickstart.md)：日常运营操作。
- [腾讯文档同步操作说明](腾讯文档同步-demo操作说明.md)：连接、主源规则及演示流程。
- [同步修复与迁移记录](tencent-sync-fixes-2026-10-29.md)：当前代码变更、数据库连接失败及视图更新未完成的边界；上线前必读。
- [商业项目迁移与发布](商业项目接入-迁移与发布说明.md)、[运营录入](商业项目接入-运营录入说明.md)：已有商业数据升级和录入约定。
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

仅清理可再生构建缓存和确认无引用的文件。迁移脚本、测试源码、锁文件与历史验收记录不因日期旧而删除。`tests/unit/` 与根层微信端测试即使名称相近也分别保留。不要将 `.env`、同步凭证、上传素材或 `scratch/backups/` 纳入 Git。
