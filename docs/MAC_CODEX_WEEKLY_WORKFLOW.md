# MAC_CODEX_WEEKLY_WORKFLOW.md

## 0. 文档用途

本文档用于指导 Mac 端 Codex 接手 `daily-knowledge-card` 项目的 AI 播客扩展与周更工作流实现。

最终目标是让用户在 Mac 端 Codex 输入：

```text
执行本周新知识图片及音频生成工作流
```

之后，Mac 端 Codex 自动完成以下工作流中的 Mac 端部分：

1. 生成本周新知识卡计划。
2. 生成 image2 图片提示词文档。
3. 生成播客任务包。
4. 等待用户手动去 ChatGPT 官网生成图片并保存到 Mac 本地。
5. 导入图片。
6. 等待用户手动把播客任务包拷贝到 Windows 本地，并由 Windows 端 Codex + ComfyUI 生成音频。
7. 等待用户手动把 mp3 音频拷回 Mac 本地。
8. 导入音频。
9. 更新 `data/cards.json`。
10. 更新播客 manifest、归档 manifest。
11. 检查网站容量。
12. 必要时归档旧图片、旧音频、旧文字稿。
13. 运行测试、构建、推送和部署。

本文件只负责 Mac 端。Windows 端音频生产另见：

```text
docs/WINDOWS_CODEX_TTS_WORKFLOW.md
```

---

## 1. 当前项目基线

当前项目是 `daily-knowledge-card`，技术栈为 Next.js。

当前内容主链路：

```text
data/cards.json
↓
前端知识卡展示
↓
public/generated-cards/
↓
Supabase study_records 记录学习状态
```

当前项目的重要约束：

1. `data/cards.json` 仍是知识卡内容真源。
2. `public/generated-cards/` 仍是知识图片存储目录。
3. Supabase 当前只负责学习状态和 UUID 桥接，不要把内容系统整体迁移到 Supabase。
4. 不要恢复本地 `data/study-records.json` 写入。
5. 不要启用已经关闭的线上自动生成接口。
6. 不要重构现有主页面和主数据流。
7. 本次任务是“增加 AI 播客增强层”，不是重写网站。

---

## 2. 本次开发目标

在现有知识图片网站中增加 AI 播客周更能力。

目标不是搭建完整播客平台，而是在每张知识卡详情页增加一条可选 AI 播客音频，形成：

```text
知识图片
↓
知识大纲
↓
AI 双人播客脚本
↓
本地 ComfyUI TTS 音频
↓
网站播放器
↓
听完记录
↓
学习进度增强
```

MVP 阶段仍保留人工断点：

```text
人工断点 1：用户手动去 ChatGPT 官网用 image2 生成图片。
人工断点 2：用户手动把播客任务包复制到 Windows，并把 mp3 音频复制回 Mac。
```

---

## 3. Mac / Windows 两端分工

### 3.1 Mac 端 Codex 职责

Mac 端是主控端，负责：

1. 读取当前 `data/cards.json`。
2. 判断下一周需要生成的知识卡。
3. 生成本周选题计划。
4. 生成 image2 图片提示词文档。
5. 生成播客任务包。
6. 导入用户手动保存的图片。
7. 导入 Windows 端回传的 mp3 音频。
8. 更新 `data/cards.json`。
9. 更新 `data/podcast-manifest.json`。
10. 更新 `data/archive-manifest.json`。
11. 扩展前端 AI 播客播放器。
12. 扩展学习状态中的“已听播客”能力。
13. 执行容量检查和归档。
14. 执行测试、构建、推送和部署。

### 3.2 Windows 端 Codex 职责

Windows 端只负责音频生产，不修改网站源码，不提交 GitHub，不部署网站。

Windows 端负责：

1. 接收 Mac 端生成的播客任务包。
2. 检查 `script.md`、`script.srt`、`podcast.meta.json`。
3. 调用本地 ComfyUI TTS 工作流生成 wav。
4. 使用 ffmpeg 或脚本将 wav 转成 mp3。
5. 写入 duration、sizeBytes、checksum、format、bitrate 等元数据。
6. 输出 done 包。
7. 让用户手动复制 done 包回 Mac。

