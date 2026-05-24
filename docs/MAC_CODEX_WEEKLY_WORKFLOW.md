# MAC_CODEX_WEEKLY_WORKFLOW.md

## 0. 文档用途

本文档定义 `daily-knowledge-card` 当前标准的 Mac 端 weekly 收口流程。

这是当前仓库内 3 端工作流的最新正式版本：

1. ChatGPT web 负责周包内容产出。
2. Windows 负责音频生产。
3. Mac 负责收件、校验、导入、验证、本地提交准备。

当前标准不是 “Mac 端生成 weekly 内容”，而是：

```text
外部周包产出完成
↓
放入 automation/exchange/inbox/
↓
Mac 端 Codex 接收、校验、导入、发布、归档
```

Windows 端只负责音频生产，不负责网站源码发布。

---

## 1. Mac 端职责

Mac 端 Codex 现在只负责：

1. 接收 ChatGPT 网页端和 Windows 端已经产出的周包。
2. 校验 `weekly-plan.json`、`cards-draft.json`、图片、音频、transcript、metadata 是否匹配。
3. 把图片导入 `public/generated-cards/`。
4. 把 mp3 导入 `public/audio/published/`。
5. 把 transcript 导入 `public/transcripts/published/`。
6. 把 `cards-draft.json` 合并进 `data/cards.json`。
7. 更新 `data/podcast-manifest.json`。
8. 在归档状态变化时更新 `data/archive-manifest.json`。
9. 执行测试、构建、容量检查。
10. 在用户明确要求时继续提交、推送、部署。

一句话总结：

Mac 端的正式任务就是把外部已经完成的周包安全地收进仓库、落到站点发布位、跑完本地校验，并把仓库推进到可提交可发布状态。

Mac 端 Codex 不再负责：

1. 生成选题。
2. 生成知识卡正文。
3. 生成 `image2` 提示词。
4. 生成播客脚本。

---

## 2. 标准目录结构

```text
automation/
  exchange/
    inbox/
      dkc-handoff__2026-W22__2026-05-25_to_2026-05-31.zip
    staging/
      2026-W22/
    processed/
    failed/
  weekly/
    2026-W22/
      source/
        weekly-plan.json
        cards-draft.json
        package-manifest.json
        images/
          raw/
            2026-05-25-topic-a.png
        podcast_jobs/
          done/
            2026-05-25-topic-a/
              script.md
              script.srt
              transcript.md
              podcast.meta.json
              2026-05-25-topic-a-podcast-v1.mp3
      outbox/
        tts-output-report.json
      reports/
        mac-import-report.md
        validation-report.json
      logs/
        mac-run-log.md
  archive/
    legacy-incoming/
    legacy-weekly-workspaces/

public/
  generated-cards/
  audio/
    published/
  transcripts/
    published/
  archive/
    audio/
    transcripts/
    generated-cards/

data/
  cards.json
  podcast-manifest.json
  archive-manifest.json
```

说明：

1. `automation/exchange/inbox/` 是当前唯一标准输入目录。
2. `automation/exchange/staging/<weekKey>/` 只用于临时解压和校验，不直接作为发布位。
3. `automation/weekly/<weekKey>/source/` 是当前标准化后的周工作区。
4. `automation/exchange/processed/` 和 `automation/exchange/failed/` 保存收件证据。
5. `data/cards.json` 仍是站点内容真源。
6. `public/generated-cards/`、`public/audio/published/`、`public/transcripts/published/` 是发布位。

历史归档：

- `automation/archive/legacy-incoming/`
- `automation/archive/legacy-weekly-workspaces/`
- `docs/archive/weekly-workflow-history/`
- `npm run legacy:weekly:create`
- `npm run legacy:weekly:continue`

这些旧路径、旧脚本、旧设计资料只保留兼容和历史证据，不是标准工作流，不应继续扩展。

---

## 3. 标准命令

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

1. `npm run weekly:receive -- <weekKey>`
   - 从 `automation/exchange/inbox/` 读取 handoff zip
   - 解压到 `automation/exchange/staging/<weekKey>/`
   - 生成或更新 `automation/weekly/<weekKey>/source/weekly-plan.json`
2. `npm run weekly:publish -- <weekKey>`
   - 从 `automation/weekly/<weekKey>/source/` 导入图片
   - 导入音频和 transcript
   - 合并 `data/cards.json`
   - 更新 `data/podcast-manifest.json`
   - 写入 `automation/weekly/<weekKey>/reports/mac-import-report.md`
3. `npm run weekly:validate`
   - 校验当前发布状态和 manifest 一致性
4. `npm run site:capacity`
   - 检查站点静态资源容量

---

## 4. 标准执行顺序

收到一周素材后，Mac 端按下面顺序执行：

1. 用户把外部 handoff zip 放入 `automation/exchange/inbox/`。
2. 运行：

```bash
npm run weekly:receive -- 2026-W22
```

3. 运行：

```bash
npm run weekly:publish -- 2026-W22
```

4. 运行：

```bash
npm run weekly:validate
npm run site:capacity
npm test
npm run typecheck
npm run build
```

5. 全部通过后，如果用户要求继续发布，再做 Git 提交、推送和部署检查。

---

## 5. 校验要求

Mac 端发布前后必须检查：

1. `cards-draft.json` 中每张卡字段完整。
2. 每张卡图片都能对应到 `source/images/raw/<cardId>.png` 或 `source/image-assets/<cardId>.png`。
3. 每个 done 音频包都包含：
   - `transcript.md`
   - `podcast.meta.json`
   - `<cardId>-podcast-v<version>.mp3`
4. 发布后每个 `imageUrl`、`audioUrl`、`transcriptUrl` 都必须落到真实文件。
5. `data/podcast-manifest.json` 必须与 `data/cards.json` 的 published podcast 信息一致。
6. `transcript.md` 不能包含 `[ctrl]`、`[spk1]`、`[spk2]` 这类 TTS 中间标签。
7. 中文文本写回 `data/cards.json` 后必须重新读取检查，不能出现 `??`、`�` 或明显 mojibake。

---

## 6. 发布边界

以下动作不自动进行，仍需用户明确要求：

1. `git push`
2. 生产部署
3. 删除旧周包
4. 清理历史 archive

归档原则：

1. 优先保留原始周包证据。
2. 不隐式删除输入素材。
3. 不覆盖已有 archive 文件。
