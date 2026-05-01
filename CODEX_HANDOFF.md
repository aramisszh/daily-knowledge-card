# Codex 接手提示

## 接手顺序

先读：

1. `AGENTS.md`
2. `README.md`
3. `PROJECT_PROGRESS.md`
4. `src/services/card-service.ts`
5. `src/app/page.tsx`

## 当前项目结论

这个项目当前不要按“全数据库内容系统”来理解，也不要按“纯本地静态页”来理解。

真实状态是：

- 本地卡片内容：`data/cards.json`
- 本地图片目录：`public/generated-cards/`
- Supabase：只负责学习状态和 UUID 桥接

## 当前主目标

不是重构，而是稳住 MVP 主链路：

1. 正常展示 14 张知识卡
2. 详情页可读
3. 打卡成功
4. 收藏成功
5. 标记复习成功
6. 学习进度统计正常

## 关键实现说明

### 1. 卡片内容来源

当前线上页面仍以 `data/cards.json` 为内容真源。

不要误以为 `knowledge_cards` 现在就是完整内容主表。当前它只是学习状态桥接层。

### 2. 学习状态来源

学习状态统一写入 Supabase `study_records`，不要再改回本地 JSON。

### 3. UUID 桥接

本地卡片 `id` 是文本 slug，Supabase `study_records.card_id` 是 UUID。

当前服务层会：

1. 先按本地卡片 `cardDate` 找 `knowledge_cards`
2. 如果没有，就插入一条桥接记录
3. 再用该 UUID 写 `study_records`

核心文件：

- `src/services/card-service.ts`

## 当前不要做的事

1. 不要把页面再次全量切到 Supabase 内容读取
2. 不要恢复本地 `study-records.json` 写入
3. 不要急着把图片迁到 Supabase Storage
4. 不要在还没稳定 MVP 前做大 UI 重构

## 当前验证方式

```bash
npm test
npm run build
```

如果 Codex 本地沙箱出现 `spawn EPERM`，需要用无沙箱构建或以 Vercel 构建结果为准。

## 后续演进方向

更合理的长期路线是：

1. 先保持“本地内容 + Supabase 学习状态”稳定
2. 再设计内容整体导入 Supabase
3. 图片增多后迁移到对象存储

不要跳步。当前最重要的是稳定可用，而不是一次性做成终态。