---

## 4. 禁止事项

本次任务不得做以下事情：

1. 不得把 `data/cards.json` 迁移到 Supabase。
2. 不得恢复本地 `data/study-records.json` 写入。
3. 不得启用线上自动生成图片接口。
4. 不得把 ComfyUI 接入线上服务端。
5. 不得让 Mac 端直接控制 Windows ComfyUI。
6. 不得把音频生成逻辑写进 Next.js API 路由。
7. 不得覆盖旧图片、旧音频、旧 transcript。
8. 不得删除原有卡片数据字段。
9. 不得破坏原有知识卡列表、详情、收藏、打卡、复习功能。
10. 不得一次性引入对象存储迁移，除非容量检查明确超限并得到用户确认。
11. 不得做 RSS 播客订阅。
12. 不得做多用户播客进度系统。
13. 不得做后台管理系统。
14. 不得重构整个首页 UI。

---

## 5. 推荐新增目录

在现有项目结构上新增以下目录。

```text
automation/
  weekly/
    {weekId}/
      weekly-plan.json
      image2-prompts.md
      mac-run-log.md
      handoff-to-windows.md
      images/
        raw/
      podcast_jobs/
        pending/
        done/
        failed/

public/
  audio/
    published/
  transcripts/
    published/
  archive/
    audio/
    transcripts/
    generated-cards/

data/
  podcast-manifest.json
  archive-manifest.json

docs/
  AI_PODCAST_HANDOFF.md
  MAC_CODEX_WEEKLY_WORKFLOW.md
  WINDOWS_CODEX_TTS_WORKFLOW.md
```

说明：

1. `automation/weekly/{weekId}` 是每周临时工作区。
2. `image2-prompts.md` 是给用户复制到 ChatGPT 官网生成图片的提示词文档。
3. `podcast_jobs/pending` 是 Mac 端生成、准备复制到 Windows 的播客任务包。
4. `podcast_jobs/done` 是 Windows 端生成音频后，用户复制回 Mac 的完成包。
5. `public/audio/published` 是当前线上可播放音频。
6. `public/transcripts/published` 是当前线上可展示文字稿。
7. `public/archive` 是 MVP 阶段的本地归档目录。
8. `data/podcast-manifest.json` 是当前播客总索引。
9. `data/archive-manifest.json` 是归档版本索引。

不要新增 `content/` 作为内容主目录。当前内容真源仍是 `data/cards.json`。

---

## 6. 推荐新增脚本

在 `scripts/` 下新增以下 Node 脚本：

```text
scripts/weekly-create.mjs
scripts/weekly-continue.mjs
scripts/import-weekly-images.mjs
scripts/import-podcast-audio.mjs
scripts/archive-assets.mjs
scripts/validate-weekly-assets.mjs
scripts/check-site-capacity.mjs
```

在 `package.json` 中新增命令：

```json
{
  "scripts": {
    "weekly:create": "node scripts/weekly-create.mjs",
    "weekly:continue": "node scripts/weekly-continue.mjs",
    "weekly:import-images": "node scripts/import-weekly-images.mjs",
    "weekly:import-audio": "node scripts/import-podcast-audio.mjs",
    "weekly:archive": "node scripts/archive-assets.mjs",
    "weekly:validate": "node scripts/validate-weekly-assets.mjs",
    "site:capacity": "node scripts/check-site-capacity.mjs"
  }
}
```

注意：

1. 不要覆盖原有 `dev`、`build`、`start`、`lint`、`test` 等命令。
2. 所有脚本必须支持重复执行，避免重复追加数据。
3. 所有脚本必须输出清晰日志。
4. 所有脚本失败时必须说明缺失文件、缺失字段或错误路径。

---

## 7. 数据结构扩展

### 7.1 cards.json 新增 podcast 字段

每张知识卡可选增加 `podcast` 字段。

