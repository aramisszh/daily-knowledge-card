Mac 端收到 outbox 后的标准工作流应该是：

1. 接收 dkc-outbox zip
2. 解压到 staging 临时目录
3. 校验 manifest / weekId / cardId / 图片 / mp3 / transcript
4. 校验通过后导入 daily-knowledge-card 项目
5. 更新 data/cards.json 或项目现有数据索引
6. 更新 podcast / transcript / archive manifest
7. 本地预览检查
8. build / lint / typecheck
9. git commit
10. 部署或等待部署
11. 归档 outbox 与导入报告

Mac 端推荐文件夹规范如下：

daily-knowledge-card/
  automation/
    exchange/
      inbox/
        dkc-outbox__2026-W23__2026-06-01_to_2026-06-07.zip
      staging/
        2026-W23/
      processed/
        dkc-outbox__2026-W23__2026-06-01_to_2026-06-07.zip
      failed/
        dkc-outbox__2026-W23__2026-06-01_to_2026-06-07.zip

    weekly/
      2026-W23/
        source/
          weekly-plan.json
          cards-draft.json
          image-generation-report.json
          image-approval-report.json
          package-manifest.json
          handoff-to-mac.md
        outbox/
          windows-outbox-manifest.json
          tts-output-report.json
        reports/
          mac-import-report.md
          validation-report.json
        logs/
          mac-run-log.md

  public/
    generated-cards/
      2026-06-01-topic-slug.png

    audio/
      published/
        2026-06-01-topic-slug-podcast-v1.mp3

    transcripts/
      published/
        2026-06-01-topic-slug.md

    archive/
      outbox/
      audio/
      transcripts/
      generated-cards/

  data/
    cards.json
    podcast-manifest.json
    archive-manifest.json

  docs/
    MAC_CODEX_WEEKLY_WORKFLOW.md
    WINDOWS_CODEX_TTS_WORKFLOW.md
    AI_PODCAST_HANDOFF.md

  scripts/
    import-windows-outbox.mjs
    validate-weekly-assets.mjs
    archive-assets.mjs
    check-site-capacity.mjs

更简单地说，Mac 端只需要记住 5 类目录：

automation/exchange/inbox       接收 Windows outbox zip
automation/exchange/staging     临时解压校验，不能直接覆盖项目
public/generated-cards          正式知识图
public/audio/published          正式 mp3
public/transcripts/published    网页展示稿

Mac 端导入时的核心规则是：

图片进入 public/generated-cards/
mp3 进入 public/audio/published/
transcript.md 进入 public/transcripts/published/
weekly-plan / manifest / report 进入 automation/weekly/{weekId}/
原始 outbox zip 进入 automation/exchange/processed/ 或 public/archive/outbox/

不要把 Windows 端的这些东西导入前端：

flac
wav
临时切片
ComfyUI 缓存
script.md 作为网页文稿
带 [ctrl] / [spk1] / [spk2] 的内容
Windows 路径
中间日志

Mac 端的校验标准应固定为：

1. weekId、weekStart、weekEnd 全部一致
2. cardCount 与实际卡片数量一致
3. 每个 cardId 有图片
4. 每个 cardId 有 transcript.md
5. 每个 cardId 有 mp3
6. mp3 命名为 {cardId}-podcast-v1.mp3
7. transcript.md 不含 [ctrl]、[spk1]、[spk2]
8. 图片不含后台文件名、路径、JSON、zip、工作流说明
9. 不覆盖学习进度数据
10. build 通过后才 commit