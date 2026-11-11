import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  communicationsTable,
  meetingsTable,
  documentsTable,
  projectsTable,
  usersTable,
} from "@workspace/db";
import { getCurrentUser } from "../lib/session";

const router: IRouter = Router();

router.get("/communications", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;
  const baseQuery = db
    .select({ c: communicationsTable, p: projectsTable.name })
    .from(communicationsTable)
    .leftJoin(
      projectsTable,
      eq(projectsTable.id, communicationsTable.projectId),
    );
  const rows = projectId
    ? await baseQuery.where(eq(communicationsTable.projectId, projectId)).orderBy(desc(communicationsTable.communicationDate))
    : await baseQuery.orderBy(desc(communicationsTable.communicationDate));
  res.json(rows.map((r) => ({ ...r.c, projectName: r.p })));
});

router.post("/communications", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();
  const commDate = b.communicationDate && !isNaN(new Date(b.communicationDate).getTime())
    ? new Date(b.communicationDate)
    : new Date();
  const commType = (b.communicationType || b.type || "email").toString();
  const subject = (b.subject || b.title || "General Communication").toString().trim();
  const [c] = await db
    .insert(communicationsTable)
    .values({
      projectId: b.projectId ? parseInt(String(b.projectId), 10) : null,
      stakeholderId: b.stakeholderId ? parseInt(String(b.stakeholderId), 10) : null,
      communicationType: commType,
      subject,
      content: b.content ?? null,
      communicationDate: commDate,
      participants: b.participants ?? null,
      createdById: me.id,
    })
    .returning();
  res.status(201).json(c);
});

router.get("/meetings", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;
  const baseQuery = db
    .select({ m: meetingsTable, p: projectsTable.name })
    .from(meetingsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, meetingsTable.projectId));
  const rows = projectId
    ? await baseQuery.where(eq(meetingsTable.projectId, projectId)).orderBy(desc(meetingsTable.meetingDate))
    : await baseQuery.orderBy(desc(meetingsTable.meetingDate));
  res.json(
    rows.map((r) => {
      const start = r.m.meetingDate;
      const end = new Date(start.getTime() + r.m.duration * 60_000);
      return {
        ...r.m,
        projectName: r.p,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        meetingLink: null,
      };
    }),
  );
});

router.post("/meetings", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();
  const [m] = await db
    .insert(meetingsTable)
    .values({
      projectId: b.projectId,
      title: b.title,
      meetingDate: new Date(b.meetingDate),
      duration: b.duration ?? 60,
      location: b.location ?? null,
      agenda: b.agenda ?? null,
      minutes: b.minutes ?? null,
      participants: b.participants ?? null,
      createdById: me.id,
    })
    .returning();
  res.status(201).json(m);
});

router.patch("/meetings/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const b = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const k of [
    "title",
    "duration",
    "location",
    "agenda",
    "minutes",
    "participants",
  ]) {
    if (b[k] !== undefined) update[k] = b[k];
  }
  if (b.meetingDate !== undefined)
    update.meetingDate = new Date(b.meetingDate);
  const [m] = await db
    .update(meetingsTable)
    .set(update)
    .where(eq(meetingsTable.id, id))
    .returning();
  if (!m) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(m);
});

router.get("/documents", async (req, res): Promise<void> => {
  const projectId = req.query.projectId
    ? parseInt(req.query.projectId as string, 10)
    : null;
  const baseQuery = db
    .select({
      d: documentsTable,
      p: projectsTable.name,
      u: usersTable.name,
    })
    .from(documentsTable)
    .leftJoin(projectsTable, eq(projectsTable.id, documentsTable.projectId))
    .leftJoin(usersTable, eq(usersTable.id, documentsTable.uploadedById));
  const rows = projectId
    ? await baseQuery.where(eq(documentsTable.projectId, projectId)).orderBy(desc(documentsTable.uploadedAt))
    : await baseQuery.orderBy(desc(documentsTable.uploadedAt));
  res.json(
    rows.map((r) => ({
      ...r.d,
      projectName: r.p,
      uploadedByName: r.u,
      title: r.d.fileName,
      createdAt: r.d.uploadedAt.toISOString(),
    })),
  );
});

router.post("/documents", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  const me = await getCurrentUser();
  const fileName = (b.fileName || b.name || b.title || `Document-${Date.now()}`).toString().trim();
  const version = parseInt(String(b.version ?? 1), 10) || 1;
  const [d] = await db
    .insert(documentsTable)
    .values({
      projectId: parseInt(String(b.projectId), 10),
      fileName,
      fileType: b.fileType ?? null,
      fileSize: b.fileSize ? parseInt(String(b.fileSize), 10) : null,
      fileUrl: b.fileUrl ?? null,
      category: b.category ?? "general",
      version,
      status: b.status ?? "active",
      uploadedById: me.id,
    })
    .returning();
  res.status(201).json({ ...d, uploadedByName: me.name });
});

export default router;
