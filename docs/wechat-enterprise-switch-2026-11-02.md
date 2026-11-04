# 企业小程序切换与后续事项

日期：2026-11-02。目标 AppID：`wx4f94db3b93564c34`。用户确认这是重新注册的企业小程序，本次按新账号接入处理，不视为微信平台已完成旧账号主体迁移。企业认证、备案、类目及能力状态尚未登录新账号核验。

用户随后确认申请名称为「岭南旺铺」，已获名称预审通过。小程序展示名及默认导航栏标题已同步，首页/列表/详情分享文案与「关于」入口通过统一配置使用新名称；运营主体仍为广州锦奕咨询服务有限公司。官网首页仅增加筹备上线说明。名称预审不代表小程序已审核发布。

## 当前完成情况

| 项目 | 状态 |
| --- | --- |
| 根目录、`mp/` 两份 `project.config.json` | 已改为新 AppID，项目级合法域名校验保持开启 |
| 根目录、`backend/` 两份 `.env.example` | 已改为新 AppID，模板不含密钥 |
| 当前配置说明及发布清单 | 已更新；有日期的历史部署记录保留当时信息 |
| 根目录 `.env`、`backend/.env` | 检查时仍为旧 AppID 且配置了密钥；未修改，等待新账号密钥成对替换 |
| 腾讯云运行环境 | 本次尚未切换或重启，也未读取服务器实时环境；本机改动不代表服务器已切换 |
| 新账号后台、上传、体验版、审核、发布 | 待办理，不能由 AppID 推断完成 |

当前 develop 使用 `https://api.cqwushi.com/api`，Mock 与开发 OpenID 均关闭；trial/release 地址为空。`https://api.jinyifangchan.com/api` 仍为计划正式地址，需要完成域名、备案接入、DNS、HTTPS 和后端验证后才启用。不要只为通过检查而把测试地址填成正式地址。

**阶段性限制：客户端配置已切换，但服务端尚未切换，因此此时不能将新账号的登录、手机号授权或小程序码视为可用。** 公共项目浏览正常也不能证明这三项已接通。

## 微信公众平台办理顺序