```json
{
  "podcast": {
    "status": "published",
    "version": 1,
    "title": "本期 AI 播客标题",
    "duration": 238,
    "audioUrl": "/audio/published/2026-05-28-topic-a-podcast-v1.mp3",
    "transcriptUrl": "/transcripts/published/2026-05-28-topic-a-podcast-v1.md",
    "sizeBytes": 2160000,
    "checksum": "sha256-xxxx",
    "updatedAt": "2026-05-28T20:30:00+08:00",
    "archivedVersions": []
  }
}
```

### 7.2 podcast.status 枚举

支持以下状态：

```text
none
draft
pending
processing
generated
published
archived
withdrawn
failed
```

前端规则：

1. 只有 `podcast.status === "published"` 时显示播放器。
2. 没有 `podcast` 字段时不显示播客区域，不报错。
3. `withdrawn` 时显示“本期 AI 播客正在修订，暂不可播放”。
4. `draft`、`pending`、`processing`、`generated`、`failed` 时不显示播放器，可显示“播客生成中”。

### 7.3 podcast-manifest.json

新增：

```json
{
  "updatedAt": "2026-05-28T20:30:00+08:00",
  "items": [
    {
      "cardId": "2026-05-28-topic-a",
      "status": "published",
      "version": 1,
      "title": "本期 AI 播客标题",
      "audioUrl": "/audio/published/2026-05-28-topic-a-podcast-v1.mp3",
      "transcriptUrl": "/transcripts/published/2026-05-28-topic-a-podcast-v1.md",
      "duration": 238,
      "sizeBytes": 2160000,
      "checksum": "sha256-xxxx"
    }
  ]
}
```

用途：

1. 快速统计哪些卡片有播客。
2. 检查音频总容量。
3. 校验 `data/cards.json` 与实际文件是否一致。
4. 后续迁移对象存储时作为迁移索引。

### 7.4 archive-manifest.json

新增：

```json
{
  "updatedAt": "2026-05-28T20:30:00+08:00",
  "items": [
    {
      "cardId": "2026-05-28-topic-a",
      "assetType": "podcast",
      "version": 1,
      "status": "archived",
      "originalUrl": "/audio/published/2026-05-28-topic-a-podcast-v1.mp3",
      "archiveUrl": "/archive/audio/2026-05-28-topic-a-podcast-v1.mp3",
      "reason": "新版本发布，旧版本归档",
      "archivedAt": "2026-05-29T10:00:00+08:00"
    }
  ]
}
```

用途：

1. 记录旧版本。
2. 支持回滚。
3. 支持撤回。
4. 支持容量清理。
5. 防止误删。

---

## 8. 学习状态扩展

MVP 阶段建议直接扩展现有 `study_records` 表，而不是新增复杂的 `podcast_records` 表。

需要在 `database/schema.sql` 中增加：

```sql
alter table study_records
add column if not exists podcast_listened boolean default false;

alter table study_records
add column if not exists podcast_listened_at timestamptz;
```

如果项目已有迁移文件机制，则按项目现有方式新增 migration。

前端行为：

1. 播客区域增加“已听完”按钮。
2. 点击后更新当前卡片的 `podcast_listened = true`。
3. 记录 `podcast_listened_at`。
4. 刷新页面后状态仍保留。
5. 不影响原有 completed、favorite、review 等字段。

---

## 9. Mac 端周工作流

### 9.1 第一阶段：生成本周计划、图片提示词和播客任务包

用户输入：

```text
执行本周新知识图片及音频生成工作流
```

Mac Codex 执行：

```bash
npm run weekly:create
```

`weekly-create.mjs` 应完成：

1. 读取 `data/cards.json`。
2. 找到当前最后一张卡片日期。
3. 计算下一周 7 天日期。
4. 按现有类别轮动逻辑生成 7 个选题。
5. 为每个选题生成稳定 `cardId`。
6. 生成 `automation/weekly/{weekId}/weekly-plan.json`。
7. 生成 `automation/weekly/{weekId}/image2-prompts.md`。
8. 为每张卡生成播客任务包。
9. 生成 `automation/weekly/{weekId}/handoff-to-windows.md`。
10. 写入 `automation/weekly/{weekId}/mac-run-log.md`。

