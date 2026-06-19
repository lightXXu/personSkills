---
name: siyuan-llm-wiki-manager
description: Manage an LLM Wiki knowledge system built on SiYuan Notes / 思源笔记. Use when the user asks to ingest new knowledge into a SiYuan-based LLM Wiki, search or audit SiYuan cards, create or update concept/source/project/question/map cards, maintain SiYuan custom attributes and block references, build a retrieval workbench, or evolve the LLM Wiki architecture and milestones.
---

# SiYuan LLM Wiki Manager

## Overview

Manage a personal SiYuan-native LLM Wiki built on SiYuan Notes / 思源笔记. The SiYuan `llm wiki` notebook is the source of truth: concept, source, project, question, map, and template cards are the compiled Wiki pages. Markdown is only an interchange, draft, or write format, not a second long-term Wiki storage layer.

The skill turns raw inputs into reusable SiYuan cards, keeps relationships queryable through SiYuan `attributes` and `refs`, and grows the notebook toward a long-term LLM context layer.

Use the existing `siyuan-skill` when available for live SiYuan writes. Use this skill's scripts for read-only SQL inspection and audits.

## Required Context

Before making live changes, identify:

- SiYuan API access: `SIYUAN_BASE_URL` and `SIYUAN_TOKEN`.
- Target notebook: prefer `SIYUAN_LLM_WIKI_NOTEBOOK`; otherwise discover a notebook named `llm wiki`.
- Current structure: `00 收集箱`, `10 概念卡`, `20 来源笔记`, `30 项目知识`, `40 长期问题`, `80 模板`, `90 主题地图`.

For the public technical design, read `../../docs/siyuan-llm-wiki-architecture.md` when working in this repository. Treat the SiYuan `llm wiki` notebook as the source of truth for actual note content; do not maintain or commit LLM Wiki notes in this public GitHub repository. Public repository content should stay limited to skill code, templates, scripts, SQL recipes, and technical design. For SQL, read `references/sql-recipes.md`. For card formats, read `references/card-templates.md`.

## Core Workflow

1. **Detect source change.** Read new material from `00 收集箱`, a user-provided source, or an explicitly changed card.
2. **Extract.** Identify keywords, claims, sources, applicable projects, open questions, possible stale cards, and conflict notes.
3. **Search first.** Query `90 主题地图`, then `10 概念卡`, `30 项目知识`, `40 长期问题`, and `20 来源笔记` before drafting anything new.
4. **Compare.** Decide whether to update an existing card, create a new card, mark a card `stale`, or record conflict/replacement context in a card body section.
5. **Propose.** Generate a concise update proposal that names affected cards, new cards, status changes, block refs, and map updates.
6. **Ask before writes.** Do not write to SiYuan, overwrite card content, or change attributes until the user explicitly approves the proposal.
7. **Write structure.** Use the templates and set the minimal `custom-*` attributes after approval.
8. **Link intentionally.** Use SiYuan block references `((blockId "Title"))` for important relationships. Do not convert every mention into a block reference.
9. **Validate.** Confirm `attributes` and important `refs` records exist when using live SiYuan.
10. **Maintain maps and audits.** Update relevant theme maps and note follow-up audit items when a card is stale, low-confidence, orphaned, or missing sources.

## Card Attribute Rules

Use lowercase attribute names with hyphens only. The SiYuan API adds or expects `custom-` for custom attributes.

Recommended fields:

- `custom-type`: `concept`, `source`, `project`, `question`, `map`, `template`
- `custom-status`: `draft`, `active`, `stable`, `stale`, `archived`
- `custom-confidence`: `high`, `medium`, `low`
- `custom-keywords`: pipe-separated keywords, e.g. `llm-wiki|siyuan|context`
- `custom-template-for`: `concept`, `source`, `project`, `question`, `map`

Keep relationships minimal in the first loop: use SiYuan block references `((blockId "Title"))` for important links. Record conflicts, replacement notes, and decision sources in card body sections such as `反证 / 风险` or `当前判断` before promoting them to custom attributes.

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
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js search "LLM Wiki"
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js refs-to <blockId>
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js orphan-cards
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards-by-status --status stale
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js cards-by-keyword --keyword llm-wiki
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js old-active-cards --days 30
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js preflight
node skills/siyuan-llm-wiki-manager/scripts/siyuan-query.js topic-summary "AI Coding / Agent 工作方式"
```

The script is read-only and only calls `/api/query/sql`.

Use `preflight` before live read or write workflows when environment state is uncertain. It checks SiYuan connectivity, SQL read access, target notebook availability, standard folder presence, and core card attributes without writing any data.

Treat `topic-summary` as a runtime retrieval view: it returns related typed cards plus evidence snippets for the requested topic, but it must not be treated as a new persisted card type or written back to SiYuan by default.

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
