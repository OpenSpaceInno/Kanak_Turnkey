import { defineConfig } from "drizzle-kit";
import path from "path";
import { config } from "dotenv";

// Load environment variables from root .env
config({ path: path.join(__dirname, "../../.env") });

const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  console.error("Please set DATABASE_URL in the .env file at project root");
  process.exit(1);
}

const isPostgres = DATABASE_URL.startsWith("postgres://") || DATABASE_URL.startsWith("postgresql://");

if (!isPostgres && !DATABASE_URL.startsWith("file:")) {
  console.error("❌ DATABASE_URL must start with 'postgres://', 'postgresql://', or 'file:'");
  process.exit(1);
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: isPostgres ? DATABASE_URL : "postgresql://postgres:postgres@localhost:5432/postgres" },
});
