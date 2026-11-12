# 岭南旺铺小程序上线审计

2026-11-12 · 审计版本 `744f59f` · 企业 AppID `wx4f94db3b93564c34`

**建议暂缓提审。** 腾讯云实例内的 API、数据库和媒体已经实测可用。项目方确认正式域名仍在办理 ICP 备案，正式 API 子域名还需配置 HTTPS 入口。本次上传准备已为三个版本配置现用接口 `https://api.cqwushi.com/api`。该 AppID 的合法域名及真机访问仍待验收。审计发现的公开搜索及咨询关联问题已随本次后端修复部署。审计覆盖小程序 12 个页面及其直接调用的服务端逻辑。

## 11 月 12 日审计后修复（后端已部署）

项目方确认首批 4 套房源无法提供面积。小程序及其接口现将数字面积上下限都为空的房源计入每一个面积档，继续执行区域、月租、搜索、收藏范围与公开状态等条件。已知面积仍按区间交集匹配，例如固定 50㎡ 仅命中 50—100㎡。筛选面板已说明此规则。服务器原始数据可保持留空。

公开关键词搜索在计数与分页前以对客可见文字匹配，校园名及简称先脱敏。咨询创建只使用经过验证的 `projectId`，拒绝传入内部关系字段。同一表单重试复用提交编号，服务端按微信用户和编号建立唯一约束。个人历史与设备广场支持加载更多，「我的」显示本人咨询总数。另已修复首页列表范围、分享推荐条件、选图失败提示、本机联系方式清除入口、图片性质说明以及冒烟测试等待成功页的问题。本机预览设置见下方开发者工具复测记录。

**腾讯云部署。** 2026-11-12 14:36（北京时间），后端和同步服务已切换到实例本地镜像版本 `mp-882d540e7da0`。数据库备份位于实例的 `/opt/zhaoshang-test/backups/mp-before-882d540e7da0/`。从备份恢复到独立数据库，显式运行 `backend/scripts/push-schema.ts` 后与业务库迁移结果比对，两者结构一致。此次只新增可空列 `leads.submission_key` 和唯一索引 `leads_submission_key_idx`。迁移后有 22 套房源、5 条咨询、25 条媒体记录，日常运行的结构自动更新已关闭。

