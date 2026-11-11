#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const schemaSqlPath = path.join(rootDir, "lib", "db", "mysql-schema.sql");

// Load mysql2/promise dynamically
let mysql;
try {
  const require = createRequire(path.join(rootDir, "lib", "db", "package.json"));
  mysql = require("mysql2/promise");
} catch (err) {
  try {
    mysql = await import("mysql2/promise");
  } catch {
    console.error("❌ Could not locate mysql2 package. Please run: pnpm --filter @workspace/db add mysql2");
    process.exit(1);
  }
}

// Simple .env parser
function loadEnv() {
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

const fileEnv = loadEnv();

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(name) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && i + 1 < args.length) return args[i + 1];
    if (args[i].startsWith(`--${name}=`)) return args[i].slice(name.length + 3);
  }
  return null;
}

// Parse connection URL if provided
function parseUrl(urlStr) {
  if (!urlStr || !urlStr.startsWith("mysql://")) return null;
  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, "") : "kanak_turnkey",
    };
  } catch {
    return null;
  }
}

const urlFromEnv = parseUrl(process.env.MYSQL_URL || fileEnv.MYSQL_URL);
const urlFromArg = parseUrl(getArg("url"));

const host = getArg("host") || process.env.MYSQL_HOST || fileEnv.MYSQL_HOST || urlFromArg?.host || urlFromEnv?.host || "127.0.0.1";
const port = parseInt(getArg("port") || process.env.MYSQL_PORT || fileEnv.MYSQL_PORT || urlFromArg?.port || urlFromEnv?.port || "3306", 10);
const user = getArg("user") || process.env.MYSQL_USER || fileEnv.MYSQL_USER || urlFromArg?.user || urlFromEnv?.user || "root";
let password = getArg("password") ?? process.env.MYSQL_PASSWORD ?? fileEnv.MYSQL_PASSWORD ?? urlFromArg?.password ?? urlFromEnv?.password ?? null;
const database = getArg("database") || process.env.MYSQL_DATABASE || fileEnv.MYSQL_DATABASE || urlFromArg?.database || urlFromEnv?.database || "kanak_turnkey";

async function promptPassword() {
  if (password !== null) return password;
  if (!process.stdin.isTTY) return "";
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`🔑 Enter MySQL password for ${user}@${host}:${port} (press Enter if blank): `, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function updateEnvFile(urlToSave) {
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf-8");
  }
  
  if (content.includes("MYSQL_URL=")) {
    content = content.replace(/MYSQL_URL=.*/g, `MYSQL_URL=${urlToSave}`);
  } else {
    content += (content.endsWith("\n") || content.length === 0 ? "" : "\n") + `MYSQL_URL=${urlToSave}\n`;
  }
  
  fs.writeFileSync(envPath, content, "utf-8");
}

async function run() {
  console.log("\n========================================================");
  console.log("  🏗️  Kanak Turnkey — MySQL Schema & Database Setup");
  console.log("========================================================\n");
  
  console.log(`📌 Target Server:   ${host}:${port}`);
  console.log(`👤 MySQL User:      ${user}`);
  console.log(`📁 Target Database: ${database}`);
  console.log(`📄 DDL Script:      ${schemaSqlPath}`);

  if (!fs.existsSync(schemaSqlPath)) {
    console.error(`❌ Schema file not found at: ${schemaSqlPath}`);
    process.exit(1);
  }

  if (password === null) {
    password = await promptPassword();
  }

  console.log("\n⏳ Connecting to MySQL server...");

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password: password || "",
      multipleStatements: true,
      connectTimeout: 8000,
    });
  } catch (err) {
    console.error("\n❌ Could not connect to MySQL server!");
    console.error(`   Error details: [${err.code || "UNKNOWN"}] ${err.message}\n`);
    
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("💡 The password provided for user '" + user + "' was rejected.");
      console.log("   You can run this setup command with your MySQL password like this:");
      console.log(`   node scripts/setup-mysql.mjs --password="YOUR_PASSWORD"`);
      console.log("   Or add it to your .env file as:");
      console.log(`   MYSQL_PASSWORD=YOUR_PASSWORD\n`);
    } else if (err.code === "ECONNREFUSED") {
      console.log(`💡 Could not connect to port ${port}. Please ensure MySQL service is running.\n`);
    }
    process.exit(1);
  }

  console.log("✅ Connected successfully to MySQL server!\n");

  try {
    // 1. Create database if not exists
    console.log(`🔨 Creating database '${database}' if not exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`✅ Database '${database}' is ready.`);

    // 2. Select database
    await connection.query(`USE \`${database}\`;`);

    // 3. Read & Execute SQL Schema
    console.log(`\n⏳ Executing 32 table definitions & seeds from mysql-schema.sql...`);
    const ddlContent = fs.readFileSync(schemaSqlPath, "utf-8");

    // Execute script
    await connection.query(ddlContent);
    console.log(`✅ All tables, constraints, indexes, and initial seeds executed successfully!`);

    // 4. Verify created tables
    const [tables] = await connection.query(`
      SELECT 
        TABLE_NAME as tableName, 
        TABLE_ROWS as approxRows,
        CREATE_TIME as createdAt
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME ASC;
    `, [database]);

    console.log(`\n📊 Verification: Verified ${tables.length} tables in '${database}':`);
    console.log("--------------------------------------------------------");
    for (const t of tables) {
      console.log(`  ✓ ${t.tableName}`);
    }
    console.log("--------------------------------------------------------");

    // 5. Update .env file
    const safePass = encodeURIComponent(password || "");
    const connectionUrl = `mysql://${user}:${safePass}@${host}:${port}/${database}`;
    updateEnvFile(connectionUrl);
    console.log(`\n💾 Saved connection string to .env:`);
    console.log(`   MYSQL_URL=mysql://${user}:****@${host}:${port}/${database}`);

    console.log("\n========================================================");
    console.log("  🎉 MySQL Schema Setup Completed Successfully!");
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n❌ Error while applying schema:", err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
