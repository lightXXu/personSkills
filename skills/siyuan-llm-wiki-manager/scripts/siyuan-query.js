#!/usr/bin/env node

const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");

const localConfig = loadLocalConfig();
const baseURL = process.env.SIYUAN_BASE_URL || localConfig.baseURL || "http://localhost:6806";
const token = process.env.SIYUAN_TOKEN || "";
const notebook = process.env.SIYUAN_LLM_WIKI_NOTEBOOK || localConfig.notebook || "";

function usage() {
  console.log(`Usage:
  siyuan-query.js tables
  siyuan-query.js preflight [--box <notebookId>]
  siyuan-query.js card-index [--box <notebookId>]
  siyuan-query.js cards --type <concept|source|project|question|map|template> [--box <notebookId>]
  siyuan-query.js search <keyword> [--box <notebookId>]
  siyuan-query.js refs-to <blockId> [--box <notebookId>]
  siyuan-query.js low-confidence [--box <notebookId>]
  siyuan-query.js untyped [--box <notebookId>]
  siyuan-query.js orphan-cards [--box <notebookId>]
  siyuan-query.js cards-by-status --status <draft|active|stable|stale|archived> [--box <notebookId>]
  siyuan-query.js stale-cards [--box <notebookId>]
  siyuan-query.js cards-by-keyword --keyword <keyword> [--box <notebookId>]
  siyuan-query.js old-active-cards [--days 30] [--box <notebookId>]
  siyuan-query.js recent [--limit 20] [--box <notebookId>]
  siyuan-query.js topic-summary <topic> [--limit 12] [--box <notebookId>]

Environment:
  SIYUAN_BASE_URL              default: http://localhost:6806
  SIYUAN_TOKEN                 required if SiYuan auth is enabled
  SIYUAN_LLM_WIKI_NOTEBOOK     preferred notebook id

Local config:
  ~/.config/personSkills/siyuan-llm-wiki.json
                                {"notebook":"<notebookId>","baseURL":"http://localhost:6806"}
`);
}

function loadLocalConfig() {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  const configPath = path.join(configDir, "personSkills", "siyuan-llm-wiki.json");
  if (!fs.existsSync(configPath)) return {};

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    throw new Error(`Failed to read ${configPath}: ${error.message}`);
  }
}

function argValue(name, fallback = "") {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback;
}

function sqlString(value) {
  return String(value).replace(/'/g, "''");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function topicTerms(topic) {
  const normalized = String(topic).trim();
  const parts = normalized
    .split(/[\s,，;；/／|｜]+/u)
    .map(part => part.trim())
    .filter(part => part.length >= 2);
  return unique([normalized, ...parts]);
}

function keywordMatches(keywords, terms) {
  const value = String(keywords || "").toLowerCase();
  return terms.some(term => value.includes(String(term).toLowerCase()));
}

function dedupeById(rows) {
  const rowsById = new Map();
  for (const row of rows) {
    if (!rowsById.has(row.id)) rowsById.set(row.id, row);
  }
  return [...rowsById.values()];
}

function dedupeSnippetsByRoot(rows) {
  const rowsByRootAndId = new Map();
  for (const row of rows) {
    const key = `${row.root_id}:${row.id}`;
    if (!rowsByRootAndId.has(key)) rowsByRootAndId.set(key, row);
  }
  return [...rowsByRootAndId.values()];
}

function groupByCard(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.root_id)) grouped.set(row.root_id, []);
    grouped.get(row.root_id).push({
      id: row.id,
      root_id: row.root_id,
      type: row.type,
      content: row.content,
      updated: row.updated,
    });
  }
  return grouped;
}

function groupCardsByType(cards) {
  const grouped = {};
  for (const card of cards) {
    const type = card.card_type || "unknown";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(card);
  }
  return grouped;
}

function typeRank(type) {
  return {
    map: 1,
    concept: 2,
    project: 3,
    question: 4,
    source: 5,
  }[type] || 9;
}

function cutoffUpdated(days) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const pad = value => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function getBox() {
  const box = argValue("--box", notebook);
  if (!box) {
    throw new Error("Missing notebook id. Pass --box, set SIYUAN_LLM_WIKI_NOTEBOOK, or create ~/.config/personSkills/siyuan-llm-wiki.json.");
  }
  return box;
}

function requestedBox() {
  return argValue("--box", notebook);
}

function overallStatus(checks) {
  if (checks.some(check => check.status === "fail")) return "fail";
  if (checks.some(check => check.status === "warn")) return "warn";
  return "ok";
}

async function check(name, fn) {
  try {
    return {
      name,
      status: "ok",
      ...(await fn()),
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      message: error.message,
    };
  }
}

