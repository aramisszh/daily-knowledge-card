# Codex 接手提示词

你将接手一个 Next.js + Supabase + OpenAI 的 MVP 项目：每日一图流知识学习系统。

请先阅读：

1. `PROJECT_PROGRESS.md`
2. `README.md`
3. `src/app/page.tsx`
4. `database/schema.sql`
5. `src/services/generation-service.ts`

当前目标不是重构，而是把 MVP 跑通。

## 优先任务

1. 跑通前端页面。
2. 修复 TypeScript / Next.js 构建错误。
3. 初始化 Supabase 表和 Storage bucket。
4. 把前端 mock 数据改为 API 数据。
5. 跑通打卡、收藏、待复习。
6. 跑通手动生成今日卡片。
7. 验证图片上传和图片 URL 展示。
8. 最后再启用 Vercel Cron。

## 不要做的事

1. 不要一开始引入复杂登录系统。
2. 不要重做 UI。
3. 不要切换到 HTML 模板渲染。
4. 不要删除 `content_json`，它是后续复习、详情页、搜索的主数据。
5. 不要把 OpenAI Key 暴露到前端。

## 当前产品决策

- 先用 image2/OpenAI 图像 API 直接生成完整一图流知识卡。
- 每张卡先生成完整知识内容包，再生成图片 prompt。
- 图片中展示问题，不展示答案；答案在前端详情页展开。
- 选题按星期轮动。
- 第一版单用户，`USER_ID = default_user`。
