# Weekly Incoming Pack Design

**Goal**

把 `daily-knowledge-card` 的 weekly 工作流从 “Mac 端生成周计划并继续导入” 调整为 “Mac 端接收外部周包并完成发布收口”，同时保留旧 `automation/weekly/...` 工作流作为临时兼容资产，但不再作为主流程文档或后续提交范围。

**Decision**

- 新主流程只面向 `automation/incoming/<weekKey>/`
- 旧 `automation/weekly/...` 只保留读取兼容，不继续增强
- Mac 端不再负责选题、知识卡正文、image2 提示词、播客脚本生成
- Mac 端只负责接收、校验、导入、发布、归档

## 1. Problem Statement

当前仓库的 weekly 主流程仍然围绕以下假设构建：

1. Mac 端基于 `data/cards.json` 推导下一周内容
2. Mac 端生成 `weekly-plan.json`、`image2-prompts.md`、`podcast_jobs/pending`
3. Mac 端在素材回流后通过 `weekly:continue` 完成导入和发布

这与新的实际生产链路不一致。新的生产链路里，内容、图片、播客文稿都已经在 ChatGPT 网页端与 Windows 端外部完成，Mac 端不再是内容生成入口，而是发布主控端。

如果继续沿用 `weekly:create` / `weekly:continue` 作为主入口，会产生 3 个问题：

1. 命令语义错误，后续维护会继续混乱
2. 目录结构不再反映真实交付物来源
3. 外部周包与仓库内发布状态之间缺少清晰的桥接层

## 2. Scope

本次只处理 Mac 端收口。

包含：

- 更新项目规则文档，明确新周包模式
- 新增接收与发布入口脚本
- 让现有图片导入、音频导入、校验、归档能力适配新目录
- 更新 `data/cards.json`
- 更新 `data/podcast-manifest.json`
- 更新 `data/archive-manifest.json`
- 运行测试、构建、容量检查

不包含：

- Windows 端 TTS 生产逻辑改造
- ChatGPT 网页端提示词模板改造
- 前端播放器功能改造
- Supabase schema 变化
- 旧 `weekly:create` 工作流增强

## 3. New Source of Truth and Operating Model

新的“每周输入源”是外部交付周包，而不是 Mac 本地生成计划。

新模型下：

- 外部周包是真实输入
- `data/cards.json` 仍是站点内容真源
- `public/generated-cards/`、`public/audio/published/`、`public/transcripts/published/` 是公开发布位
- `data/podcast-manifest.json` 和 `data/archive-manifest.json` 是发布索引和归档索引

因此需要一个中间桥接动作：

`incoming weekly pack -> normalized publish plan -> published assets + cards/manifests`

Mac 端脚本的职责不是生成内容，而是把外部周包标准化成内部可发布对象，并验证整个发布链路的一致性。

## 4. Directory Model

新主目录：

```text
automation/
  incoming/
    2026-W22/
      weekly-plan.json
      cards-draft.json
      image-assets/
        2026-05-25-topic-a.png
      podcast_jobs/
        pending/
          2026-05-25-topic-a/
            script.md
            script.srt
            transcript.md
            podcast.meta.json
        done/
          2026-05-25-topic-a/
            script.md
            script.srt
            transcript.md
            podcast.meta.json
            2026-05-25-topic-a-podcast-v1.mp3
  archive/
    2026-W22/
```

旧兼容目录：

```text
automation/
  weekly/
    2026-05-22_to_2026-05-28/
```

规则：

- 新文档、新命令、新测试只以 `automation/incoming/<weekKey>` 为主
- 旧目录只读，不自动迁移，不自动重写
- 新流程归档落到 `automation/archive/<weekKey>/`

## 5. Command Model

新的 Mac 端命令集：

```json
{
  "scripts": {
    "weekly:receive": "node scripts/receive-weekly-pack.mjs",
    "weekly:validate": "node scripts/validate-weekly-assets.mjs",
    "weekly:publish": "node scripts/publish-weekly-pack.mjs",
    "weekly:import-images": "node scripts/import-weekly-images.mjs",
    "weekly:import-audio": "node scripts/import-podcast-audio.mjs",
    "weekly:archive": "node scripts/archive-assets.mjs",
    "site:capacity": "node scripts/check-site-capacity.mjs"
  }
}
```

命令职责：

- `weekly:receive <weekKey>`：读取 incoming 周包，校验最低结构，生成或更新内部标准化发布计划
- `weekly:validate <weekKey>`：校验周包结构、发布引用、公开资源路径、manifest 一致性、中文文本损坏风险
- `weekly:publish <weekKey>`：顺序执行导入图片、导入音频、合并卡片、更新 manifest，并在必要时调用归档能力

旧命令处理：

- `weekly:create` 保留文件，但从文档主流程移除
- `weekly:continue` 保留文件，但不再作为推荐入口
- 不新增任何新逻辑到旧入口，除非兼容桥接复用其纯函数更省事

## 6. Internal Normalization Layer

这是本次改造的关键点。

现有导入脚本大多依赖旧版 `weekly-plan.json` 结构与 `getWeeklyWorkspacePaths()` 返回值。直接把所有脚本一次性改成只认新目录，风险过高。

因此采用桥接层方案：

1. `receive-weekly-pack.mjs` 读取 `weekly-plan.json` 与 `cards-draft.json`
2. 把外部周包解析为内部标准对象
3. 把标准对象写入一个稳定的、供导入脚本消费的计划文件
4. 后续 `import-weekly-images.mjs` / `import-podcast-audio.mjs` 优先消费这个标准对象

