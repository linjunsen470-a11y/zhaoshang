# Demo 预上线简要审计

日期：2026-10-16。范围：当前工作区的小程序、Next/Payload 后端、Mock 工具、部署配置与文档；包含此前未提交的商业场景、界面和安全修复。

## 结论

本地 demo 的代码构建与现有离线规则检查通过，可进入人工演示验收。正式体验版/生产发布仍有 9 项配置缺项，真实 HTTP、容器和真机流程本轮未复验，因此不作正式上线通过结论。

## 本轮修复与精简

| 项目 | 处理 |
| --- | --- |
| 生产构建阻塞 | 修复 `publicSchool.ts` 的弱类型参数与泛型写入错误；保留学校名称脱敏，增加嵌套文案与原始数据不变的回归测试 |
| 重复 ID 转换 | `leadPolicy` 与 `payloadApi` 共用 `relationIds.ts`，保持附件 ID 校验与创建/更新清洗规则 |
| 无调用兼容代码 | 删除 `sanitizeLeadInput`、闲置 `AuthContext`，移除同模块不必要的动态导入 |
| 重复权限判断 | admin/editor 的角色判定集中到 `isStaffUser`，保留项目/咨询权限入口 |
| 测试工具资源清理 | 超时竞速在结束时释放计时器；截图脚本复用共用超时工具 |
| 文档漂移 | 修正默认启动命令、后台首页、测试现状、外部数据库配置；删除不存在的 Compose 服务用法，精简发布清单并标记历史审计 |

## 审计关注点

检查了咨询创建/编辑清洗、附件来源与归属、原始快照保留、公开房源/父项目过滤，以及管理接口与小程序 Token 的权限隔离。相关单元测试覆盖输入边界、401 刷新、Token 签名/用途、Mock CRUD 隔离和筛选行为；本轮没有用静态审查替代真实 HTTP 权限验收。

保留现有小程序公共模板、商业字典生成来源及独立测试工具。迁移与历史记录仍用于旧库升级，不按“未被运行时导入”删除。没有执行业务数据库迁移或写入业务数据。

## 实际验证

| 检查 | 结果与限制 |
| --- | --- |
| `pnpm backend:lint` | 通过 |
| `pnpm backend:build` | 通过，包含 TypeScript 检查及 14 个静态页面生成；初次发现的类型错误已修复 |
| `pnpm test:ci` | 39 项通过：客户端 23 + 后端 16；另有 1 项真实 HTTP 契约因未启用隔离环境而跳过 |
| `pnpm --dir backend test:cms` | 2 项通过；合计 41 项单元/规则测试通过 |
| `node scripts/mp-check-templates.mjs` | 全部 WXML/WXSS 编译通过，使用本机微信编译器 |
| `node scripts/mp-design-preview.mjs` | 12 页本地演示数据与源码预览生成通过；本轮未进行浏览器视觉签收 |
| 超时工具探针 | 已完成的 Promise 立即返回，进程正常退出 |
| `pnpm --dir backend audit --prod` | 扫描当时未发现已知漏洞；不表示完整安全保证或开发依赖扫描通过 |
| `pnpm launch:check` | 返回非零退出码并列出 9 项配置缺项；检查不输出密钥 |
| 源码与附件体积 | `mp/` 原始文件总计约 737 KiB，实际微信打包体积仍以开发者工具为准 |
| 密钥/产物 | 已检查明显私钥/访问令牌模式及提交文件清单；本地环境文件、构建结果和截图目录保持忽略 |

本轮未运行真实 HTTP/数据库集成、DevTools 页面操作、真机或 Docker：检查时 3000/3100/9420 等测试端口无监听，Docker Desktop 引擎不可用。历史执行结果见 [2026-10-12 审计](prelaunch-audit-2026-10-12.md) 与 [2026-10-15 界面验收](miniprogram-interface-acceptance-2026-10-15.md)，不可视为本轮通过。

## 发布前剩余事项

`launch:check` 的缺项为：trial/release HTTPS API 地址、真实顾问电话、独立随机 `MINIPROGRAM_TOKEN_SECRET`、`WECHAT_AUTH_MODE=wechat`、真实 AppSecret、匹配的小程序 AppID、正式版小程序码环境，以及真实 HTTPS 后端地址。

补齐后按 [发布检查清单](miniprogram-launch-checklist.md) 完成真实微信登录、双账号隔离、公众平台合法域名、iOS/Android 图片与表单流程、真实小程序码，以及数据库/media 备份恢复验收。历史 Mock 连续导航超时仍需手工复核。

## Git 整理

采用 `main` 与 `codex/demo-prelaunch` 两个分支。当前开发历史已包含旧 CMS、后台路由和小程序分支的提交；整理时使用快进合并，确认提交已进入主干且远程推送成功后再删除旧分支引用，不重写历史。
