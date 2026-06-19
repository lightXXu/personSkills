# SiYuan LLM Wiki Manager Usage Guide

[简体中文](README.zh-CN.md)

## Purpose

`siyuan-llm-wiki-manager` helps maintain a SiYuan-native LLM Wiki. The official knowledge lives in the SiYuan `llm wiki` notebook. This repository only stores skill instructions, templates, read-only audit scripts, SQL recipes, and public technical design.

## Minimal Model

```text
custom-type:
concept / source / project / question / map / template

custom-status:
draft / active / stable / stale / archived
```

Keep relationships lightweight at first: use SiYuan block refs `((blockId "Title"))` for important links. Record conflicts, replacement notes, and decision sources in card body sections such as `反证 / 风险` or `当前判断` before adding custom relation attributes.

## When To Use

Use this skill to:

- ingest articles, notes, transcripts, project context, or research questions into the LLM Wiki;
- create or update concept/source/project/question/map cards;
- search existing cards before adding new knowledge;
- audit stale, low-confidence, orphaned, or old active cards;
- evolve the SiYuan LLM Wiki structure and technical design.

Example prompts:

```text
用 siyuan-llm-wiki-manager 把这篇文章整理进 llm wiki
查一下 llm wiki 里的 LLM Wiki 概念卡
审计一下 stale cards
根据这段材料生成写入思源前的更新 proposal
```

## Install In Codex

Install this repository copy into Codex's user-level skill directory:

```bash
mkdir -p "$HOME/.codex/skills/siyuan-llm-wiki-manager"
rsync -a --exclude '.DS_Store' \
  skills/siyuan-llm-wiki-manager/ \
  "$HOME/.codex/skills/siyuan-llm-wiki-manager/"
```

## Setup

For read-only audit scripts, set:

```bash
export SIYUAN_BASE_URL="http://localhost:6806"
export SIYUAN_TOKEN="<your-token-if-needed>"
export SIYUAN_LLM_WIKI_NOTEBOOK="<notebook-id>"
```

You can also create a user-level config file:

```bash
mkdir -p ~/.config/personSkills
printf '%s\n' '{"notebook":"<notebook-id>","baseURL":"http://localhost:6806"}' > ~/.config/personSkills/siyuan-llm-wiki.json
```

Notebook resolution order is: `--box`, `SIYUAN_LLM_WIKI_NOTEBOOK`, then `~/.config/personSkills/siyuan-llm-wiki.json`.

For live writes, use the separate `siyuan-skill` CLI when available. Writes, overwrites, and attribute changes should happen only after explicit approval.

## Read-Only Audits

The following commands only call SiYuan `/api/query/sql`:

```bash
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js preflight
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js card-index
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards --type concept
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards-by-status --status stale
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js stale-cards
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards-by-keyword --keyword llm-wiki
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js old-active-cards --days 30
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js refs-to <blockId>
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js orphan-cards
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js topic-summary "AI Coding / Agent 工作方式"
```

Use `--box <notebookId>` to override the notebook id for one command.

Use `preflight` before live read or write workflows when the local environment is uncertain. It checks SiYuan connectivity, SQL read access, the target notebook, standard folders, and core card attributes without writing data.

Use `topic-summary` as a runtime retrieval view. It returns matched typed cards and evidence snippets grouped by root card, including each snippet's `root_id`, but it does not create or update notes.

## Card Workflow

For new or changed material:

1. Detect the source change.
2. Extract claims, keywords, sources, projects, questions, and possible stale cards.
3. Search existing maps and cards first.
4. Compare against existing cards.
5. Generate a concise update proposal.
6. Ask for approval before writing to SiYuan.
7. Write with templates and minimal `custom-*` attributes.
8. Add important block refs.
9. Verify attributes and refs with SQL.
10. Update maps or leave audit follow-ups.

## Templates

Card templates live in:

```text
skills/siyuan-llm-wiki-manager/references/card-templates.md
```

The current templates cover:

- Concept Card
- Source Card
- Project Card
- Question Card
- Map Card

## Public Boundary

Do not commit:

- real SiYuan note contents;
- local notebook exports;
- tokens or local API credentials;
- private source material copied from the `llm wiki` notebook.

Safe to commit:

- skill instructions;
- templates;
- read-only scripts;
- SQL recipes;
- public technical design.
