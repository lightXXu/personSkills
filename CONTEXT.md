# Repository Context

This repository stores reusable Codex skills.

Skill folders live under `skills/`. Each skill should include a required `SKILL.md` and may include:

- `agents/openai.yaml` for UI metadata;
- `references/` for longer optional context;
- `scripts/` for deterministic helper commands.

Keep root-level documentation short. Put task-specific knowledge inside the relevant skill.

## SiYuan LLM Wiki Boundary

- `skills/siyuan-llm-wiki-manager` is a public skill for operating a SiYuan-based LLM Wiki.
- `docs/siyuan-llm-wiki-architecture.md` stores the public technical plan copied from the local LLM Wiki project card.
- Do not maintain or commit the actual LLM Wiki note contents in this repository. The source of truth for notes is the SiYuan `llm wiki` notebook.
- Keep GitHub-safe materials only: skill instructions, read-only scripts, templates, SQL recipes, and public technical design.
