# 项目最新进度

## 当前状态

项目已经达到“初步可用”状态。

当前线上可用主链路：

1. 浏览知识卡
2. 查看详情
3. 完成今日学习
4. 收藏
5. 标记复习
6. 查看学习进度统计

## 当前真实运行模式

当前是混合模式，不是纯本地，也不是纯数据库：

- 卡片内容：`data/cards.json`
- 卡片图片：`public/generated-cards/*`
- 学习状态：Supabase `study_records`
- 内容桥接：Supabase `knowledge_cards`

桥接逻辑已经处理以下问题：

- Vercel 只读文件系统导致本地写入失败
- 本地卡片 `id` 是文本 slug，但学习状态表要求 UUID

当前实现会按 `card_date` 自动把本地卡片映射到 `knowledge_cards` 中的 UUID 记录，再写入 `study_records`。

## 最近完成

### 1. 修复线上打卡写本地文件报错

已修复 `EROFS: read-only file system, open '/var/task/data/study-records.json'`。

当前打卡、收藏、复习都写入 Supabase，不再写 `data/study-records.json`。

### 2. 恢复本地 14 张中文卡显示

此前将卡片读取源切到了 Supabase，导致线上只显示数据库里少量卡片。

现已恢复为：

- 页面内容仍读本地 `data/cards.json`
- 学习状态继续读写 Supabase

### 3. 修复 slug 与 UUID 不匹配

本地卡片 `id` 例如：

- `2026-05-01-roman-roads`

而 `study_records.card_id` 需要 UUID。

现已加入桥接逻辑，按 `card_date` 自动关联或创建 `knowledge_cards` 记录，再用其 UUID 写学习状态。

## 当前保留但未启用

以下在线生成接口当前有意关闭，返回 409：

- `POST /api/admin/generate-today`
- `POST /api/admin/cards/:id/regenerate`
- `GET /api/cron/generate-daily-card`

原因：项目当前主流程仍是“本地周批量卡片模式”，不是“线上自动生成模式”。

## 当前风险

1. 图片仍跟随仓库存放
2. README 与交接文档历史上曾多次落后于代码，需要持续保持同步
3. `knowledge_cards` 目前只作为桥接，不是最终内容主源
4. 中文文本曾出现过终端显示乱码，需要继续校正编码相关流程

## 下一步建议

1. 保持当前混合模式稳定一段时间
2. 清理和统一中文编码
3. 再决定是否把卡片内容整体迁入 Supabase
4. 图片数量增长后，再迁移到对象存储