**云端面积复测。** 数据库中上架且面积上下限均为空的房源 ID 为 19、20、21、22。从实例回环地址和当前公网 HTTPS 接口逐项测试不限面积、50㎡以下、50—100㎡、100—200㎡、200㎡及以上。每项均返回 HTTP 200，`totalDocs=4`，返回的 ID 集合与数据库一致。[当前公网房源接口](https://api.cqwushi.com/api/projects?public=true&available=true&view=card)

**开发者工具复测。** 本机开启合法域名校验时，首页控制台返回 `request:fail url not in domain list`。已在本机项目私有配置关闭该项校验，用开发环境的 `https://api.cqwushi.com/api` 重新编译，首页精选和封面正常显示，找铺页显示“可咨询房源 4 套”。共享项目配置仍启用校验。`api.jinyifangchan.com` 已解析至同一实例，当前 HTTPS 握手失败。

**小程序发布待办。** 按项目方决定，三个版本均使用 `https://api.cqwushi.com/api`。ICP备案成功后，按下文为 `api.jinyifangchan.com` 配置 HTTPS 入口及微信合法域名，通过真机验收后切换小程序环境。CloudBase 服务角色已授权，本次未购买环境。

**验证。** 在独立的本机 PostgreSQL 16 上运行实际 Payload 路由，覆盖四档面积、数字边界、组合筛选、脱敏搜索及分页、咨询关联和并发重试。隔离数据库已关闭。该回归可在建好结构的隔离环境通过 `npm --prefix backend run test:release:db` 重跑。小程序模板和样式已通过微信编译器检查。

以下为云端原版本的审计记录。

## 腾讯云实例只读核验

2026-11-12 12:41（UTC+8），使用仓库登记的 SSH 账号及固定主机指纹进入腾讯云广州 CVM，核对了运行容器、数据库、挂载卷和回环 API。腾讯云实例元数据返回地域 `ap-guangzhou`、规格 `S5.LARGE4`。DNSPod 的两个权威名称服务器均返回 `jinyifangchan.com` 和 `api.jinyifangchan.com` 的 A 记录为该实例公网 IP `134.175.44.80`。域名解析已经到位，数据存放在该实例的 Docker 持久卷。[项目登记的主机](../deploy/gitee-deploy.sh#L15) · [腾讯云实例元数据说明](https://cloud.tencent.com/document/product/213/4934)

| 已核对项目 | 实测结果 |
| --- | --- |
| 应用与数据库 | 部署目录 `/opt/zhaoshang-test`，部署记录与运行镜像均为 `1c7c9b4`。Git 比对确认该版本与本地审计版本 `744f59f` 的 `mp/`、`backend/` 和 `docker-compose.yml` 内容相同。应用和 PostgreSQL 健康，同步服务运行中。应用仅绑定宿主机 `127.0.0.1:3300`，数据库没有宿主机端口映射。 |
| 业务数据 | 应用实际连接 Compose 服务 `db` 的 `zhaoshang_cloud_test` 库（PostgreSQL 16.14），数据卷为 `zhaoshang-test_postgres-data`。只读事务统计出 **22 套房源（4 套上架、18 套下架）、5 条咨询、0 条收藏**。4 套上架房源均有腾讯文档来源标识。咨询按数量核对，是否属于正式业务需由运营确认。 |
| 媒体 | 数据库有 **25 条媒体记录**，逐条对照挂载卷 `zhaoshang-test_media`，25 个关联原文件均存在且非空。实例内部公开 API 返回 4 套房源，4 张封面实际读取均为 HTTP 200 的 JPEG。设备广场当前返回 0 条。 |
| 微信与公网地址 | 运行容器使用企业 AppID `wx4f94db3b93564c34`、`WECHAT_AUTH_MODE=wechat`、`PAYLOAD_DB_PUSH=false`。媒体对外基址仍为 `https://api.cqwushi.com`，生成房源小程序码的环境仍为 `trial`。 |
| 同步与备份 | 腾讯文档房源导入和咨询导出均已启用。核验时最近一次同步在 12:31 完成，4 条房源、5 条咨询均无变更，错误 0。每日备份服务在 03:01 正常退出，定时器启用。当天的备份未做恢复演练。上一次有记录的隔离恢复见 [11 月 5 日验收](prelaunch-fixes-2026-11-05.md)。 |

**正式 API 子域名仍需配置 HTTPS。** 本机之前的公网请求在取得 HTTP 响应前中断。服务器启用的 Nginx 虚拟主机和 HAProxy 域名规则都列有当前开发 API 和主域名，未见 `api.jinyifangchan.com` 的显式路由。已安装的 Let's Encrypt 证书也没有覆盖该子域名。备案进度由项目方提供，公网失败的具体拦截环节未作归因。首次备案或新增服务按腾讯云备案订单及接入要求开放访问。[腾讯云备案与阻断说明](https://cloud.tencent.com/document/faq/243/20220)

### 备案期间通过腾讯云核对数据库

11 月 12 日 13:13（UTC+8），用根目录 `.env` 指定的 Linux 账号和密码通过 SSH 登录，校验仓库固定的主机公钥。腾讯云实例元数据接口返回实例 `ins-3fkrqz52`、广州六区 `ap-guangzhou-6` 和公网 IP `134.175.44.80`。数据库事务返回 `read_only=on`。4 套上架房源的封面均关联到媒体记录，使用咨询附件作封面的为 0 套。5 条咨询有 4 条关联房源，这 4 条关系均能找到对应房源。[腾讯云实例元数据说明](https://cloud.tencent.com/document/product/213/4934) · [本次实测的只读脚本](../deploy/tencent-test/inspect-miniprogram-db.sh)

**现有房源的面积筛选会显示空列表。** 小程序公开接口不加面积条件返回 4 套房源；分别选择“50㎡以下”“50—100㎡”“100—200㎡”“200㎡及以上”，实例内的接口均返回 HTTP 200、0 套。库内 4 套上架房源均缺少有效数字面积范围，2 套有有效数字月租范围，4 套都有费用说明。项目方随后确认首批房源无法提供面积，已在本地按上节所述调整筛选规则。[小程序筛选选项](../mp/config/commercial.js#L282) · [服务端筛选条件](../backend/lib/commercial.ts#L98)

腾讯云自动化助手（TAT）的管理接口为 `tat.tencentcloudapi.com`，地域填 `ap-guangzhou`，版本填 `2020-10-28`。它通过实例内的 Agent 执行查询，业务域名和公网数据库端口均不参与。实例内已确认 `tat_agent.service` 运行。API Explorer 使用已登录的腾讯云账号调用，服务器 SSH 密码用于 Linux 登录。也可在 CVM 控制台打开该实例的 OrcaTerm 终端运行同一份脚本。[腾讯云 API Explorer](https://console.cloud.tencent.com/api/explorer?Action=DescribeAutomationAgentStatus&Product=tat&Version=2020-10-28) · [OrcaTerm 登录说明](https://cloud.tencent.com/document/product/1665/97739)

本次在已登录的 API Explorer 中按广州地域和上述实例 ID 发起了状态查询，控制台要求绑定微信扫码进行二次身份验证。项目方选择采用已取得的数据库结果，本次云端查询止于验证页。上述数据库数字来自已验证主机公钥的 SSH 会话。

| 接口 | 本项目的参数与核对内容 |
| --- | --- |
| `DescribeAutomationAgentStatus` | `InstanceIds` 只填 `["ins-3fkrqz52"]`。检查返回实例的 `AgentStatus` 是否为 `Online`，并核对最近心跳时间。[查询客户端状态](https://cloud.tencent.com/document/product/1340/52682) |
| `RunCommand` | 对同一实例一次性执行下方脚本的 Base64 内容。参数用 `Username=ubuntu`、`CommandType=SHELL`、`WorkingDirectory=/opt/zhaoshang-test`、`Timeout=30`、`SaveCommand=false`。保留返回的 `InvocationId`。[执行命令](https://cloud.tencent.com/document/product/1340/52676) |
| `DescribeInvocationTasks` | 以 `invocation-id` 过滤本次 `InvocationId`，设 `HideOutput=false`。核对返回的实例 ID、`TaskStatus=SUCCESS` 和 `TaskResult.ExitCode=0`，将 `TaskResult.Output` 按 Base64 解码即可看到数据库汇总。[查询执行任务](https://cloud.tencent.com/document/product/1340/52680) |

在项目根目录运行以下 PowerShell 命令即可取得 `RunCommand.Content`。内容仅限这份固定查询脚本。

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path 'deploy/tencent-test/inspect-miniprogram-db.sh').Path))
```

## 发布配置

| 项目 | 本轮证据 | 处理与验收 |
| --- | --- | --- |
| 体验版、正式版 API | 两个 `apiUrl` 均为空。分别模拟微信返回 `trial` 和 `release`，都得到配置错误。首页、找铺、咨询、收藏和图片上传依赖这些地址。[环境表](../mp/config/environments.js#L7) · [请求入口](../mp/services/api.js#L149) | 填写各自准备好的 HTTPS API 地址，保留路径 `/api`。确认公开列表、详情、图片与认证接口属于相应环境。 |
| 域名及开发者工具 | 开发版 `api.cqwushi.com` 的公开列表、4 个详情和 4 张封面 GET 均返回 200。正式子域名的 DNS、代理与证书核验见上节。本机私有配置覆盖项目设置，关闭了域名校验。[私有设置](../mp/project.private.config.json#L5) | 在企业小程序后台核对 request、uploadFile 和实际媒体使用的合法域名，域名栏填 HTTPS 源站。恢复工具校验，并在关闭手机调试的体验版验证。[微信网络说明](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html) |
| 小程序备案 | 客户端备案号为空，“我的”会隐藏这一行，仓库发布检查报错。微信说明备案号会在成功上线后的“更多资料”自动展示。实际备案审批状态须查企业账号。[项目设置](../mp/config/index.js#L62) · [微信备案指引](https://developers.weixin.qq.com/miniprogram/product/record/record_guidelines.html) · [工信部通知](https://www.miit.gov.cn/zwgk/zcwj/wjfb/tz/art/2023/art_920db564162e4312916a01bed6540ad8.html) | 核对本小程序的备案结果，并用核发的真实编号补齐项目展示和发布检查。 |
| 房源分享码 | 本机发布检查及云端运行容器均显示 `WECHAT_CODE_ENV_VERSION=trial`。服务端生成房源小程序码使用这个值。[生成代码](../backend/app/api/admin/wechat-code/route.ts#L45) · [部署默认值](../docker-compose.yml#L13) | 体验阶段可保持 `trial`。正式分发前切到 `release`，重新生成并用普通微信账号扫码核对房源。 |

本机 `node scripts/check-launch.mjs` 共报五项，分别为两个环境地址、备案号、本机域名校验和分享码环境。

## 提审前建议修复

| 优先级 | 影响与证据 | 修复验收 |
| --- | --- | --- |
| P1 · 公开搜索能关联后台学校名称 | 校名字段标明“仅后台”。公开项目查询仍对真实校名、简称及原始标题、地址等字段做匹配，之后才对返回内容脱敏。房源命中与数量能暴露其与某学校的关联。[学校字段](../backend/collections/Projects.ts#L185) · [搜索条件](../backend/lib/commercial.ts#L90) · [结果映射](../backend/app/api/projects/route.ts#L39) | 公开检索限定在允许展示的文本上，并在分页和计数前生效。用隔离样例验证仅在后台字段出现的词不能命中，公开的区域和业态仍可检索。 |
| P1 · 咨询校验和保存的房源可能不同 | 创建路径对房源编号的取值不一致。输入有冲突时，检查通过的房源与最终写入的房源可能不同，导致咨询关联草稿、下架或满租房源，关联标题还可能出现在用户自己的咨询记录。此项来自代码审阅。[可咨询检查](../backend/app/api/leads/route.ts#L110) · [持久化字段](../backend/app/api/_shared/leadPolicy.ts#L59) · [历史标题](../backend/app/api/_shared/payloadApi.ts#L257) | 按当前小程序合同统一读取 `projectId`，用同一个规范化编号完成可见性检查和写入，拒绝冲突输入。隔离回归覆盖可咨询、不可咨询和无关联房源三种正常路径。 |

## 影响用户的其他问题

| 发现 | 处理建议 |
| --- | --- |
| 首页“精选房源 → 查看全部”仅切换标签。若先进入过收藏、最近浏览或筛选结果，返回首页后点击此入口会保留旧范围，可能显示空收藏。页面模拟已确认收藏范围会保留。[首页入口](../mp/pages/index/index.wxml#L83) · [找铺页恢复](../mp/pages/list/list.js#L29) | 从该入口显式清空列表范围。分享推荐列表时也应携带推荐条件，目前只序列化普通筛选和关键词。[分享路径](../mp/pages/list/list.js#L221) |
| 选图接口把全部失败都当成“没有选图”。相册权限被拒时，页面无提示，用户不知道如何继续。[选图](../mp/services/upload.js#L27) | 用户主动取消时保持安静，权限或系统错误显示原因并允许重试。 |
| 用户授权或提交后，完整手机号和称呼会保存在本机并在后续表单预填。“我的”拒绝保存空号。删除咨询也会保留这份本机资料，隐私页的存储说明未列出联系方式。[表单缓存](../mp/utils/formBehavior.js#L196) · [个人页](../mp/pages/my/my.js#L96) · [政策](../mp/pages/privacy/privacy.wxml#L16) | 明示保存位置与用途，提供清除本机联系方式的入口。核对公众平台隐私指引中的手机号、选取媒体和剪贴板写入用途。项目复制顾问电话和设备信息时会写剪贴板。[微信隐私接口清单](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/miniprogram-intro.html) |
| 用户新建咨询后，若服务端已保存但手机没有收到响应，表单会重新开放提交。服务端对重试直接创建，可能出现两条咨询。[表单处理](../mp/pages/apply/apply.js#L77) · [创建](../backend/app/api/leads/route.ts#L115) | 每次新建咨询分配一次提交标识，相同用户重试同一次提交时返回原记录。在隔离环境验证弱网重试。 |
| 个人咨询历史和设备广场一次最多取 100 条。超过后，用户找不到更早的咨询进行编辑或删除，“我的”计数也停在 100。[咨询](../backend/app/api/leads/route.ts#L55) · [设备](../backend/app/api/equipments/route.ts#L42) · [计数](../mp/pages/my/my.js#L33) | 增加接口及页面分页，并从服务端总数显示咨询数量。 |
| 对客房源文案会删除“非项目实拍”“示意图”等具有业务含义的说明。当前开发接口的 4 条公开记录在抽查字段中未命中这些标志，图片授权及是否实拍仍须运营核实。[文本处理](../mp/utils/publicText.js#L7) · [房源装饰](../mp/utils/commercial.js#L65) · [现有测试](../tests/unit/mp-ux-refresh.test.mjs#L58) | 将演示记录移出公开范围，保留真实房源的图片性质说明。上传包内的本地演示种子还有具名学校和样例租金，正式包如需去除这些样例，应从打包源中移出。[种子数据](../mp/services/api.js#L8) |

## 已验证与待验收

- **本地运行。** 小程序及共用业务单测 76 项、直接相关后端单测 31 项全部通过。覆盖表单校验、登录刷新、收藏同步、上传重试、咨询字段过滤、令牌和附件清理等。另对 31 个 JS、16 个 JSON 做语法检查，微信官方编译器编译了全部 15 个 WXML 和 14 个 WXSS。仓库脚本默认指向旧版工具的编译器目录，本次显式指定本机已安装版本的目录后通过。
- **上传范围。** 核对了 12 个页面的 48 个页面文件、本地图片与静态导入目标。`mp/` 原始目录共 99 个文件、374,780 字节，最终上传包大小以开发者工具显示为准。未在该目录发现环境文件、常见私钥文件或检查所覆盖的服务端密钥赋值。
- **公开接口。** 开发版公网返回 4 条公开房源，4 个详情均正常，4 张封面实际 GET 均返回 JPEG。随后在腾讯云实例内独立复核了公开列表和图片。本轮只读核验，未在业务库创建、编辑或删除咨询。
- **真机和隔离测试。** 双账号真实 HTTP 合约测试因未配置隔离环境而跳过 1 项。未验收真实微信登录、手机号授权、iOS/Android 的权限与上传、跨账号隔离、跨设备收藏或正式房源码。现有开发者工具冒烟脚本还会等待成功后的旧表单恢复可提交状态，而当前实现会锁定并跳到成功页，可能误报超时并遗留测试咨询。改为等待成功记录、按唯一标识清理，再用于隔离验收。[冒烟脚本](../tests/mp.test.mjs#L43) · [成功行为](../mp/utils/formBehavior.js#L41)

## 审计时拟定的发布顺序

当前先上传 `mp/` 并使用现用域名做体验版验收。以下保留审计时规划的新域名切换步骤。当前操作以[小程序发布清单](miniprogram-launch-checklist.md)为准。

1. **备案期间继续内部验收。** 在隔离环境修复并回归上面两项 P1。现在的开发入口和实际业务库相连，且咨询会同步至腾讯文档。需要提交、编辑、删除的测试使用隔离库和媒体卷，并在测试环境停用面向运营文档的同步。若要沿用现有 HTTPS 域名做体验版联调，先核实本项目使用资格、备案接入和该企业 AppID 的合法域名配置，并确认请求落到预期测试环境。
2. **备案及接入完成后开通正式 API。** 保留当前数据库、媒体卷和运行实例。DNS 已指向目标主机，届时复核解析，为 `api.jinyifangchan.com` 配置覆盖该名称的有效证书、HAProxy SNI 规则及 Nginx 虚拟主机，转发到当前应用。服务端设置 `PAYLOAD_PUBLIC_SERVER_URL=https://api.jinyifangchan.com`，小程序正式版设置 `apiUrl=https://api.jinyifangchan.com/api`。同步更新部署后的公网验收目标，现有脚本仍固定检查开发域名。用新域名复核列表、详情、上传及实际返回的媒体链接。[媒体地址构造](../backend/app/api/_shared/payloadApi.ts#L63) · [部署检查目标](../deploy/gitee-deploy.sh#L25)
3. **上传体验版。** 用企业账号在微信开发者工具导入 `mp/`，核对 AppID、开启域名校验，在公众平台配置实际使用的合法域名，核对小程序本身的备案、类目及隐私指引。上传为开发版本后设为体验版。[项目配置](../mp/project.config.json) · [微信发布流程](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)
4. 用 iOS、Android 和两名测试用户验收。覆盖首页到详情、手机号授权及拒绝后手填、相册/拍照上传及预览、咨询提交与本人编辑删除、另一账户看不到私有记录、收藏跨设备同步、分享进入正确的房源。可改写数据的测试使用隔离数据。
5. 重新运行发布检查，核对最终正式配置，确认体验结果后提交审核。审核通过后在公众平台发布，切换分享码环境并验证正式房源小程序码。独立的 `website/` 和 `website-v2/` 均无需上传。