本阶段不得修改正式 `data/cards.json`。

生成结构：

```text
automation/weekly/{weekId}/
  weekly-plan.json
  image2-prompts.md
  mac-run-log.md
  handoff-to-windows.md
  podcast_jobs/
    pending/
      {cardId}/
        script.md
        script.srt
        podcast.meta.json
```

### 9.2 image2-prompts.md 要求

`image2-prompts.md` 中每张图必须包含：

1. `cardId`
2. 标题
3. 类别
4. 尺寸要求：竖版 4:5，手机阅读友好
5. 风格要求：现代信息图、清晰、高信息密度
6. 必须包含的文字
7. 版面结构
8. 禁止事项
9. 保存文件名要求：`{cardId}.png`

提示词要适合用户复制到 ChatGPT 官网使用 image2 生成图片。

### 9.3 播客任务包要求

每个任务包包含：

```text
script.md
script.srt
podcast.meta.json
```

`script.md` 是人工可读版本。

`script.srt` 是 Windows ComfyUI TTS 输入版本。

`podcast.meta.json` 示例：

```json
{
  "cardId": "2026-05-28-topic-a",
  "podcastVersion": 1,
  "title": "本期 AI 播客标题",
  "targetDurationSec": 240,
  "language": "zh-CN",
  "style": "双人对话式科普",
  "speakerA": "host-a",
  "speakerB": "host-b",
  "status": "pending",
  "createdAt": "2026-05-28T09:00:00+08:00"
}
```

双人播客角色固定：

```text
A：知识讲解者，负责解释概念、机制、案例和误区。
B：普通学习者，负责提出普通人会问的问题。
```

每期播客时长目标：3 至 5 分钟。

MVP 建议优先控制在 3 分钟左右。

---

## 10. 人工断点 1：用户生成图片

用户根据 `image2-prompts.md` 去 ChatGPT 官网手动生成图片。

图片保存到：

```text
automation/weekly/{weekId}/images/raw/
```

文件名必须是：

```text
{cardId}.png
```

例如：

```text
2026-05-28-topic-a.png
```

用户完成后会告诉 Mac Codex：

```text
图片已保存到 automation/weekly/{weekId}/images/raw，请继续
```

Mac Codex 执行：

```bash
npm run weekly:import-images -- {weekId}
```

`import-weekly-images.mjs` 应完成：

1. 检查 `weekly-plan.json`。
2. 检查 7 张图片是否存在。
3. 检查文件名是否匹配 cardId。
4. 复制图片到 `public/generated-cards/`。
5. 不覆盖旧图片。
6. 如目标文件已存在，自动创建新版本或中止并提示用户。
7. 更新 `weekly-plan.json` 中每张卡的 image 状态。
8. 写入 `mac-run-log.md`。

---

## 11. 人工断点 2：Windows 生成音频

Mac Codex 生成 `handoff-to-windows.md`，提示用户复制：

```text
automation/weekly/{weekId}/podcast_jobs/pending/
```

到 Windows：

```text
D:\AI-Podcast\jobs\pending\{weekId}\
```

Windows 端 Codex 根据 `docs/WINDOWS_CODEX_TTS_WORKFLOW.md` 生成音频。

Windows 端 done 包回传到 Mac：

```text
automation/weekly/{weekId}/podcast_jobs/done/
```

每个 done 包必须包含：

```text
{cardId}/
  script.md
  script.srt
  transcript.md
  podcast.meta.json
  {cardId}-podcast-v1.mp3
```

用户完成后会告诉 Mac Codex：

```text
音频已拷回 automation/weekly/{weekId}/podcast_jobs/done，请继续
```

Mac Codex 执行：

```bash
npm run weekly:import-audio -- {weekId}
```

`import-podcast-audio.mjs` 应完成：

