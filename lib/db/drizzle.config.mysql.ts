import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
config({ path: path.join(__dirname, "../../.env") });

const MYSQL_URL =
  process.env.MYSQL_URL ||
  `mysql://${process.env.MYSQL_USER || "root"}:${process.env.MYSQL_PASSWORD || ""}@${process.env.MYSQL_HOST || "127.0.0.1"}:${process.env.MYSQL_PORT || "3306"}/${process.env.MYSQL_DATABASE || "kanak_turnkey"}`;

export default defineConfig({
  schema: "./src/schema/mysql.ts",
  dialect: "mysql",
  dbCredentials: {
    url: MYSQL_URL,
  },
});

