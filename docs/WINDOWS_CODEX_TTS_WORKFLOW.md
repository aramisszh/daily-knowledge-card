# Windows Codex TTS Workflow Template

这是 Windows 端 AI 播客 TTS 工作流交接文档模板，用于说明本地音频生产步骤。

当前文件是模板骨架，不声称完整周更、主控脚本或生产自动化已经实现。

## Scope

- 仅面向 Windows 端本地音频生产
- 不修改网站源码
- 不执行 Git 提交、推送或部署

## Planned Steps

1. 接收 Mac 端交接包
2. 检查 `script.md`、`script.srt`、`podcast.meta.json`
3. 运行本地 TTS 或相关工作流生成音频
4. 导出 mp3 与基础元数据
5. 将 done 包回传给 Mac 端

## Expected Metadata

- duration
- sizeBytes
- checksum
- format
- bitrate

## Notes

- 不移动、删除、覆盖历史产物
- 异常处理策略由主模型补充
