# personSkills

Personal Codex skills.

Canonical repository: <https://github.com/lightXXu/personSkills>

## Layout

```text
skills/
  <skill-name>/
    SKILL.md
    README.md
    agents/openai.yaml
    references/
    scripts/
docs/
scripts/
```

## Included Skills

- [`siyuan-skill`](skills/siyuan-skill/README.md): SiYuan Notes CLI tool for notebook, document, search, and block operations.
- [`siyuan-llm-wiki-manager`](skills/siyuan-llm-wiki-manager/README.md) ([中文](skills/siyuan-llm-wiki-manager/README.zh-CN.md)): Manage an LLM Wiki knowledge system built on SiYuan Notes / 思源笔记.

## Install Locally

Install a skill into Codex's user skill directory:

```bash
mkdir -p "$HOME/.codex/skills/siyuan-llm-wiki-manager"
rsync -a --exclude '.DS_Store' \
  skills/siyuan-llm-wiki-manager/ \
  "$HOME/.codex/skills/siyuan-llm-wiki-manager/"
```

## Public Boundary

This public repository should contain only GitHub-safe skill materials: instructions, read-only scripts, templates, SQL recipes, and public technical design. Actual LLM Wiki notes stay in the SiYuan `llm wiki` notebook and should not be maintained or committed here.

## Notes

This repository intentionally keeps skills self-contained. Each skill should carry only the instructions, references, and scripts needed by an agent to perform the work.