async function post(endpoint, data) {
  const url = new URL(endpoint, baseURL);
  const payload = JSON.stringify(data || {});
  const transport = url.protocol === "https:" ? https : http;

  return await new Promise((resolve, reject) => {
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body || "{}");
          if (parsed.code !== undefined && parsed.code !== 0) {
            reject(new Error(parsed.msg || `SiYuan API error code=${parsed.code}`));
          } else {
            resolve(parsed.data !== undefined ? parsed.data : parsed);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}\n${body.slice(0, 500)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function query(stmt) {
  return await post("/api/query/sql", { stmt });
}

function print(rows) {
  console.log(JSON.stringify(rows, null, 2));
}

async function preflight() {
  const box = requestedBox();
  const expectedFolders = [
    "/00 收集箱",
    "/10 概念卡",
    "/20 来源笔记",
    "/30 项目知识",
    "/40 长期问题",
    "/80 模板",
    "/90 主题地图",
  ];

  const checks = [];
  checks.push(await check("siyuan-connection", async () => {
    const version = await post("/api/system/version", {});
    return { baseURL, version };
  }));

  checks.push(await check("sql-read", async () => {
    const rows = await query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name LIMIT 5");
    return { tableSample: rows.map(row => row.name) };
  }));

  if (!box) {
    checks.push({
      name: "notebook-config",
      status: "fail",
      message: "Missing notebook id. Pass --box, set SIYUAN_LLM_WIKI_NOTEBOOK, or create ~/.config/personSkills/siyuan-llm-wiki.json.",
    });
  } else {
    const safeBox = sqlString(box);
    checks.push(await check("notebook", async () => {
      const rows = await query(`
SELECT box, COUNT(*) AS block_count
FROM blocks
WHERE box = '${safeBox}'
GROUP BY box`);
      if (!rows.length) {
        return {
          status: "fail",
          notebook: box,
          message: "No blocks found for notebook id.",
        };
      }
      return { notebook: box, blockCount: rows[0].block_count };
    }));

    checks.push(await check("standard-folders", async () => {
      const inList = expectedFolders.map(folder => `'${sqlString(folder)}'`).join(", ");
      const rows = await query(`
SELECT hpath
FROM blocks
WHERE box = '${safeBox}'
  AND type = 'd'
  AND hpath IN (${inList})
ORDER BY hpath`);
      const found = rows.map(row => row.hpath);
      const missing = expectedFolders.filter(folder => !found.includes(folder));
      return {
        status: missing.length ? "warn" : "ok",
        found,
        missing,
      };
    }));

    checks.push(await check("card-attributes", async () => {
      const rows = await query(`
SELECT name, COUNT(*) AS count
FROM attributes
WHERE box = '${safeBox}'
  AND name IN ('custom-type', 'custom-status', 'custom-keywords')
GROUP BY name
ORDER BY name`);
      const counts = Object.fromEntries(rows.map(row => [row.name, row.count]));
      const missing = ["custom-type", "custom-status", "custom-keywords"].filter(name => !counts[name]);
      return {
        status: missing.length ? "warn" : "ok",
        counts,
        missing,
      };
    }));
  }

  return {
    command: "preflight",
    mode: "read-only",
    canWrite: false,
    baseURL,
    notebook: box || null,
    hasToken: Boolean(token),
    config: {
      hasLocalConfig: Boolean(localConfig.baseURL || localConfig.notebook),
      hasEnvBaseURL: Boolean(process.env.SIYUAN_BASE_URL),
      hasEnvNotebook: Boolean(process.env.SIYUAN_LLM_WIKI_NOTEBOOK),
      hasEnvToken: Boolean(process.env.SIYUAN_TOKEN),
    },
    status: overallStatus(checks),
    checks,
  };
}

async function topicSummary(box, topic, limit) {
  const terms = topicTerms(topic);
  if (!terms.length) throw new Error("topic-summary requires a topic");

  const keywordCards = [];
  const titleCards = [];
  for (const term of terms) {
    const value = sqlString(term);
    keywordCards.push(...await query(`
SELECT b.id,
       b.content AS title,
       t.value AS card_type,
       s.value AS status,
       k.value AS keywords,
       b.hpath,
       b.updated
FROM attributes t
JOIN blocks b ON b.id = t.block_id
LEFT JOIN attributes s ON s.block_id = b.id AND s.name = 'custom-status'
JOIN attributes k ON k.block_id = b.id AND k.name = 'custom-keywords'
WHERE t.box = '${box}'
  AND t.name = 'custom-type'
  AND t.value IN ('map', 'concept', 'project', 'question', 'source')
  AND (
    k.value = '${value}'
    OR k.value LIKE '${value}|%'
    OR k.value LIKE '%|${value}|%'
    OR k.value LIKE '%|${value}'
    OR k.value LIKE '%${value}%'
  )
ORDER BY b.updated DESC, b.hpath
LIMIT ${limit * 3}`));

    titleCards.push(...await query(`
SELECT b.id,
       b.content AS title,
       t.value AS card_type,
       s.value AS status,
       k.value AS keywords,
       b.hpath,
       b.updated
FROM attributes t
JOIN blocks b ON b.id = t.block_id
LEFT JOIN attributes s ON s.block_id = b.id AND s.name = 'custom-status'
LEFT JOIN attributes k ON k.block_id = b.id AND k.name = 'custom-keywords'
WHERE t.box = '${box}'
  AND t.name = 'custom-type'
  AND t.value IN ('map', 'concept', 'project', 'question', 'source')
  AND (b.content LIKE '%${value}%' OR b.hpath LIKE '%${value}%')
ORDER BY b.updated DESC, b.hpath
LIMIT ${limit * 3}`));
  }

  const cards = dedupeById([...keywordCards, ...titleCards]);

  const rankedCards = cards
    .map(card => ({
      ...card,
      match_rank: keywordMatches(card.keywords || "", terms) ? 1 : 2,
    }))
    .sort((left, right) =>
      left.match_rank - right.match_rank
      || typeRank(left.card_type) - typeRank(right.card_type)
      || String(right.updated).localeCompare(String(left.updated))
      || String(left.hpath).localeCompare(String(right.hpath)))
    .slice(0, limit);

  let snippetsByCard = new Map();
  if (rankedCards.length) {
    const ids = rankedCards.map(card => `'${sqlString(card.id)}'`).join(", ");
    const snippetRows = [];
    for (const term of terms) {
      const value = sqlString(term);
      snippetRows.push(...await query(`
SELECT id, root_id, type, content, updated
FROM blocks
WHERE box = '${box}'
  AND root_id IN (${ids})
  AND type IN ('p', 'i', 'l', 'h')
  AND content LIKE '%${value}%'
ORDER BY root_id, updated DESC
LIMIT ${limit * 8}`));
    }
    snippetsByCard = groupByCard(dedupeSnippetsByRoot(snippetRows));
  }

  const evidence = rankedCards.map(card => ({
    card_id: card.id,
    title: card.title,
    card_type: card.card_type,
    status: card.status || null,
    keywords: card.keywords || null,
    hpath: card.hpath,
    updated: card.updated,
    snippets: (snippetsByCard.get(card.id) || []).slice(0, 5),
  }));

  return {
    topic,
    mode: "read-only",
    description: "Runtime topic summary input. This command only queries SiYuan SQL and does not create, update, or delete notes.",
    query: {
      terms,
      limit,
      matchedCards: rankedCards.length,
    },
    relatedCards: groupCardsByType(rankedCards),
    evidence,
  };
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "-h" || command === "--help") {
    usage();
    return;
  }

  if (command === "preflight") {
    return print(await preflight());
  }

  const box = command === "tables" ? "" : sqlString(getBox());

  if (command === "tables") {
    return print(await query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"));
  }

  if (command === "card-index") {
    return print(await query(`
SELECT a.block_id, b.content AS title, a.value AS card_type, b.hpath
FROM attributes a
JOIN blocks b ON a.block_id = b.id
WHERE a.box = '${box}'
  AND a.name = 'custom-type'
ORDER BY a.value, b.hpath`));
  }

  if (command === "cards") {
    const type = sqlString(argValue("--type"));
    if (!type) throw new Error("cards requires --type");
    return print(await query(`
SELECT b.id, b.content AS title, b.hpath, b.updated
FROM attributes a
JOIN blocks b ON a.block_id = b.id
WHERE a.box = '${box}'
  AND a.name = 'custom-type'
  AND a.value = '${type}'
ORDER BY b.hpath`));
  }

  if (command === "search") {
    const keyword = sqlString(process.argv[3] || "");
    if (!keyword) throw new Error("search requires a keyword");
    return print(await query(`
SELECT id, content, type, hpath, root_id, updated
FROM blocks
WHERE box = '${box}'
  AND content LIKE '%${keyword}%'
ORDER BY updated DESC
LIMIT 30`));
  }

  if (command === "refs-to") {
    const blockId = sqlString(process.argv[3] || "");
    if (!blockId) throw new Error("refs-to requires a block id");
    return print(await query(`
SELECT r.root_id, src.content AS source_doc, src.hpath, r.content, r.markdown
FROM refs r
LEFT JOIN blocks src ON src.id = r.root_id
WHERE r.box = '${box}'
  AND r.def_block_id = '${blockId}'
ORDER BY src.hpath`));
  }

  if (command === "low-confidence") {
    return print(await query(`
SELECT b.id, b.content AS title, b.hpath
FROM attributes a
JOIN blocks b ON a.block_id = b.id
WHERE a.box = '${box}'
  AND a.name = 'custom-confidence'
  AND a.value = 'low'
ORDER BY b.hpath`));
  }

  if (command === "untyped") {
    return print(await query(`
SELECT b.id, b.content AS title, b.hpath
FROM blocks b
LEFT JOIN attributes a ON a.block_id = b.id AND a.name = 'custom-type'
WHERE b.box = '${box}'
  AND b.type = 'd'
  AND a.block_id IS NULL
ORDER BY b.hpath`));
  }

  if (command === "orphan-cards") {
    return print(await query(`
SELECT b.id, b.content AS title, t.value AS card_type, b.hpath
FROM attributes t
JOIN blocks b ON b.id = t.block_id
LEFT JOIN refs r ON r.def_block_id = b.id
WHERE t.box = '${box}'
  AND t.name = 'custom-type'
  AND t.value IN ('concept', 'source', 'project', 'question', 'map')
  AND r.id IS NULL
ORDER BY t.value, b.hpath`));
  }

  if (command === "cards-by-status") {
    const status = sqlString(argValue("--status"));
    if (!status) throw new Error("cards-by-status requires --status");
    return print(await query(`
SELECT b.id, b.content AS title, t.value AS card_type, s.value AS status, b.hpath, b.updated
FROM attributes s
JOIN blocks b ON b.id = s.block_id
LEFT JOIN attributes t ON t.block_id = b.id AND t.name = 'custom-type'
WHERE s.box = '${box}'
  AND s.name = 'custom-status'
  AND s.value = '${status}'
ORDER BY t.value, b.updated DESC, b.hpath`));
  }

  if (command === "stale-cards") {
    return print(await query(`
SELECT b.id, b.content AS title, t.value AS card_type, s.value AS status, b.hpath, b.updated
FROM attributes s
JOIN blocks b ON b.id = s.block_id
LEFT JOIN attributes t ON t.block_id = b.id AND t.name = 'custom-type'
WHERE s.box = '${box}'
  AND s.name = 'custom-status'
  AND s.value = 'stale'
ORDER BY t.value, b.updated DESC, b.hpath`));
  }

  if (command === "cards-by-keyword") {
    const keyword = sqlString(argValue("--keyword"));
    if (!keyword) throw new Error("cards-by-keyword requires --keyword");
    return print(await query(`
SELECT b.id, b.content AS title, t.value AS card_type, k.value AS keywords, b.hpath, b.updated
FROM attributes k
JOIN blocks b ON b.id = k.block_id
LEFT JOIN attributes t ON t.block_id = b.id AND t.name = 'custom-type'
WHERE k.box = '${box}'
  AND k.name = 'custom-keywords'
  AND (
    k.value = '${keyword}'
    OR k.value LIKE '${keyword}|%'
    OR k.value LIKE '%|${keyword}|%'
    OR k.value LIKE '%|${keyword}'
  )
ORDER BY t.value, b.updated DESC, b.hpath`));
  }

  if (command === "old-active-cards") {
    const days = Math.max(1, Math.min(parseInt(argValue("--days", "30"), 10) || 30, 3650));
    const cutoff = cutoffUpdated(days);
    return print(await query(`
SELECT b.id, b.content AS title, t.value AS card_type, s.value AS status, b.hpath, b.updated
FROM attributes s
JOIN blocks b ON b.id = s.block_id
LEFT JOIN attributes t ON t.block_id = b.id AND t.name = 'custom-type'
WHERE s.box = '${box}'
  AND s.name = 'custom-status'
  AND s.value = 'active'
  AND b.updated < '${cutoff}'
ORDER BY b.updated ASC, t.value, b.hpath`));
  }

  if (command === "recent") {
    const limit = Math.max(1, Math.min(parseInt(argValue("--limit", "20"), 10) || 20, 100));
    return print(await query(`
SELECT id, content AS title, type, hpath, updated
FROM blocks
WHERE box = '${box}'
  AND type = 'd'
ORDER BY updated DESC
LIMIT ${limit}`));
  }

  if (command === "topic-summary") {
    const topic = process.argv[3] || "";
    const limit = Math.max(1, Math.min(parseInt(argValue("--limit", "12"), 10) || 12, 50));
    return print(await topicSummary(box, topic, limit));
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
