# Weekly Workflow Archive

`automation/archive/` 只保存历史工作流材料，不是当前生产入口。

当前生产入口只认：

1. `automation/exchange/inbox/`
2. `automation/exchange/staging/<weekKey>/`
3. `automation/weekly/<weekKey>/source/`

归档分层：

1. `legacy-incoming/`
   - 旧 `automation/incoming/...` 单卡回流样本
2. `legacy-weekly-workspaces/`
   - 旧 `weekly:create` / `weekly:continue` 工作区
3. `legacy-transition-*.json`
   - 迁移期补充材料

新增生产流程资料不要再写入本目录，除非明确是历史归档。
