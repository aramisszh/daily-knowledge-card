# AI Podcast Handoff Template

这是 AI 播客交接文档模板，用于 Mac 端与 Windows 端之间传递本周播客生产信息。

当前文件仅提供占位结构，不代表完整周更流程已经实现，也不表示自动化链路已经全部打通。

## Purpose

- 记录本周播客批次的基本信息
- 约定交接包内应包含的文件
- 明确 Mac 端导出与 Windows 端回传的边界

## Batch Summary

- Week:
- Source card dates:
- Operator:
- Handoff created at:

## Expected Input Package

- `script.md`
- `script.srt`
- `podcast.meta.json`

## Expected Return Package

- `podcast.mp3`
- updated `podcast.meta.json`
- optional logs or notes

## Notes

- 不覆盖历史音频
- 不删除历史 transcript
- 发现异常时回交主模型处理
