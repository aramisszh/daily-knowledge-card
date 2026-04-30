# 项目最新进度

## 项目目标

每天自动生成一张“陌生领域一图流知识卡”，用于学习新领域知识。系统需要：

1. 每天生成一张知识图片。
2. 保存历史图片。
3. 按知识类别、日期、学习状态筛选。
4. 支持学习打卡。
5. 统计累计完成、连续学习、收藏、待复习、分类完成情况。
6. 图片之外保留完整知识内容包，供前端详情页和复习题使用。

## 已确定的产品方案

当前采用 MVP 方案：

```txt
完整知识内容包 -> 图片生成提示词 -> image2/OpenAI 图像 API 生成一图流海报 -> 入库 -> 前端展示
```

暂不采用 HTML 模板 + Playwright 渲染。原因：直接用 image2 生成整图已满足当前基础需求，优先跑起来。

## 已确定的选题轮动

```txt
周一：自然科学
周二：工程技术
周三：人文社科
周四：商业金融
周五：历史文明
周六：艺术设计
周日：综合冷知识
```

## 已确定的知识内容包结构

核心字段：

```txt
title
subtitle
category
subCategory
difficulty
summary
coreMechanism
whyImportant
processSteps
keywords
misconception
financeAngle
memoryHooks
thinkingQuestions
conclusion
```

其中 `thinkingQuestions` 固定 3 道题，每题包含：

```txt
level
question
answer
keyPoint
```

3 道题层级：

1. 概念理解
2. 因果分析
3. 迁移应用

## 前端已完成

文件：`src/app/page.tsx`

已实现：

1. 今日学习页。
2. 知识图库页。
3. 学习进度页。
4. 知识详情页。
5. 分类、状态、关键词筛选。
6. 完成今日学习。
7. 收藏。
8. 标记待复习。
9. 学习进度页中“累计完成 / 收藏 / 待复习”可展开对应卡片列表。
10. 详情页展示三道思考题和参考答案。
11. 移除 `lucide-react`，改用内联 SVG，避免 CDN 图标加载失败。
12. 加入轻量自测逻辑。

## 后端当前状态

已打包后端骨架，但尚未实际运行验证数据库、OpenAI、Supabase Storage 的联调。

包含：

1. Supabase schema：`database/schema.sql`
2. API 路由：`src/app/api/*`
3. OpenAI 内容生成服务：`src/services/content-service.ts`
4. 图片 prompt 生成服务：`src/services/image-prompt-service.ts`
5. 图片生成服务：`src/services/image-service.ts`
6. Supabase Storage 上传：`src/services/storage-service.ts`
7. 每日生成主流程：`src/services/generation-service.ts`
8. 新加坡日期工具：`src/lib/date.ts`
9. 数据映射：`src/lib/mapper.ts`
10. 连续学习统计：`src/lib/progress.ts`
11. Vitest 测试：`src/lib/progress.test.ts`

## 当前后端 API

```txt
GET  /api/cards/today
GET  /api/cards
GET  /api/cards/:id
POST /api/study/complete
POST /api/study/favorite
POST /api/study/review
GET  /api/stats
GET  /api/cron/generate-daily-card
POST /api/admin/generate-today
POST /api/admin/cards/:id/regenerate
```

## 数据库表

```txt
knowledge_cards
study_records
generation_jobs
```

## Codex 接手建议顺序

1. 安装依赖并跑通前端：`npm install && npm run dev`。
2. 解决 TypeScript / Next.js 版本导致的类型错误。
3. 初始化 Supabase 表和 Storage bucket。
4. 配置 `.env.local`。
5. 先手动插入一条 `knowledge_cards` 测试数据，验证 API 查询。
6. 把前端 mock 数据替换为 API 加载。
7. 验证打卡、收藏、待复习写入 `study_records`。
8. 手动调用 `/api/admin/generate-today`，验证内容生成、图片生成、图片上传、入库。
9. 部署 Vercel 后启用 Cron。
10. 再做错误重试、后台管理页、真实登录、多用户。

## 需要 Codex 特别注意

1. 当前前端还没有接 API，仍是 mock 数据。
2. `OPENAI_TEXT_MODEL` 和 `OPENAI_IMAGE_MODEL` 需要按账号可用模型调整。
3. `image-service.ts` 使用了 `as any`，是为了兼容不同版本 OpenAI SDK 的图像生成参数。Codex 应根据实际 SDK 类型修正。
4. Supabase Storage bucket 当前按 public bucket 设计。
5. 当前 `USER_ID` 固定为 `default_user`，后续接登录后再替换。
6. Vercel Cron 可能重复触发，所以 `knowledge_cards.card_date unique` 和 `generation_jobs unique(job_date, job_type)` 保留用于幂等。
7. 连续学习统计按新加坡日期计算，后续要继续保持。
