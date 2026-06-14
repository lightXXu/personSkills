# SQL Recipes

Set `BOX_ID` mentally to the target notebook id.

## Card Index

```sql
SELECT a.block_id, b.content AS title, a.value AS card_type, b.hpath
FROM attributes a
JOIN blocks b ON a.block_id = b.id
WHERE a.box = 'BOX_ID'
  AND a.name = 'custom-type'
ORDER BY a.value, b.hpath;
```

## Cards by Type

```sql
SELECT b.id, b.content AS title, b.hpath, b.updated
FROM attributes a
JOIN blocks b ON a.block_id = b.id
WHERE a.box = 'BOX_ID'
  AND a.name = 'custom-type'
  AND a.value = 'concept'
ORDER BY b.hpath;
```

## Keyword Search Within Notebook

```sql
SELECT id, content, type, hpath, root_id, updated
FROM blocks
WHERE box = 'BOX_ID'
  AND content LIKE '%KEYWORD%'
ORDER BY updated DESC
LIMIT 30;
```

## Backlinks to a Block

```sql
SELECT r.root_id, src.content AS source_doc, src.hpath, r.content, r.markdown
FROM refs r
LEFT JOIN blocks src ON src.id = r.root_id
WHERE r.box = 'BOX_ID'
  AND r.def_block_id = 'BLOCK_ID'
ORDER BY src.hpath;
```

## Low Confidence Cards

```sql
SELECT b.id, b.content AS title, b.hpath
FROM attributes a
JOIN blocks b ON a.block_id = b.id
WHERE a.box = 'BOX_ID'
  AND a.name = 'custom-confidence'
  AND a.value = 'low'
ORDER BY b.hpath;
```

## Untyped Documents

```sql
SELECT b.id, b.content AS title, b.hpath
FROM blocks b
LEFT JOIN attributes a
  ON a.block_id = b.id AND a.name = 'custom-type'
WHERE b.box = 'BOX_ID'
  AND b.type = 'd'
  AND a.block_id IS NULL
ORDER BY b.hpath;
```

## Orphan Typed Cards

Cards with a type but no incoming refs:

```sql
SELECT b.id, b.content AS title, t.value AS card_type, b.hpath
FROM attributes t
JOIN blocks b ON b.id = t.block_id
LEFT JOIN refs r ON r.def_block_id = b.id
WHERE t.box = 'BOX_ID'
  AND t.name = 'custom-type'
  AND t.value IN ('concept', 'source', 'project', 'question', 'map')
  AND r.id IS NULL
ORDER BY t.value, b.hpath;
```
