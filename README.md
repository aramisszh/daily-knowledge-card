# 每日一图流知识学习系统 MVP

当前版本已经进入“初步可用”状态，目标是先把以下主链路跑稳：

- 浏览 14 张本地知识卡
- 查看详情页与思考题
- 在线完成打卡、收藏、标记复习
- 在学习进度页查看统计

## 当前架构

当前项目不是“全本地”，也不是“全数据库”，而是一个刻意保留的混合模式：

- 知识卡内容来源：`data/cards.json`
- 知识卡图片来源：`public/generated-cards/*`
- 学习状态来源：Supabase `study_records`
- 桥接表：Supabase `knowledge_cards`

桥接表的作用只有一个：为学习状态提供稳定的 UUID 主键。页面展示时，仍然以本地卡片内容为准，再把 Supabase 里的打卡/收藏/复习状态按 `card_date` 合并回来。

## 为什么这样设计

这样做是当前阶段最务实的折中：

- 保留现有 14 张中文卡和本地图片，不需要立即迁库
- 解决 Vercel 只读文件系统导致的 `EROFS`
- 避免把 2.5MB/张的图片马上塞进 Supabase Storage
- 给后续“内容入库、图片迁对象存储”保留升级空间

## 目录说明

- `data/cards.json`
  当前知识卡主内容源。包含标题、摘要、分类、详情内容、图片路径等。
- `public/generated-cards/`
  当前知识卡图片目录。Vercel 会把这里当成静态资源目录，对外路径为 `/generated-cards/...`。
- `src/app/page.tsx`
  当前 MVP 单页前端。
- `src/app/api/cards/*`
  读取卡片内容和详情接口。
- `src/app/api/study/*`
  打卡、收藏、复习接口。
- `src/services/card-service.ts`
  当前混合模式的核心服务层：本地卡片 + Supabase 学习状态 + UUID 桥接。
- `database/schema.sql`
  Supabase 表结构。
- `database/dev_seed.sql`
  最小示例种子数据，仅用于快速验证数据库联通。

## 本地运行

```bash
npm install
npm run dev
```

Windows 也可以直接使用脚本：

- `scripts/init-local.cmd`
- `scripts/start-local.cmd`
- `scripts/stop-local.cmd`
- `scripts/reset-progress.cmd`

## 必要环境变量

当前“看卡片”不依赖 Supabase，但“打卡/收藏/复习”依赖 Supabase。

`.env.example` 中的变量分为两组：

### 当前主链路必需

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=knowledge-cards
CRON_SECRET=replace-with-long-random-secret
ADMIN_SECRET=replace-with-long-random-secret
```

说明：

- `SUPABASE_STORAGE_BUCKET` 当前保留是为了兼容后续生成链路，主链路暂不依赖图片上传。
- `CRON_SECRET` 和 `ADMIN_SECRET` 必须使用纯 ASCII 字符，不能包含中文或全角字符。

### 未来在线生成链路需要

```env
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.4
OPENAI_IMAGE_MODEL=gpt-image-2
```

当前线上主链路不依赖 OpenAI；只有未来重新启用在线生成时才需要。

## Supabase 初始化

当前项目至少需要执行：

1. 在 Supabase 创建项目
2. 执行 `database/schema.sql`
3. 创建 public bucket：`knowledge-cards`
4. 在 Vercel 配置上面的环境变量

如果只想验证数据库联通，可以额外执行：

5. `database/dev_seed.sql`

注意：当前页面内容主来源不是这个 seed，而是 `data/cards.json`。

## 当前接口行为

### 正常启用

- `GET /api/cards`
- `GET /api/cards/today`
- `GET /api/cards/:id`
- `GET /api/stats`
- `POST /api/study/complete`
- `POST /api/study/favorite`
- `POST /api/study/review`

### 当前返回 409，属于有意关闭

- `POST /api/admin/generate-today`
- `POST /api/admin/cards/:id/regenerate`
- `GET /api/cron/generate-daily-card`

原因：当前项目仍处于“本地周批量卡片模式”，新增卡片和图片仍通过 Codex 更新 `data/cards.json` 与 `public/generated-cards/`。

## 当前内容更新方式

当前新增一张卡，仍按下面流程做：

1. 准备图片文件，放入 `public/generated-cards/`
2. 在 `data/cards.json` 中新增对应卡片内容
3. 提交代码并部署

当前不要直接把图片长期放进 Supabase Storage，除非产品方向明确改为“数据库内容 + 对象存储图片”。

## 验证命令

```bash
npm test
npm run build
```

说明：在当前 Codex 桌面沙箱里，`npm run build` 可能出现本地 `spawn EPERM`，这更像执行环境限制，不代表项目构建本身失败。需要以无沙箱构建结果或 Vercel 构建结果为准。

## 当前已知限制

- 线上知识卡内容仍依赖代码部署，不支持后台直接编辑内容
- 图片仍在仓库里，长期增长后需要迁移到对象存储
- `knowledge_cards` 当前承担桥接作用，不是最终内容真源
- 在线生成链路代码仍保留，但当前不开放给生产流程

## 下一阶段建议

优先级从高到低：

1. 继续稳定当前主链路
2. 清理和统一中文编码问题
3. 为本地卡片内容建立可靠导入数据库方案
4. 再评估图片迁移到对象存储
