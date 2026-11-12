import mysql, { type Pool, type PoolConnection } from "mysql2/promise";
import { parsePgArray } from "drizzle-orm/pg-core/utils/array";

const ARRAY_COLUMNS = new Set(["roles", "permissions"]);

export interface MysqlConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function parseMysqlConnectionConfig(mysqlUrl?: string): MysqlConnectionConfig {
  if (mysqlUrl && mysqlUrl.startsWith("mysql://")) {
    const parsed = new URL(mysqlUrl);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, "") : "kanak_turnkey",
    };
  }
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "kanak_turnkey",
  };
}

/**
 * Find the matching closing parenthesis starting at `openParenIdx`.
 */
function findMatchingParen(str: string, openParenIdx: number): number {
  let depth = 0;
  let inSingleQuote = false;
  for (let i = openParenIdx; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && str[i - 1] !== "\\") {
      if (inSingleQuote && str[i + 1] === "'") {
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (inSingleQuote) continue;
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Rewrite PostgreSQL aggregate `FILTER (WHERE ...)` clauses to ANSI `CASE WHEN ...` for MySQL.
 */
function rewriteFilterClauses(sql: string): string {
  let result = sql;
  const pattern = /\b(count|sum)\s*\(/gi;
  let match: RegExpExecArray | null;

  // Iterate until no `filter (where ...)` remains
  while (true) {
    pattern.lastIndex = 0;
    let replaced = false;
    while ((match = pattern.exec(result)) !== null) {
      const fnName = match[1].toLowerCase();
      const openIdx = match.index + match[0].length - 1;
      const closeIdx = findMatchingParen(result, openIdx);
      if (closeIdx === -1) continue;

      const after = result.slice(closeIdx + 1);
      const filterMatch = /^\s+filter\s*\(\s*where\s+/i.exec(after);
      if (!filterMatch) continue;

      const filterOpenIdx = closeIdx + 1 + after.indexOf("(");
      const filterCloseIdx = findMatchingParen(result, filterOpenIdx);
      if (filterCloseIdx === -1) continue;

      const argExpr = result.slice(openIdx + 1, closeIdx).trim();
      const condExpr = result.slice(closeIdx + 1 + filterMatch[0].length, filterCloseIdx).trim();

      const replacement =
        fnName === "count"
          ? `CAST(COALESCE(SUM(CASE WHEN ${condExpr} THEN 1 ELSE 0 END), 0) AS SIGNED)`
          : `SUM(CASE WHEN ${condExpr} THEN ${argExpr} ELSE 0 END)`;

      result = result.slice(0, match.index) + replacement + result.slice(filterCloseIdx + 1);
      replaced = true;
      break;
    }
    if (!replaced) break;
  }

  return result;
}

/**
 * Rewrite PostgreSQL `::int`, `::integer`, `::text` casts outside string literals.
 */
function rewriteTypeCasts(sql: string): string {
  let out = "";
  let i = 0;
  let inSingleQuote = false;

  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== "\\") {
      if (inSingleQuote && sql[i + 1] === "'") {
        out += "''";
        i += 2;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      out += ch;
      i++;
      continue;
    }
    if (!inSingleQuote && sql[i] === ":" && sql[i + 1] === ":") {
      const rest = sql.slice(i + 2);
      const castMatch = /^(integer|int|bigint|smallint|text)\b/i.exec(rest);
      if (castMatch) {
        const targetType = castMatch[1].toLowerCase();
        i += 2 + castMatch[0].length;
        if (targetType === "text") {
          // Wrap preceding expression (identifier or parenthesized call) in CAST(... AS CHAR)
          if (out.endsWith(")")) {
            let depth = 0;
            let k = out.length - 1;
            let inQ = false;
            for (; k >= 0; k--) {
              const c = out[k];
              if (c === "'") inQ = !inQ;
              if (inQ) continue;
              if (c === ")") depth++;
              else if (c === "(") {
                depth--;
                if (depth === 0) break;
              }
            }
            // Include preceding function name if present
            let fnStart = k - 1;
            while (fnStart >= 0 && /[a-zA-Z0-9_.]/.test(out[fnStart])) fnStart--;
            fnStart++;
            const expr = out.slice(fnStart);
            out = out.slice(0, fnStart) + `CAST(${expr} AS CHAR)`;
          }
        }
        continue;
      }
    }
    out += ch;
    i++;
  }

  return out;
}

/**
 * Infer which placeholder numbers (`$1`, `$2`, ...) correspond to `roles` or `permissions` array columns.
 */
function detectArrayParamIndices(pgSql: string): Set<number> {
  const indices = new Set<number>();

  // 1. INSERT INTO "tbl" ("col1", "col2", ...) VALUES ($1, $2, ...), ($3, $4, ...)
  const insertMatch = /^\s*insert\s+into\s+"?([a-zA-Z0-9_]+)"?\s*\(([^)]+)\)\s*values\s*/i.exec(pgSql);
  if (insertMatch) {
    const cols = insertMatch[2].split(",").map((c) => c.trim().replace(/^"|"$/g, "").toLowerCase());
    const arrayColPositions = cols
      .map((name, idx) => (ARRAY_COLUMNS.has(name) ? idx : -1))
      .filter((idx) => idx !== -1);

    if (arrayColPositions.length > 0) {
      let pos = insertMatch[0].length;
      while (pos < pgSql.length) {
        while (pos < pgSql.length && (pgSql[pos] === " " || pgSql[pos] === "," || pgSql[pos] === "\n" || pgSql[pos] === "\r" || pgSql[pos] === "\t")) {
          pos++;
        }
        if (pgSql[pos] !== "(") break;
        const closeTuple = findMatchingParen(pgSql, pos);
        if (closeTuple === -1) break;
        const tupleBody = pgSql.slice(pos + 1, closeTuple);
        const vals = splitTopLevelComma(tupleBody);
        for (const colIdx of arrayColPositions) {
          const valToken = (vals[colIdx] || "").trim();
          const pMatch = /^\$(\d+)$/.exec(valToken);
          if (pMatch) indices.add(parseInt(pMatch[1], 10));
        }
        pos = closeTuple + 1;
      }
    }
  }

  // 2. UPDATE "tbl" SET "roles" = $1, "permissions" = $2 ...
  const setParamRegex = /"(roles|permissions)"\s*=\s*\$(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = setParamRegex.exec(pgSql)) !== null) {
    indices.add(parseInt(m[2], 10));
  }

  return indices;
}

function splitTopLevelComma(body: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let inQ = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'" && body[i - 1] !== "\\") {
      if (inQ && body[i + 1] === "'") {
        i++;
        continue;
      }
      inQ = !inQ;
      continue;
    }
    if (inQ) continue;
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

function sanitizeParamValue(val: unknown, isArrayCol: boolean): unknown {
  if (val === undefined) return null;
  if (isArrayCol) {
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === "string") {
      if (val === "{}") return "[]";
      if (val.startsWith("{") && val.endsWith("}")) {
        return JSON.stringify(parsePgArray(val));
      }
      return val;
    }
  }
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === "string") {
    // Convert ISO 8601 UTC/offset timestamps to JS Date for MySQL DATETIME compatibility
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(val)) {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return val;
}

export function translatePgSqlToMySql(
  pgSql: string,
  pgParams: unknown[] = [],
): { sql: string; params: unknown[] } {
  const arrayParamIndices = detectArrayParamIndices(pgSql);

  let transformed = rewriteFilterClauses(pgSql);
  transformed = rewriteTypeCasts(transformed);

  let out = "";
  const mysqlParams: unknown[] = [];
  let inSingleQuote = false;
  let i = 0;

  while (i < transformed.length) {
    const ch = transformed[i];

    // Preserve single-quoted string literals verbatim
    if (ch === "'" && transformed[i - 1] !== "\\") {
      if (inSingleQuote && transformed[i + 1] === "'") {
        out += "''";
        i += 2;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      out += ch;
      i++;
      continue;
    }

    if (inSingleQuote) {
      out += ch;
      i++;
      continue;
    }

    // Convert double-quoted identifiers "col" -> `col`
    if (ch === '"') {
      let j = i + 1;
      let ident = "";
      while (j < transformed.length) {
        if (transformed[j] === '"' && transformed[j + 1] === '"') {
          ident += '"';
          j += 2;
          continue;
        }
        if (transformed[j] === '"') break;
        ident += transformed[j];
        j++;
      }
      out += "`" + ident + "`";
      i = j + 1;
      continue;
    }

    // Convert $1, $2, ... -> ?
    if (ch === "$" && i + 1 < transformed.length && /\d/.test(transformed[i + 1])) {
      let j = i + 1;
      while (j < transformed.length && /\d/.test(transformed[j])) j++;
      const idx = parseInt(transformed.slice(i + 1, j), 10);
      out += "?";
      mysqlParams.push(sanitizeParamValue(pgParams[idx - 1], arrayParamIndices.has(idx)));
      i = j;
      continue;
    }

    out += ch;
    i++;
  }

  // Case-insensitive LIKE in MySQL uses LIKE
  out = out.replace(/\bilike\b/gi, "LIKE");

  return { sql: out, params: mysqlParams };
}

/**
 * Find a top-level keyword outside single quotes, backticks, and parentheses.
 */
function findTopLevelKeyword(sql: string, keyword: string, startFrom = 0): number {
  const lower = sql.toLowerCase();
  const target = keyword.toLowerCase();
  let inSingle = false;
  let inBacktick = false;
  let depth = 0;

  for (let i = startFrom; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inBacktick && sql[i - 1] !== "\\") {
      if (inSingle && sql[i + 1] === "'") {
        i++;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (ch === "`" && !inSingle) {
      inBacktick = !inBacktick;
      continue;
    }
    if (inSingle || inBacktick) continue;
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      continue;
    }
    if (depth === 0 && lower.startsWith(target, i)) {
      const prev = i === 0 ? " " : lower[i - 1];
      const next = i + target.length >= lower.length ? " " : lower[i + target.length];
      if (!/[a-z0-9_]/.test(prev) && !/[a-z0-9_]/.test(next)) {
        return i;
      }
    }
  }
  return -1;
}

function countQuestionMarks(sqlSegment: string): number {
  let count = 0;
  let inSingle = false;
  let inBacktick = false;
  for (let i = 0; i < sqlSegment.length; i++) {
    const ch = sqlSegment[i];
    if (ch === "'" && !inBacktick && sqlSegment[i - 1] !== "\\") {
      if (inSingle && sqlSegment[i + 1] === "'") {
        i++;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (ch === "`" && !inSingle) {
      inBacktick = !inBacktick;
      continue;
    }
    if (!inSingle && !inBacktick && ch === "?") count++;
  }
  return count;
}

async function executeWithReturning(
  conn: PoolConnection,
  mysqlSql: string,
  params: unknown[],
  rowsAsArray: boolean,
): Promise<{ rows: any[] }> {
  const returningIdx = findTopLevelKeyword(mysqlSql, "returning");
  if (returningIdx === -1) {
    const [res]: any = await conn.query({ sql: mysqlSql, rowsAsArray }, params);
    return { rows: Array.isArray(res) ? res : [] };
  }

  const baseSql = mysqlSql.slice(0, returningIdx).trim();
  const returningCols = mysqlSql.slice(returningIdx + "returning".length).trim();
  const trimmedLower = baseSql.toLowerCase();

  // 1. INSERT ... RETURNING ...
  if (trimmedLower.startsWith("insert")) {
    const tableMatch = /^insert\s+into\s+`([^`]+)`/i.exec(baseSql);
    if (!tableMatch) {
      throw new Error(`Unsupported INSERT RETURNING table format: ${baseSql}`);
    }
    const tableName = tableMatch[1];
    const [insertRes]: any = await conn.query(baseSql, params);
    const insertId = Number(insertRes?.insertId || 0);
    const affectedRows = Number(insertRes?.affectedRows || 0);

    if (affectedRows <= 0) return { rows: [] };

    if (insertId > 0) {
      const [rows]: any = await conn.query(
        {
          sql: `SELECT ${returningCols} FROM \`${tableName}\` WHERE \`id\` >= ? ORDER BY \`id\` ASC LIMIT ?`,
          rowsAsArray,
        },
        [insertId, affectedRows],
      );
      return { rows };
    }

    const [rows]: any = await conn.query(
      {
        sql: `SELECT ${returningCols} FROM \`${tableName}\` ORDER BY \`id\` DESC LIMIT ?`,
        rowsAsArray,
      },
      [affectedRows],
    );
    return { rows: Array.isArray(rows) ? rows.reverse() : [] };
  }

  // 2. UPDATE ... RETURNING ...
  if (trimmedLower.startsWith("update")) {
    const tableMatch = /^update\s+`([^`]+)`/i.exec(baseSql);
    if (!tableMatch) {
      throw new Error(`Unsupported UPDATE RETURNING table format: ${baseSql}`);
    }
    const tableName = tableMatch[1];
    const whereIdx = findTopLevelKeyword(baseSql, "where");

    let whereSql = "";
    let whereParams: unknown[] = [];
    if (whereIdx !== -1) {
      const beforeWhere = baseSql.slice(0, whereIdx);
      const setParamCount = countQuestionMarks(beforeWhere);
      whereSql = baseSql.slice(whereIdx);
      whereParams = params.slice(setParamCount);
    }

    // Capture affected IDs BEFORE update (handles cases where SET changes columns referenced in WHERE)
    const [idRows]: any = await conn.query(
      `SELECT \`id\` FROM \`${tableName}\` ${whereSql}`,
      whereParams,
    );
    const ids = (idRows as Array<{ id: number }>).map((r) => r.id);

    await conn.query(baseSql, params);

    if (ids.length === 0) return { rows: [] };

    const placeholders = ids.map(() => "?").join(", ");
    const [rows]: any = await conn.query(
      {
        sql: `SELECT ${returningCols} FROM \`${tableName}\` WHERE \`id\` IN (${placeholders}) ORDER BY \`id\` ASC`,
        rowsAsArray,
      },
      ids,
    );
    return { rows };
  }

  // 3. DELETE ... RETURNING ...
  if (trimmedLower.startsWith("delete")) {
    const tableMatch = /^delete\s+from\s+`([^`]+)`/i.exec(baseSql);
    if (!tableMatch) {
      throw new Error(`Unsupported DELETE RETURNING table format: ${baseSql}`);
    }
    const tableName = tableMatch[1];
    const whereIdx = findTopLevelKeyword(baseSql, "where");
    const whereSql = whereIdx !== -1 ? baseSql.slice(whereIdx) : "";

    // Capture rows BEFORE deleting
    const [rows]: any = await conn.query(
      {
        sql: `SELECT ${returningCols} FROM \`${tableName}\` ${whereSql}`,
        rowsAsArray,
      },
      params,
    );

    await conn.query(baseSql, params);
    return { rows };
  }

  const [rows]: any = await conn.query({ sql: baseSql, rowsAsArray }, params);
  return { rows: Array.isArray(rows) ? rows : [] };
}

