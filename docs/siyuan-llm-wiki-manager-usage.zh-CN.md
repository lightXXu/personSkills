# SiYuan LLM Wiki Manager 使用说明

[English](siyuan-llm-wiki-manager-usage.md)

## 定位

`siyuan-llm-wiki-manager` 用于维护一个基于思源笔记的 SiYuan-native LLM Wiki。正式知识内容保存在思源 `llm wiki` 笔记本中；本仓库只保存 skill 指令、模板、只读审计脚本、SQL recipes 和公开技术设计。

## 最小模型

```text
custom-type:
concept / source / project / question / map / template

custom-status:
draft / active / stable / stale / archived
```

关系先保持轻量：重要关系使用思源块引用 `((blockId "Title"))`。冲突、替代说明和决策依据先写进卡片正文，例如 `反证 / 风险` 或 `当前判断`，暂不新增 custom relation attributes。

## 适用场景

适合用于：

- 把文章、笔记、访谈、项目上下文或研究问题整理进 LLM Wiki；
- 创建或更新 concept/source/project/question/map 卡片；
- 新增知识前先搜索已有卡片；
- 审计 stale、low-confidence、orphaned 或长期 active 的卡片；
- 演进思源 LLM Wiki 的结构和技术方案。

示例 prompts：

```text
用 siyuan-llm-wiki-manager 把这篇文章整理进 llm wiki
查一下 llm wiki 里的 LLM Wiki 概念卡
审计一下 stale cards
根据这段材料生成写入思源前的更新 proposal
```

## 安装到 Codex

从本仓库安装到 Codex 用户级 skill 目录：

```bash
mkdir -p "$HOME/.codex/skills/siyuan-llm-wiki-manager"
rsync -a --exclude '.DS_Store' \
  skills/siyuan-llm-wiki-manager/ \
  "$HOME/.codex/skills/siyuan-llm-wiki-manager/"
```

## 环境设置

只读审计脚本需要：

```bash
export SIYUAN_BASE_URL="http://localhost:6806"
export SIYUAN_TOKEN="<your-token-if-needed>"
export SIYUAN_LLM_WIKI_NOTEBOOK="<notebook-id>"
```

也可以创建一个用户级配置文件：

```bash
mkdir -p ~/.config/personSkills
printf '%s\n' '{"notebook":"<notebook-id>","baseURL":"http://localhost:6806"}' > ~/.config/personSkills/siyuan-llm-wiki.json
```

notebook 解析优先级是：`--box`、`SIYUAN_LLM_WIKI_NOTEBOOK`、`~/.config/personSkills/siyuan-llm-wiki.json`。

实时写入思源时，优先使用单独的 `siyuan-skill` CLI。写入、覆盖内容或修改属性前，应先得到明确确认。

## 只读审计

以下命令只调用思源 `/api/query/sql`：

```bash
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js card-index
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards --type concept
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards-by-status --status stale
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js stale-cards
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards-by-keyword --keyword llm-wiki
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js old-active-cards --days 30
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js refs-to <blockId>
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js orphan-cards
```

使用 `--box <notebookId>` 可以为单次命令覆盖环境变量中的 notebook id。

## 工作流

新增或变更材料时：

1. 检测来源变化。
2. 提取 claims、keywords、sources、projects、questions 和可能 stale 的卡片。
3. 先搜索已有地图和卡片。
4. 与已有卡片对比。
5. 生成简洁的更新 proposal。
6. 写入思源前先确认。
7. 用模板写入，并设置最小 `custom-*` 属性。
8. 添加关键块引用。
9. 用 SQL 验证 attributes 和 refs。
10. 更新主题地图或留下审计 follow-up。

## 模板

模板位置：

```text
skills/siyuan-llm-wiki-manager/references/card-templates.md
```

当前覆盖：

- Concept Card
- Source Card
- Project Card
- Question Card
- Map Card

## 公开边界

不要提交：

- 真实思源笔记内容；
- 本地 notebook 导出；
- token 或本地 API 凭据；
- 从 `llm wiki` 笔记本复制出来的私有来源材料。

可以提交：

- skill 指令；
- 模板；
- 只读脚本；
- SQL recipes；
- 公开技术设计。
