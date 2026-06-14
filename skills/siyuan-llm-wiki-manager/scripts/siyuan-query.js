#!/usr/bin/env node

const http = require("http");
const https = require("https");

const baseURL = process.env.SIYUAN_BASE_URL || "http://localhost:6806";
const token = process.env.SIYUAN_TOKEN || "";
const notebook = process.env.SIYUAN_LLM_WIKI_NOTEBOOK || process.env.SIYUAN_DEFAULT_NOTEBOOK || "";

function usage() {
  console.log(`Usage:
  siyuan-query.js tables
  siyuan-query.js card-index [--box <notebookId>]
  siyuan-query.js cards --type <concept|source|project|question|map|template|design|index> [--box <notebookId>]
  siyuan-query.js search <keyword> [--box <notebookId>]
  siyuan-query.js refs-to <blockId> [--box <notebookId>]
  siyuan-query.js low-confidence [--box <notebookId>]
  siyuan-query.js untyped [--box <notebookId>]
  siyuan-query.js orphan-cards [--box <notebookId>]
  siyuan-query.js recent [--limit 20] [--box <notebookId>]

Environment:
  SIYUAN_BASE_URL              default: http://localhost:6806
  SIYUAN_TOKEN                 required if SiYuan auth is enabled
  SIYUAN_LLM_WIKI_NOTEBOOK     preferred notebook id
  SIYUAN_DEFAULT_NOTEBOOK      fallback notebook id
`);
}

function argValue(name, fallback = "") {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback;
}

function sqlString(value) {
  return String(value).replace(/'/g, "''");
}

function getBox() {
  const box = argValue("--box", notebook);
  if (!box) {
    throw new Error("Missing notebook id. Pass --box or set SIYUAN_LLM_WIKI_NOTEBOOK.");
  }
  return box;
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

async function main() {
  const command = process.argv[2];
  if (!command || command === "-h" || command === "--help") {
    usage();
    return;
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

  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