1. 使用新账号登录 [微信公众平台](https://mp.weixin.qq.com/)，核对 AppID 和主体是否为广州锦奕咨询服务有限公司，完成微信认证。配置名称、头像、简介，并为实际负责人员添加开发者和体验成员权限；旧账号的权限不能当作新账号权限。
2. 按实际功能选择服务类目并提交平台要求的资质。当前功能包含商铺/场地展示与招商咨询、转让、设备供需和装修咨询；不要只根据企业名称选一个泛类目，具体以新账号的可选类目及审核要求为准。
3. 办理新小程序备案并核对所用服务域名。网站备案与小程序备案分别核实；取得实际小程序备案号后填入 `mp/config/index.js` 的 `MINIPROGRAM_ICP_NUMBER`。工信部说明已办网站备案的主体可复用部分主体信息，但仍需补充应用信息并履行备案流程。[工信部说明](https://www.miit.gov.cn/jgsj/xgj/hlwgl/art/2023/art_564bf0759d7e41d5b4aa8ce4996b9e84.html)
4. 取得新 AppSecret，安全写入服务端配置，不在聊天、前端、截图、Git 或日志中传递。先在根目录 `.env` 成对设置新 `WECHAT_APPID`、`WECHAT_APP_SECRET`；根文件不会自动同步 VPS。本地后端需要真实微信联调时，也要配套更新 `backend/.env` 并选择 `WECHAT_AUTH_MODE=wechat`。
5. 在新账号重新配置 request、uploadFile、downloadFile 合法域名。当前测试 API 使用的原点是 `https://api.cqwushi.com`，不带 `/api`；应先核实新账号下该域名的使用资格与备案要求。正式域名就绪后再添加正式原点，其他实际媒体域名逐一核对。本项目无须仅因调用 API 就配置 web-view 业务域名。[微信网络文档](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
6. 检查服务端调用微信接口的 IP 白名单要求，按服务器实际公网出口 IP 配置，不能把客户端请求域名与服务端出口 IP 混为一谈；不要直接假定入站 IP 等于出站 IP。
7. 在新账号配置《用户隐私保护指引》，如实说明 OpenID、称呼、手填或授权手机号、需求信息、用户选择上传的图片，以及启用腾讯文档协作时的处理方式；核对数据删除及联系方式。代码中的隐私页和表单勾选不能替代平台的指引配置与授权同步。[微信隐私指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)
8. 核对手机号快速验证能力。现有代码已有按钮及后端一次性 code 换号和 AppID 水印校验，无须因企业注册重写。微信当前文档要求非个人主体且完成认证；账号额度和收费另行核实。文档列示 1000 次共享体验额度、标准成功调用单价 0.03 元，实际以账号后台及届时规则为准；本次未购买资源包。手填手机号仍保留。[微信手机号文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html)

## 服务端切换方案

新密钥就绪后，在一次受控切换中处理以下事项，不需要数据库 schema 迁移或重建房源：

1. 核对 VPS `/opt/zhaoshang-test/.env`、实际运行容器、当前镜像及数据库状态；保护性备份环境配置及业务数据，备份按密钥文件管理。延续当前镜像，不因只换运行配置就触发 Gitee 同步或构建。
2. 成对设置新 AppID/AppSecret，保持 `WECHAT_AUTH_MODE=wechat`、`PAYLOAD_DB_PUSH=false`。根据已有开发版/体验版设置 `WECHAT_CODE_ENV_VERSION`，正式发布时才改为 `release`。此变量只决定生成的小程序码版本，不控制客户端 API 地址。
3. 同时生成新的独立随机 `MINIPROGRAM_TOKEN_SECRET`（至少 32 字符），不要替换 `PAYLOAD_SECRET`。现有 `backend/app/api/_shared/tokens.ts` 中的登录与私密媒体令牌没有 AppID 字段，单换 AppID 不会撤销旧令牌；换小程序专用密钥会使旧登录及私密图片链接失效，用户重新登录即可取得新令牌。保留 CMS 密钥可避免无关员工会话被迫失效。
4. 重新创建应用容器使环境变量生效，不能只执行 `docker compose restart`。在已核对 Compose 与环境文件后可执行 `sudo docker compose up -d --no-deps --force-recreate --wait payload`；如 sync 已运行，更新该服务以保持共享环境一致。不会运行 `down -v`、清空数据或执行 schema push。
5. 重建进程同时清除服务端 access_token、小程序码内存缓存。检查新 AppID 的服务端凭据可用、容器健康、公开查询和匿名权限，再使用新账号真实 `wx.login` code 验证登录；凭据可用或健康检查成功不等于真实登录已通过。全过程不打印密钥或 access_token。
6. 所有旧海报、二维码和已分享卡片均按旧入口处理，不能把服务器更换 AppID 当作旧链接自动跳转。上传新账号代码并具备对应版本后，从 CMS 分享素材重新生成二维码，在授权体验手机扫码验证后替换推广素材。

若凭据或权限验证失败，先定位新账号设置；必要时按备份恢复旧 AppID/AppSecret 和相关运行配置，并明确客户端也要匹配旧账号。令牌密钥回退会重新接受尚未过期的旧令牌，应纳入回退决定，不能盲目恢复。

## 用户与数据边界

- 现有房源、铺位、CMS 员工、媒体文件和腾讯文档配置可继续使用，切换 AppID 本身不要求清库。
- 咨询和私密附件目前分别按 `submitterOpenId`、归属 OpenID 校验。新账号应当按新身份重新登录，不能期待旧账号的咨询自动显示，也不能按手机号或姓名自动合并归属。
- 后端未建立跨 AppID 的用户映射；即使后续通过微信开放平台满足 UnionID 条件，也不会自动完成现有业务数据迁移。当前不引入旧字段适配、双 AppID 兼容或自动修复。若发现真实客户记录确需转移，应另行核实身份、备份并制定迁移方案；本次不删除已有记录。[微信 UnionID 说明](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/union-id.html)

## 验收与发布顺序

1. 重新打开微信开发者工具中的 `mp/` 项目，确认新 AppID、开发者权限和编译结果。当前 `mp/project.private.config.json` 的 `urlCheck=false` 会覆盖项目设置；新账号域名配置后，在工具中取消“不校验合法域名…”并复测。
2. 先做新账号开发版真实登录、手机号授权及拒绝授权后手填流程；新微信账号/清理过缓存的测试客户端应能正常使用。
3. 使用隔离测试数据验证两名用户的咨询、编辑/删除和附件归属，以及旧令牌失效；测试用户不能访问彼此的私密内容。
4. 明确体验版后端与数据库方案后填写 trial 地址，上传新账号代码、选择体验版本、添加体验成员。验证 iOS/Android 图片上传预览、隐私授权、咨询全流程、分享和扫码详情。
5. 完成备案、类目、隐私指引和真实内容检查后配置 release 地址及正式小程序码环境，运行 `pnpm launch:check`，提交微信审核并按结果处理，最后发布。

## 本次验证记录

- 两份项目 JSON 的新 AppID 与模板一致，项目级 `urlCheck=true`。
- `git diff --check` 通过。
- 只读公网检查：`https://api.cqwushi.com/api/projects?limit=1` 返回 200，匿名访问 `/api/leads` 返回 401。仅确认公开查询可用及咨询接口拒绝匿名访问，不代表新账号鉴权已接通。
- `node scripts/check-launch.mjs` 未通过：trial/release API 地址为空、小程序备案号为空、本机私有配置关闭域名校验、真实环境 AppID 仍与新客户端不一致、小程序码环境仍为 trial。该检查不验证 AppSecret 是否属于新账号，不能仅凭“密钥非空”认定可用。
- 未运行完整构建、数据库测试或微信原生 E2E；本次仅配置与文档变更。未更改真实环境密钥、数据库或线上服务，未上传/审核/发布小程序，未提交或推送 Git，也未操作 Gitee。

## 后续执行：服务端已切换

2026-11-02 17:19（Asia/Singapore）用户确认新 AppID/AppSecret 已成对写入根 `.env` 后，完成以下操作。本节取代上文初次检查时的待切换状态；平台与真机待办仍有效。

- 新凭据在本机及腾讯云应用容器内均通过微信 `stable_token` 接口验证，不记录 access_token 或密钥。
- 服务器原运行 AppID 确认为 `wx98ad42097b40a52d`，现已更新为 `wx4f94db3b93564c34`；同步更新新 AppSecret，并生成新的独立 `MINIPROGRAM_TOKEN_SECRET`，使旧登录和私密图片令牌失效。
- 切换前配置与数据库备份在 `/opt/zhaoshang-test/backups/wechat-enterprise-20261102T091925Z/`，目录权限 700，环境文件与数据库 dump 权限 600。数据库 dump 为 83071 字节，`pg_restore -l` 可读取归档；未执行完整恢复演练，也未做本次媒体卷备份。
- 已重建 payload、sync 容器，镜像保持 `300be11c8435889f8c60c9b97e02e8792b0d905d`。应用与数据库 healthy，sync running。保持 `WECHAT_AUTH_MODE=wechat`、`PAYLOAD_DB_PUSH=false`、小程序码环境 `trial`；没有改数据库结构或清理数据。
- 本机根 `.env` 同步新小程序令牌密钥，`backend/.env` 同步新 AppID/AppSecret；本地开发模式保持原配置。未重启本地后端。
- 当前发布静态检查剩余：trial/release API 地址、小程序备案号、本机私有配置的域名校验，以及正式发布时的小程序码 release 环境。
- 尚未使用真实微信登录 code、手机号授权 code 或新账号二维码验收；未上传代码、审核或发布小程序，也未操作 Gitee 或提交/推送 Git。

当前下一项依赖：公众平台认证、备案、合法域名、隐私指引及开发者权限就绪，然后进行新账号开发版与体验版真机验收。