1. 检查 done 包是否存在。
2. 检查每个 cardId 是否有 mp3。
3. 检查 `podcast.meta.json`。
4. 检查 `transcript.md`。
5. 读取 mp3 文件大小。
6. 计算 sha256 checksum。
7. 如果可行，读取 mp3 duration。
8. 复制 mp3 到 `public/audio/published/`。
9. 复制 transcript 到 `public/transcripts/published/`。
10. 更新 `weekly-plan.json` 的 podcast 状态。
11. 更新 `data/podcast-manifest.json`。
12. 写入 `mac-run-log.md`。

---

## 12. 写入正式 cards.json

图片和音频都导入后，Mac Codex 执行：

```bash
npm run weekly:continue -- {weekId}
```

`weekly-continue.mjs` 应完成：

1. 读取 `weekly-plan.json`。
2. 确认每张卡 image 已导入。
3. 确认每张卡 podcast 已导入。
4. 生成正式卡片数据。
5. 追加到 `data/cards.json`。
6. 不得重复追加已存在 cardId。
7. 如果 cardId 已存在，进入版本更新流程。
8. 每张新卡写入 podcast 字段。
9. 更新 `data/podcast-manifest.json`。
10. 写入 `mac-run-log.md`。

---

## 13. 前端实现要求

在知识卡详情页增加 AI 播客区域。

要求：

1. 有 `podcast.status === "published"` 时显示播放器。
2. 播放器显示标题、时长、播放控件。
3. 显示“查看文字稿”入口，可展开/收起。
4. 显示“已听完”按钮。
5. 点击“已听完”后写入 Supabase `study_records`。
6. 没有 podcast 字段的旧卡片不报错。
7. `withdrawn` 状态显示“本期 AI 播客正在修订，暂不可播放”。
8. 其他非 published 状态不显示播放器。
9. 原有知识图片、思考题、收藏、打卡、复习功能不受影响。

---

## 14. 容量检查与归档机制

每次部署前必须执行：

```bash
npm run site:capacity
```

`check-site-capacity.mjs` 应统计：

1. `public/generated-cards` 总大小。
2. `public/audio/published` 总大小。
3. `public/transcripts/published` 总大小。
4. `public/archive` 总大小。
5. public 总大小。

建议阈值：

```text
public 总大小 < 80MB：正常
80MB <= public 总大小 < 100MB：警告，但允许继续
public 总大小 >= 100MB：阻止继续部署，要求归档或迁移对象存储
```

归档脚本：

```bash
npm run weekly:archive
```

`archive-assets.mjs` 应支持：

1. 归档旧音频。
2. 归档旧 transcript。
3. 归档旧图片。
4. 更新 `data/archive-manifest.json`。
5. 不删除索引。
6. 不破坏历史卡片可访问性。
7. 不覆盖已有 archive 文件。

MVP 阶段先做本地归档，不做对象存储迁移。

未来如容量持续增长，再考虑 Cloudflare R2、Vercel Blob 或 S3 兼容存储。

---

## 15. 版本更新规则

任何图片、音频、transcript 重新生成时，都不得覆盖旧文件。

命名规则：

```text
图片：
{cardId}-v1.png
{cardId}-v2.png

音频：
{cardId}-podcast-v1.mp3
{cardId}-podcast-v2.mp3

文字稿：
{cardId}-podcast-v1.md
{cardId}-podcast-v2.md
```

如果当前项目现有图片命名尚未使用 `-v1`，则保持兼容：

1. 旧图片继续使用原路径。
2. 新增版本化逻辑只应用于后续更新。
3. 不批量重命名旧图片。

更新新版本时：

1. 旧版本移动或记录到 archive。
2. 新版本进入 published。
3. `data/cards.json` 只指向当前 published 版本。
4. `data/archive-manifest.json` 记录旧版本。
5. `podcast.archivedVersions` 记录旧版本信息。

---

## 16. 撤回与回滚

### 16.1 withdrawn

如果某期播客内容错误，应撤回，而不是直接删除。

