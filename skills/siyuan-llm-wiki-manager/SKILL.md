---
name: siyuan-llm-wiki-manager
description: Manage an LLM Wiki knowledge system built on SiYuan Notes / 思源笔记. Use when the user asks to ingest new knowledge into a SiYuan-based LLM Wiki, search or audit SiYuan cards, create or update concept/source/project/question/map cards, maintain SiYuan custom attributes and block references, build a retrieval workbench, or evolve the LLM Wiki architecture and milestones.
---

# SiYuan LLM Wiki Manager

## Overview

Manage a personal LLM Wiki built on SiYuan Notes / 思源笔记. The skill turns raw inputs into reusable SiYuan cards, keeps relationships queryable through SiYuan `attributes` and `refs`, and grows the notebook toward a long-term LLM context layer.

Use the existing `siyuan-skill` when available for live SiYuan writes. Use this skill's scripts for read-only SQL inspection and audits.

## Required Context

Before making live changes, identify:

- SiYuan API access: `SIYUAN_BASE_URL` and `SIYUAN_TOKEN`.
- Target notebook: prefer `SIYUAN_LLM_WIKI_NOTEBOOK`; otherwise discover a notebook named `llm wiki`.
- Current structure: `00 收集箱`, `10 概念卡`, `20 来源笔记`, `30 项目知识`, `40 长期问题`, `80 模板`, `90 主题地图`.

For the public technical design, read `../../docs/siyuan-llm-wiki-architecture.md` when working in this repository. Treat the SiYuan `llm wiki` notebook as the source of truth for actual note content; do not maintain or commit LLM Wiki notes in this public GitHub repository. For SQL, read `references/sql-recipes.md`. For card formats, read `references/card-templates.md`.

## Core Workflow

1. **Collect.** Put raw material in `00 收集箱` or read it from the user's provided source.
2. **Extract.** Identify keywords, claims, sources, applicable projects, open questions, and likely existing concepts.
3. **Search first.** Query `90 主题地图`, then `10 概念卡`, `30 项目知识`, `40 长期问题`, and `20 来源笔记`.
4. **Decide insertion.**
   - Update an existing card when a close concept/project already exists.
   - Create a concept card when the material yields a reusable judgment.
   - Create a source card when the material is mainly evidence.
   - Update a project card when it changes action.
   - Update a question card when uncertainty remains.
5. **Write structure.** Use the templates and set `custom-*` attributes.
6. **Link intentionally.** Use SiYuan block references `((blockId "Title"))` for important relationships. Do not convert every mention into a block reference.
7. **Update maps.** Add important cards to the relevant theme map.
8. **Validate.** Confirm `attributes` and `refs` records exist when using live SiYuan.

## Card Attribute Rules

Use lowercase attribute names with hyphens only. The SiYuan API adds or expects `custom-` for custom attributes.

Recommended fields:

- `custom-type`: `concept`, `source`, `project`, `question`, `map`, `template`, `design`, `index`
- `custom-status`: `draft`, `stable`, `active`, `open`, `archived`, `template`
- `custom-confidence`: `high`, `medium`, `low`
- `custom-keywords`: pipe-separated keywords, e.g. `llm-wiki|rag|siyuan`
- `custom-template-for`: `concept`, `source`, `project`

## Live Write Protocol

When writing to SiYuan:

1. Use `siyuan-skill` CLI if it is available.
2. Create/update documents with complete Markdown content.
3. Set attributes after creating the document.
4. Re-read the affected document or query SQL to verify.
5. Never delete or overwrite existing user content unless explicitly asked.

Useful commands:

```bash
node "${CODEX_HOME:-$HOME/.codex}/skills/siyuan-skill/siyuan.js" search "关键词" --limit 10
node "${CODEX_HOME:-$HOME/.codex}/skills/siyuan-skill/siyuan.js" create "标题" "内容" --parent-id <parentId>
node "${CODEX_HOME:-$HOME/.codex}/skills/siyuan-skill/siyuan.js" update <docId> "完整 Markdown"
node "${CODEX_HOME:-$HOME/.codex}/skills/siyuan-skill/siyuan.js" attrs <docId> --set "type=concept,status=draft,keywords=..."
```

## Read-Only Audits

Use `scripts/siyuan-query.js` for repeatable SQL checks:

```bash
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js card-index
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards --type concept
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js search RAG
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js refs-to <blockId>
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js orphan-cards
```

The script is read-only and only calls `/api/query/sql`.

## Milestone Guidance

Manage the system by stage:

1. Structure landed: notebook, folders, basic cards, templates.
2. Native indexing: `custom-*` attributes and block refs.
3. Retrieval workbench: saved SQL views and audit queries.
4. Stable card production: 30 concept cards and 5 theme maps.
5. Semi-automatic ingestion: LLM suggests updates, user approves writes.
6. Semantic retrieval: add embeddings only after card volume justifies it.
7. Knowledge audit: detect stale, orphaned, low-confidence, and conflicting cards.

Prefer the next smallest useful milestone over broad automation.
