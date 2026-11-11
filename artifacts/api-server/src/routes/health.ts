import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

const handler = async (_req: any, res: any) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: "ok",
      database: "healthy",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: "error",
      database: "unhealthy",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};

router.get("/healthz", handler);
router.get("/health", handler);

export default router;