export async function waitForMysql(config: MysqlConnectionConfig, retries = 15, delayMs = 2000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        connectTimeout: 5000,
      });
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`,
      );
      await conn.end();
      return;
    } catch (err: any) {
      if (i === retries) throw err;
      console.log(`⏳ Waiting for MySQL (${i}/${retries}): ${err?.message || err}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export function createMysqlPgPool(mysqlUrl?: string) {
  const cfg = parseMysqlConnectionConfig(mysqlUrl);

  const mysqlPool: Pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
    typeCast(field, next) {
      if (field.type === "TINY" && field.length === 1) {
        const val = field.string();
        return val === null ? null : val === "1";
      }
      if (field.type === "DATE") {
        return field.string("utf8");
      }
      if (field.type === "JSON") {
        const val = field.string("utf8");
        if (val === null) return null;
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return next();
    },
  });

  // Expose a pg-Pool-compatible `.query(...)` method for drizzle-orm/node-postgres
  const pgCompatiblePool = {
    mysqlPool,
    config: cfg,
    async query(queryTextOrConfig: string | { text: string; rowMode?: string }, values?: unknown[]) {
      const text = typeof queryTextOrConfig === "string" ? queryTextOrConfig : queryTextOrConfig.text;
      const rowsAsArray = typeof queryTextOrConfig === "object" && queryTextOrConfig.rowMode === "array";
      const { sql, params } = translatePgSqlToMySql(text, values ?? []);

      if (findTopLevelKeyword(sql, "returning") !== -1) {
        const conn = await mysqlPool.getConnection();
        try {
          return await executeWithReturning(conn, sql, params, rowsAsArray);
        } finally {
          conn.release();
        }
      }

      const [res]: any = await mysqlPool.query({ sql, rowsAsArray }, params);
      if (Array.isArray(res)) {
        return { rows: res };
      }
      return { rows: [], rowCount: res?.affectedRows ?? 0 };
    },
    async end() {
      await mysqlPool.end();
    },
  };

  return pgCompatiblePool;
}
