# LLM Wiki Architecture

## Terminal Shape

The target system is not a traditional RAG pipeline and not a folder taxonomy. It is a long-term personal context system on top of SiYuan.

```text
input layer
  -> processing layer
  -> knowledge layer
  -> index layer
  -> retrieval layer
  -> collaboration layer
```

## Layers

| Layer | Purpose | Examples |
|---|---|---|
| Input | Catch new material | manual notes, clips, conversations, project logs |
| Processing | Turn material into reusable knowledge | summaries, concept extraction, claims, confidence |
| Knowledge | Store durable objects | concept cards, source cards, project cards, question cards, maps |
| Index | Make knowledge machine-queryable | `blocks`, `attributes`, `refs`, FTS, optional vectors |
| Retrieval | Build task context | SQL, backlinks, maps, optional semantic search |
| Collaboration | Let LLM assist maintenance | search, suggest placement, draft cards, user-approved writes |

## Directory Mapping

| Directory | Terminal Object | Role |
|---|---|---|
| `00 收集箱` | input layer | raw and temporary input |
| `10 概念卡` | concept cards | reusable judgments and boundaries |
| `20 来源笔记` | source cards | evidence, summaries, citations |
| `30 项目知识` | project cards | goals, decisions, actions |
| `40 长期问题` | question cards | unresolved or research questions |
| `80 模板` | processing rules | card structures and required fields |
| `90 主题地图` | navigation layer | topic context and LLM entry points |

## Principles

- Directories are entry points, not the only index.
- Maps are context routers for humans and LLMs.
- Concept cards store interpretation; source cards store evidence.
- Project cards turn knowledge into action.
- `attributes` store machine-readable classification.
- `refs` store real graph relationships.
- SQL is the first retrieval layer.
- Vector search is an optional recall booster, not the system core.
