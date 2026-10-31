# 微信小程序自动化测试

## 测试分层

本仓库采用三层测试，避免把全部验证压在依赖 GUI 的慢速 E2E 上。

| 层级 | 命令 | 默认运行位置 | 用途 |
| --- | --- | --- | --- |
| 客户端单元测试 | `pnpm test:unit` | 本地、PR CI | 表单、路由、项目公开状态、附件、local mock CRUD、401 刷新 |
| 后端规则/API 测试 | `pnpm test:api` | 本地、PR CI | 线索清洗与边界校验；配置隔离环境后执行真实 HTTP 合约 |
| 微信 DevTools E2E | `pnpm test:mp:smoke` / `pnpm test:mp:full` | 开发机、专用 Windows runner | 真实页面事件、路由、渲染和关键用户旅程 |

`pnpm test:ci` 是普通 PR 闸门，不要求安装微信开发者工具。

需要 JUnit 报告时可运行 `pnpm test:mp:smoke:junit` 或 `pnpm test:mp:full:junit`；命令会自动创建 `test-results/mp-e2e/`，该目录清空后也可正常生成报告。

## 快速测试

```powershell
pnpm test:unit
pnpm test:api
```

HTTP API 集成测试默认跳过，防止误写日常数据库。只有准备了独立测试后端后才显式启用：

```powershell
$env:MP_API_TEST_CONFIRM_ISOLATED='true'
$env:MP_API_TEST_URL='http://127.0.0.1:3100/api'
$env:MP_API_TEST_TOKEN_A='<test-user-a-token>'
$env:MP_API_TEST_TOKEN_B='<test-user-b-token>'
$env:MP_API_TEST_PROJECT_ID='<optional-public-project-id>'
pnpm test:api:integration
```

测试以唯一 `runId` 创建数据，并在 `after` 中按精确 ID 删除。不得把
`MP_API_TEST_CONFIRM_ISOLATED=true` 指向开发、预发布或生产数据库。

## DevTools E2E

E2E 会先检查 `${MP_E2E_API_URL}/projects?public=true`，然后启动 DevTools 或连接已经开启的自动化端口。测试不会修改 `mp/config/environments.js`，而是在 develop 自动化会话中覆盖 `app.globalData`。

自动启动：

```powershell
$env:MP_E2E_CLI_PATH='D:\Program Files (x86)\Tencent\wechat-dev\cli.bat'
$env:MP_E2E_API_URL='http://127.0.0.1:3000/api'
pnpm test:mp:smoke
```

连接已经打开的 DevTools：

```powershell
$env:MP_E2E_MODE='connect'
$env:MP_E2E_WS_ENDPOINT='ws://127.0.0.1:9420'
pnpm test:mp:full
```

可配置项：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MP_E2E_MODE` | 自动判断 | `launch` 或 `connect` |
| `MP_E2E_CLI_PATH` | 常见安装路径 | DevTools `cli.bat` |
| `MP_E2E_PROJECT_PATH` | `mp/` | 小程序项目目录 |
| `MP_E2E_WS_ENDPOINT` | `ws://127.0.0.1:9420` | connect 模式地址 |
| `MP_E2E_PORT` | `9420` | launch 模式端口 |
| `MP_E2E_API_URL` | `http://127.0.0.1:3000/api` | 独立测试后端 API |
| `MP_E2E_ARTIFACT_DIR` | `test-results/mp-e2e` | 失败截图目录 |

## 覆盖与隔离规则

- Smoke 通过真实点击覆盖：首页项目卡片、详情咨询按钮、表单负向校验、隐私同意、创建、成功页、按 ID 编辑、删除取消和删除确认。
- Full 在 Smoke 基础上覆盖搜索、收藏和转让/设备/装修入口。
- 后端规则及 HTTP 层覆盖六种 lead type、CRM 字段拒绝、所有权、无效输入、404 和附件拒绝。
- E2E 从成功页 query 获取本次创建的 `leadId`，后续查改删都按该 ID 定位，不依赖列表顺序或标题唯一性。
- 所有 wx mock、测试线索和 DevTools 连接都在 `finally`/测试钩子中恢复；失败时保存现场截图，CI 同时归档 JUnit 与包含 SDK 版本、耗时、异常的 `runtime.json`。
- E2E 使用 WXML 中稳定的 `data-test` 与 `e2e-*` 类；不要在测试中使用 `nth-child` 或依赖展示文案定位。

## CI

- `.github/workflows/tests.yml` 在 PR 和 main push 上运行快速层。
- `.github/workflows/mp-e2e.yml` 使用带 `Windows`、`wechat-devtools` 标签的 self-hosted runner，工作日定时运行 full，也支持手动选择 smoke/full。
- Runner 必须预装固定版本的微信开发者工具并配置 `MP_E2E_CLI_PATH`、`MP_E2E_API_URL` repository variables。
- DevTools 或基础库升级先在 runner 上连续运行 full 10 次；无失败、无数据残留后再更新固定版本。

## 2026-10-31 清理后本机复验

在微信开发者工具 Stable 2.01.2510290 中连接本地演示后台：找铺页显示 11 条可咨询房源，详情页展示了图片、面积和租金，咨询表单带入了对应房源。使用独立的开发测试身份提交一条演示咨询后，已核对后台记录与咨询历史，并删除该记录、恢复原有本地状态。

本次用模拟号码填写表单，未验证微信真实手机号授权或真机环境。开发者工具提示本地 HTTP 图片地址应升级为 HTTPS；上线时需使用实际 HTTPS 图片地址。工具初始化期间另出现一条基础库 `timeout` 日志，未定位到具体请求，本次上述流程未被阻断。