标准对象至少需要覆盖：

- `weekId`
- `cards[]`
- `cardId`
- `cardDate`
- `title`
- `category`
- `summary`
- `content`
- `image.status`
- `image.sourceFileName`
- `image.publishedUrl`
- `podcast.status`
- `podcast.version`
- `podcast.title`
- `podcast.audioUrl`
- `podcast.transcriptUrl`

这样做的目的不是再造一套内容系统，而是尽量复用现有导入/校验代码，把目录变化与外部包字段差异隔离在接收层。

## 7. Validation Rules

`weekly:receive` 必须校验：

- `automation/incoming/<weekKey>/` 存在
- `weekly-plan.json` 可读且结构正确
- `cards-draft.json` 可读且是数组
- `image-assets/` 存在
- `podcast_jobs/pending` 和 `podcast_jobs/done` 目录结构可识别
- 每张卡在 draft、图片、播客元数据之间能按 `cardId` 对齐

`weekly:validate` 必须校验：

- `cards-draft.json` 中每张卡的必要字段完整
- 每个 `imageUrl` 最终都能映射到真实文件
- 每个已发布播客的 `audioUrl`、`transcriptUrl` 有真实目标文件
- `podcast-manifest.json` 与 `data/cards.json` 的 published podcast 信息一致
- `archive-manifest.json` 中的 archive 资源真实存在
- 中文文本没有 `??`、`�`、明显 mojibake

额外规则：

- 写入 `data/cards.json` 后必须直接回读新增卡片进行中文回归检查
- 不允许只做“文件写成功”判断

## 8. Publish Flow

`weekly:publish <weekKey>` 的顺序固定为：

1. 读取并确认接收态标准计划存在
2. 导入图片到 `public/generated-cards/`
3. 导入音频到 `public/audio/published/`
4. 导入文稿到 `public/transcripts/published/`
5. 合并 `cards-draft.json` 到 `data/cards.json`
6. 更新 `data/podcast-manifest.json`
7. 按现有策略更新 `data/archive-manifest.json`
8. 执行 `npm test`
9. 执行 `npm run build`
10. 执行 `site:capacity`
11. 验证通过后，再允许进入提交、推送、部署、归档

注意：

- `weekly:publish` 只完成本地发布收口
- `git push` 和正式部署仍需用户明确触发或确认

## 9. Archive Policy

归档分两层：

1. 站点公开资源归档
   - 继续沿用 `public/archive/...` + `data/archive-manifest.json`
2. 周工作包归档
   - 把本周 incoming 原始包归档到 `automation/archive/<weekKey>/`

原则：

- 归档是复制或搬运工作包，不删除源证据，除非用户后续明确要求清理
- 不改写历史周包内容
- 不让 archive 逻辑隐式覆盖线上公开资源

## 10. Documentation Changes

文档要同步调整：

- `AGENTS.md`
  - 把 weekly 主流程改成“外部周包接收模式”
  - 明确 Mac 端不再负责生成选题、正文、image2 提示词、播客脚本
  - 明确旧工作流仅临时保留，不作为后续提交目标
- `docs/MAC_CODEX_WEEKLY_WORKFLOW.md`
  - 从“Mac 主控生成”改为“Mac 主控接收与发布”
  - 目录结构改成 `incoming/archive`
  - 命令改成 `weekly:receive` / `weekly:publish`

## 11. Testing Strategy

测试分 4 层：

1. `weekly-paths` / `weekly-json` 这种路径与 IO 辅助单测
2. `receive-weekly-pack` 单测
3. `publish-weekly-pack` 单测
4. 现有导入与校验脚本回归测试

重点验证：

- 新周包结构可以被正确识别
- 同一个周包重复执行不会重复追加数据
- 目标文件已存在且 bytes 一致时允许幂等通过
- 目标文件已存在但 bytes 不同时必须硬失败
- 中文文本在写回 `data/cards.json` 后保持可读

## 12. Risks and Mitigations

风险 1：旧脚本深度耦合旧 `weekId` 与旧目录

缓解：
- 先在 `weekly-paths` 层扩展新路径模型
- 用标准化桥接层隔离外部周包与旧内部对象

风险 2：`cards-draft.json` 字段与站点正式卡片字段不完全一致

缓解：
- 在 receive 阶段做显式字段映射与必填校验
- 在 publish 阶段只允许写入标准化后的正式对象

风险 3：UTF-8 中文写回再次损坏

缓解：
- 继续使用 `utf8` 明确写路径
- 写回后立刻回读新增卡片做回归检查

风险 4：当前工作区已有未提交改动

缓解：
- 本次只在必要文件内增量修改
- 不回滚用户现有改动
- 不把 legacy 目录改动纳入这次提交范围

## 13. Acceptance Criteria

满足以下条件即认为这次 Mac 端收口完成：

1. 仓库规则文档已改成外部周包模式
2. 存在 `weekly:receive` 和 `weekly:publish` 两个新入口
3. `automation/incoming/<weekKey>/` 可以作为新主输入源
4. 图片、音频、文稿可以从 incoming 周包正确导入到公开目录
5. `cards-draft.json` 可以安全合并进 `data/cards.json`
6. `podcast-manifest.json` / `archive-manifest.json` 与发布结果保持一致
7. `npm test` 通过
8. `npm run build` 通过
9. `site:capacity` 可运行
10. 旧 `weekly:create` 工作流仍保留文件，但不再是新文档主流程
