# 数据库初始化与结构维护

项目尚未上线，只维护当前 Schema 与客户端契约，不提供历史版本升级脚本或旧字段转换。

1. 准备独立 PostgreSQL 数据库，在 `backend/.env` 配置 `DATABASE_URI`。
2. 若目标数据库已有数据，先备份并确认目标；不要自动删除或重建现有库。
3. 执行 `pnpm --dir backend schema:push`，检查结构变更。需要演示数据时执行 `pnpm backend:seed`。
4. 日常启动和构建保持 `PAYLOAD_DB_PUSH=false`。

房源必须明确选择场景；腾讯来源必须填写“场景”“场所名称”“校区/位置”，不再从旧字段或商铺类型推断。房源列表 API 固定返回 `{ docs, page, totalDocs, totalPages, hasNextPage }`，不再返回旧数组格式。清理本机演示 Storage 后可由当前代码重新生成演示数据。

本次代码清理不会自动修改本机数据库、腾讯文档或微信 Storage。旧测试数据若缺少必填字段，应按当前格式重新准备。
