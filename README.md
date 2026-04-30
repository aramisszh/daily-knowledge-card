# 每日一图流知识学习系统 MVP

这是从当前原型打包出的 Codex 交接版本，包含：

- 当前前端原型：`src/app/page.tsx`
- 简化 UI 组件：`src/components/ui/*`
- Next.js API 路由骨架：`src/app/api/*`
- Supabase 数据库 schema：`database/schema.sql`
- OpenAI 内容生成、图片生成、Supabase Storage 上传服务：`src/services/*`
- 进度统计测试：`src/lib/progress.test.ts`
- 项目进度说明：`PROJECT_PROGRESS.md`

## 运行步骤

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows 本地也可以直接双击：

- `scripts/init-local.cmd`：生成 `.env.local` 并提示下一步。
- `scripts/start-local.cmd`：启动本地服务。
- `scripts/stop-local.cmd`：停止占用 `3000` 端口的本项目服务。
- `scripts/reset-progress.cmd`：清空本地学习进度。

## 当前模式

项目现在默认运行在“本地周批量卡片模式”：

- 卡片内容来自 `data/cards.json`
- 学习进度、收藏、待复习状态写入 `data/study-records.json`
- 首页按当天日期自动显示对应卡片
- 不再依赖 Supabase 或 OpenAI API 才能跑起来

## 最快跑起来

1. 双击 `scripts/init-local.cmd`
2. 双击 `scripts/start-local.cmd`
3. 打开 `http://localhost:3000`

这样网页会直接读取 `data/cards.json` 里的 7 天卡片。

## 每周更新方式

1. 让 Codex 生成下一周 7 天知识卡
2. Codex 直接改写 `data/cards.json`
3. 如果想清空学习状态，双击 `scripts/reset-progress.cmd`
4. 重新启动本地服务

网页会按系统日期自动切换到当天卡片。

## Supabase 初始化

以下内容不再是当前默认主流程，仅在你以后想切回在线数据库方案时使用：

1. 创建 Supabase 项目。
2. 在 SQL Editor 中执行 `database/schema.sql`。
3. 创建 Storage bucket：`knowledge-cards`。
4. MVP 先把该 bucket 设为 public，方便前端直接读取图片 URL。
5. 在 `.env.local` 中填写：

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=knowledge-cards
```

## OpenAI 配置

```env
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.4
OPENAI_IMAGE_MODEL=gpt-image-2
```

文本默认模型已切到 `gpt-5.4`。图片生成当前走的是 OpenAI Images API，默认图片模型已切到 `gpt-image-2`。模型名仍通过环境变量控制，便于后续替换。

## 在线生成接口说明

当前默认模式下，以下在线生成接口已禁用，避免误触额外费用：

- `POST /api/admin/generate-today`
- `POST /api/admin/cards/:id/regenerate`
- `GET /api/cron/generate-daily-card`

## 当前前端状态

前端现在通过本地 API 读取 `data/cards.json` 与 `data/study-records.json`。

真实接口包括：

- `GET /api/cards/today`
- `GET /api/cards`
- `GET /api/stats`

打卡、收藏、待复习分别调用：

- `POST /api/study/complete`
- `POST /api/study/favorite`
- `POST /api/study/review`
