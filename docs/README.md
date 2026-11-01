# 项目文档索引

更新日期：2026-11-01。文档中的历史测试结果仅适用于对应版本，不代表当前环境已部署。

## 当前开发与运维入口

- [环境变量与仓库维护](configuration.md)：配置分工、密钥更新和免构建提交。
- [持续部署与回退](ci-deployment.md)：GitHub 手动检查、用户手动同步 Gitee、CCR 构建部署、备份与回退。
- [员工后台调整](cms-employee-refresh-2026-10-31.md)：中文登录、账号权限、日期筛选及腾讯文档连接。

- [项目说明](../README.md)：结构、开发命令、配置和验证入口。
- [后台说明](../backend/README.md)：Payload、权限及数据库维护。
- [CMS 操作指南](payload-cms-quickstart.md)：日常运营操作。
- [腾讯文档同步操作说明](腾讯文档同步-demo操作说明.md)：连接、主源规则及演示流程。
- [同步修复记录](tencent-sync-fixes-2026-10-29.md)：历史修复背景；云端结果见 [同步验证记录](tencent-sync-verification-2026-11-01.md)。
- [数据库初始化](schema-setup.md)、[运营录入](商业项目接入-运营录入说明.md)：当前数据结构与录入约定。
- [自动化测试](miniprogram-automation-test.md)、[上线清单](miniprogram-launch-checklist.md)：测试环境与上线验收。
- [咨询表单说明](小程序咨询表单精简方案.md)：各类咨询首次提交的字段及后台处理。
- [企业备案与小程序上线准备](企业备案与小程序上线准备.md)：主体信息、网站和小程序备案、计划域名及部署步骤。
- [腾讯云测试部署记录](tencent-cloud-test-deployment-2026-10-31.md)：初次迁移记录；当前 HTTPS 和 CI 部署步骤以持续部署说明为准；[操作说明](../deploy/tencent-test/README.md)。
- [静态公司网站](../website/README.md)：独立托管目录，不属于 Next/Payload 构建；[官网部署与同步](../deploy/website/README.md)。

## 近期变更与待办记录

- [小程序体验跟进（10-28）](miniprogram-ux-followup-2026-10-28.md)
- [容量评估（10-29）](scalability-review-2026-10-29.md)
- [首页与找铺分组（10-25）](首页与找铺分组改版-2026-10-25.md)
- [视觉与交互调整（10-25）](小程序视觉与交互优化-2026-10-25.md)
- [前端业务范围（10-25）](前端业务范围与体验调整-2026-10-25.md)
- [联系方式与微信授权](wechat-contact-authorization.md)

## 历史与设计材料

`code_audit_report.md`、`prelaunch-audit-2026-10-12.md`、`demo-prelaunch-audit-2026-10-16.md`、`miniprogram-interface-acceptance-2026-10-15.md`、`商业项目接入-验收记录.md` 为历史验收，不作为当前上线结论。

PRD、UX audit、`frontend-visual-refresh.md`、商业业态可行性报告、腾讯协同架构建议保留作为设计背景。与当前实现冲突时，应核对代码、最新修复记录及实际环境；不能直接按历史文档执行迁移。

## 清理约定

演示阶段清理不再需要的本地备份及可重生成的编译产物；测试工具可按需重新生成结果。旧版本转换脚本和相关说明已移除；仅维护当前数据格式。`tests/unit/` 与根层微信端测试即使名称相近也分别保留。不要将 `.env`、同步凭证、上传素材或本机临时文件纳入 Git。

Gitee 第 10 次流水线的完整部署结果已写入持续部署说明；临时 API 响应、失败日志、凭证页面截图、下载工具和一次性发布/检查脚本可清理。保留已分享的成功截图及仍在使用的本机配置。分支仅在确认提交已合入后清理。