撤回后：

1. `podcast.status = "withdrawn"`。
2. 前端不播放。
3. 显示“本期 AI 播客正在修订，暂不可播放”。
4. 旧文件保留在 archive 或保留索引记录。
5. `archive-manifest.json` 写入撤回原因。

### 16.2 rollback

回滚时：

1. 从 `archive-manifest.json` 找到可恢复版本。
2. 复制或重新指向归档版本。
3. 生成新的 published 版本记录。
4. 不直接把版本号倒退。
5. 写入 rollback reason。

---

## 17. gpt5.4 任务分配建议

如果当前 Codex 环境支持子任务分配或模型选择，请把低风险、规则明确、机械性强的任务分配给 gpt5.4。

### 17.1 可以分配给 gpt5.4 的初级任务

1. 新增空目录和 `.gitkeep`。
2. 新增文档文件草稿。
3. 新增 TypeScript 类型定义草稿。
4. 编写 manifest JSON 初始化文件。
5. 编写简单的文件存在性校验函数。
6. 编写 checksum 计算函数。
7. 编写目录大小统计函数。
8. 编写不涉及业务判断的路径拼接函数。
9. 编写基础单元测试。
10. 给现有脚本增加日志输出。
11. 生成 README 中的操作示例。
12. 检查格式化、lint、无用 import。
13. 生成 `handoff-to-windows.md` 模板。
14. 生成 `image2-prompts.md` 的 Markdown 模板骨架。
15. 生成 `podcast.meta.json` 的 schema 校验草稿。

### 17.2 不要分配给 gpt5.4 的任务

以下任务需要主模型亲自完成或严格 review：

1. `data/cards.json` 写入逻辑。
2. 卡片字段兼容策略。
3. Supabase schema 变更。
4. 学习状态 API 修改。
5. 归档、撤回、回滚状态机。
6. weekly 工作流主控逻辑。
7. 版本号递增逻辑。
8. 防重复追加逻辑。
9. 前端播放器与现有详情页整合。
10. 部署前校验策略。
11. 容量超限后的处理策略。
12. 涉及删除、移动、覆盖文件的脚本。
13. 与 `public/generated-cards` 旧文件兼容有关的逻辑。
14. 任何可能破坏原有学习进度的改动。

### 17.3 gpt5.4 输出要求

分配给 gpt5.4 的任务必须满足：

1. 只做单一原子任务。
2. 不跨越多个业务模块。
3. 不自行改架构。
4. 不自行改数据源。
5. 不自行删除文件。
6. 输出 diff 后由主模型 review。
7. 无法确认时停止并交回主模型。

---

## 18. 推荐实现顺序

不要一开始直接执行完整周工作流。先完成基础设施改造。

### Phase 0：审计现状

1. 查看 `README.md`。
2. 查看 `CODEX_HANDOFF.md`。
3. 查看 `PROJECT_PROGRESS.md`。
4. 查看 `data/cards.json`。
5. 查看 `database/schema.sql`。
6. 查看 `src/app/page.tsx` 或当前主页面。
7. 查看 `src/app/api/study`。
8. 查看 `package.json`。
9. 输出当前项目结构摘要。
10. 确认不改动主数据源。

### Phase 1：文档与目录

1. 新增 `docs/AI_PODCAST_HANDOFF.md`。
2. 新增 `docs/MAC_CODEX_WEEKLY_WORKFLOW.md`。
3. 新增 `docs/WINDOWS_CODEX_TTS_WORKFLOW.md`。
4. 新增 `automation/weekly/.gitkeep`。
5. 新增 `public/audio/published/.gitkeep`。
6. 新增 `public/transcripts/published/.gitkeep`。
7. 新增 `public/archive/audio/.gitkeep`。
8. 新增 `public/archive/transcripts/.gitkeep`。
9. 新增 `public/archive/generated-cards/.gitkeep`。
10. 新增空 manifest。

### Phase 2：数据结构和前端最小展示

1. 增加 Podcast 类型。
2. 让卡片类型支持可选 podcast 字段。
3. 在详情页增加 AI 播客播放器。
4. 没有 podcast 的卡片不报错。
5. 增加 withdrawn 状态展示。
6. 不实现完整 weekly 工作流。

### Phase 3：学习状态扩展

1. 扩展 `study_records`。
2. 扩展 API。
3. 增加“已听完”按钮。
4. 刷新后状态保留。
5. 原有打卡、收藏、复习不受影响。

### Phase 4：脚本骨架

1. `weekly-create.mjs`
2. `import-weekly-images.mjs`
3. `import-podcast-audio.mjs`
4. `weekly-continue.mjs`
5. `check-site-capacity.mjs`
6. `validate-weekly-assets.mjs`
7. `archive-assets.mjs`

先实现 dry-run，再实现真实写入。

### Phase 5：单卡测试

用 1 张测试卡跑通：

```text
weekly-create
↓
生成 image2-prompts.md
↓
生成 podcast_jobs/pending
↓
人工放入 1 张图片
↓
import-images
↓
人工放入 1 个 mp3 done 包
↓
import-audio
↓
weekly-continue
↓
前端播放
↓
听完记录
↓
build
```

### Phase 6：扩展到一周 7 张

单卡测试通过后，再启用 7 张周更。

---

## 19. 验收标准

### 19.1 基础验收

1. `npm test` 通过。
2. `npm run build` 通过。
3. 原有知识卡列表正常。
4. 原有知识卡详情正常。
5. 原有打卡功能正常。
6. 原有收藏功能正常。
7. 原有复习功能正常。
8. 没有 podcast 字段的旧卡片不报错。

### 19.2 播客展示验收

1. 有 `podcast.status === "published"` 的卡片显示播放器。
2. 播放器可以播放 mp3。
3. 可以展开 transcript。
4. 点击“已听完”后状态保存。
5. 刷新页面后“已听完”状态仍存在。
6. withdrawn 状态不播放音频。
7. failed / pending / draft 状态不报错。

### 19.3 周工作流验收

1. `npm run weekly:create` 能生成 `weekly-plan.json`。
2. `npm run weekly:create` 能生成 `image2-prompts.md`。
3. `npm run weekly:create` 能生成 `podcast_jobs/pending`。
4. `npm run weekly:import-images -- {weekId}` 能导入图片。
5. `npm run weekly:import-audio -- {weekId}` 能导入 mp3。
6. `npm run weekly:continue -- {weekId}` 能写入 `data/cards.json`。
7. 重复执行不会重复追加同一张卡。
8. 文件缺失时能给出明确错误。

### 19.4 归档与容量验收

1. `npm run site:capacity` 能输出 public 总大小。
2. public 超过 80MB 给出警告。
3. public 超过 100MB 阻止继续部署或提示必须归档。
4. 新版本不会覆盖旧版本。
5. 归档版本写入 `data/archive-manifest.json`。
6. `data/podcast-manifest.json` 与 `data/cards.json` 一致。

---

## 20. 完成后输出给用户的结果

完成基础设施改造后，Mac Codex 应输出：

1. 修改文件列表。
2. 新增文件列表。
3. 新增 npm scripts。
4. 是否修改数据库 schema。
5. 是否需要用户在 Supabase 执行 SQL。
6. 如何运行本地测试。
7. 如何执行单卡测试。
8. 如何执行一周工作流。
9. 当前未完成事项。
10. 是否可以进入 Windows 端音频工作流开发。

---

## 21. 第一轮执行要求

第一轮不要直接实现完整自动化。请按以下顺序执行：

1. 审计仓库。
2. 输出实施计划。
3. 新增文档和目录。
4. 新增 podcast 类型和前端播放器最小实现。
5. 新增 manifest 初始化。
6. 新增容量检查脚本。
7. 用 mock podcast 数据验证前端播放器。
8. 跑测试和构建。
9. 输出验收结果。

第一轮完成后，再进入 weekly 脚本完整实现。
