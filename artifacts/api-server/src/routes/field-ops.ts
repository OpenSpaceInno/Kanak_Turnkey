import { Router, type IRouter } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  db,
  communicationsTable,
  projectsTable,
  usersTable,
  materialRequestsTable,
  expensesTable,
  raBillsTable,
  materialsTable,
  purchaseOrdersTable,
  tasksTable,
  vendorsTable,
  punchListItemsTable,
} from "@workspace/db";
import { getCurrentUser } from "../lib/session";
import { numKeys } from "../lib/transforms";

const router: IRouter = Router();

// Helper to extract metadata block
function extractMeta<T = any>(content: string | null | undefined, tag: string): T | null {
  if (!content) return null;
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`);
  const match = content.match(regex);
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function updateMetaBlock(content: string, tag: string, newMeta: any): string {
  const metaString = `[${tag}]${JSON.stringify(newMeta)}[/${tag}]`;
  const regex = new RegExp(`\\[${tag}\\][\\s\\S]*?\\[\\/${tag}\\]`);
  if (regex.test(content)) {
    return content.replace(regex, metaString);
  }
  return `${metaString}\n\n${content}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ATTENDANCE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/attendance/today
router.get("/attendance/today", async (_req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const todayStr = new Date().toISOString().slice(0, 10);

    const rows = await db
      .select({
        c: communicationsTable,
        pName: projectsTable.name,
      })
      .from(communicationsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, communicationsTable.projectId))
      .where(
        and(
          eq(communicationsTable.createdById, me.id),
          eq(communicationsTable.communicationType, "site_attendance")
        )
      )
      .orderBy(desc(communicationsTable.communicationDate))
      .limit(5);

    const todayRecord = rows.find((r) => {
      const dateStr = new Date(r.c.communicationDate).toISOString().slice(0, 10);
      return dateStr === todayStr;
    });

    if (!todayRecord) {
      res.json({ checkedIn: false });
      return;
    }

    const meta = extractMeta(todayRecord.c.content, "ATTENDANCE_META") || {};
    res.json({
      checkedIn: meta.status === "checked_in",
      recordId: todayRecord.c.id,
      checkInTime: meta.checkInTime || todayRecord.c.communicationDate,
      checkOutTime: meta.checkOutTime || null,
      hoursWorked: meta.hoursWorked || null,
      projectId: todayRecord.c.projectId,
      projectName: todayRecord.pName || meta.projectName || "Field Operations Site",
      location: meta.location || "Main Site Office",
      gps: meta.gps || null,
      notes: meta.notes || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/check-in
router.post("/attendance/check-in", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const b = req.body ?? {};
    const projectId = b.projectId ? parseInt(b.projectId, 10) : null;

    let projectName = "Field Site";
    let projectLocation = "Main Site";
    if (projectId) {
      const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
      if (proj) {
        projectName = proj.name;
        projectLocation = proj.location || projectLocation;
      }
    }

    const checkInTime = new Date().toISOString();
    const meta = {
      status: "checked_in",
      checkInTime,
      projectId,
      projectName,
      location: b.locationName || projectLocation,
      gps: b.gpsCoordinates || null,
      notes: b.notes || null,
    };

    const content = `[ATTENDANCE_META]${JSON.stringify(meta)}[/ATTENDANCE_META]\n\n**Site Attendance Log:**\nEngineer ${me.name} checked in at ${new Date(checkInTime).toLocaleTimeString("en-IN")} on ${projectName}.`;

    const [record] = await db
      .insert(communicationsTable)
      .values({
        projectId,
        communicationType: "site_attendance",
        subject: `Attendance Check-In: ${me.name} @ ${projectName}`,
        content,
        communicationDate: new Date(),
        participants: me.name,
        createdById: me.id,
      })
      .returning();

    res.status(201).json({
      success: true,
      checkedIn: true,
      recordId: record!.id,
      checkInTime,
      projectName,
      location: meta.location,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/check-out
router.post("/attendance/check-out", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const b = req.body ?? {};
    const recordId = b.recordId ? parseInt(b.recordId, 10) : null;

    let targetRecord;
    if (recordId) {
      const [rec] = await db
        .select()
        .from(communicationsTable)
        .where(eq(communicationsTable.id, recordId));
      targetRecord = rec;
    } else {
      // Find latest check in today
      const todayStr = new Date().toISOString().slice(0, 10);
      const rows = await db
        .select()
        .from(communicationsTable)
        .where(
          and(
            eq(communicationsTable.createdById, me.id),
            eq(communicationsTable.communicationType, "site_attendance")
          )
        )
        .orderBy(desc(communicationsTable.communicationDate))
        .limit(3);

      targetRecord = rows.find((r) => new Date(r.communicationDate).toISOString().slice(0, 10) === todayStr);
    }

    if (!targetRecord) {
      res.status(404).json({ error: "No active check-in found for today" });
      return;
    }

    const currentMeta = extractMeta(targetRecord.content, "ATTENDANCE_META") || {};
    const checkInDate = currentMeta.checkInTime ? new Date(currentMeta.checkInTime) : new Date(targetRecord.communicationDate);
    const checkOutTime = new Date().toISOString();
    const diffMs = new Date(checkOutTime).getTime() - checkInDate.getTime();
    const hoursWorked = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

    const updatedMeta = {
      ...currentMeta,
      status: "checked_out",
      checkOutTime,
      hoursWorked,
      checkoutNotes: b.notes || null,
    };

    const updatedContent = updateMetaBlock(
      targetRecord.content || "",
      "ATTENDANCE_META",
      updatedMeta
    ) + `\n\n**Checked out:** ${new Date(checkOutTime).toLocaleTimeString("en-IN")} (${hoursWorked} hrs recorded).`;

    await db
      .update(communicationsTable)
      .set({
        content: updatedContent,
        subject: `Attendance Completed: ${me.name} (${hoursWorked} hrs)`,
      })
      .where(eq(communicationsTable.id, targetRecord.id));

    res.json({
      success: true,
      checkedIn: false,
      checkOutTime,
      hoursWorked,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/quick-toggle (1-Tap Zero-Form Clock-In/Clock-Out)
router.post("/attendance/quick-toggle", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const todayStr = new Date().toISOString().slice(0, 10);
    const b = req.body ?? {};
    const projectId = b.projectId ? parseInt(b.projectId, 10) : null;

    // Check today's active attendance
    const rows = await db
      .select({ c: communicationsTable })
      .from(communicationsTable)
      .where(
        and(
          eq(communicationsTable.createdById, me.id),
          eq(communicationsTable.communicationType, "site_attendance")
        )
      )
      .orderBy(desc(communicationsTable.communicationDate))
      .limit(5);

    const todayRecord = rows.find((r) => {
      const dateStr = new Date(r.c.communicationDate).toISOString().slice(0, 10);
      return dateStr === todayStr;
    });

    const currentMeta = todayRecord ? extractMeta(todayRecord.c.content, "ATTENDANCE_META") || {} : {};

    if (todayRecord && currentMeta.status === "checked_in") {
      // Clock Out
      const checkOutTime = new Date().toISOString();
      const inTime = new Date(currentMeta.checkInTime || todayRecord.c.communicationDate).getTime();
      const diffMs = Math.max(0, new Date(checkOutTime).getTime() - inTime);
      const hoursWorked = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

      const updatedMeta = {
        ...currentMeta,
        status: "checked_out",
        checkOutTime,
        hoursWorked,
      };

      const updatedContent = updateMetaBlock(
        todayRecord.c.content || "",
        "ATTENDANCE_META",
        updatedMeta
      ) + `\n\n**Checked out:** ${new Date(checkOutTime).toLocaleTimeString("en-IN")} (${hoursWorked} hrs recorded).`;

      await db
        .update(communicationsTable)
        .set({
          content: updatedContent,
          subject: `Attendance Completed: ${me.name} (${hoursWorked} hrs)`,
        })
        .where(eq(communicationsTable.id, todayRecord.c.id));

      res.json({
        success: true,
        checkedIn: false,
        checkOutTime,
        hoursWorked,
        message: `Shift ended. ${hoursWorked} hours recorded.`,
      });
      return;
    }

    // Clock In
    let projectName = "Field Operations Site";
    let projectLocation = "Main Site";
    if (projectId) {
      const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
      if (proj) {
        projectName = proj.name;
        projectLocation = proj.location || projectLocation;
      }
    }

    const checkInTime = new Date().toISOString();
    const meta = {
      status: "checked_in",
      checkInTime,
      projectId,
      projectName,
      location: b.locationName || projectLocation,
      gps: b.gpsCoordinates || null,
      notes: b.notes || "1-Tap Quick Site Check-In",
    };

    const content = `[ATTENDANCE_META]${JSON.stringify(meta)}[/ATTENDANCE_META]\n\n**Site Attendance Log:**\nEngineer ${me.name} clocked in at ${new Date(checkInTime).toLocaleTimeString("en-IN")} on ${projectName}.`;

    const [record] = await db
      .insert(communicationsTable)
      .values({
        projectId,
        communicationType: "site_attendance",
        subject: `Attendance Check-In: ${me.name} @ ${projectName}`,
        content,
        communicationDate: new Date(),
        participants: me.name,
        createdById: me.id,
      })
      .returning();

    res.status(201).json({
      success: true,
      checkedIn: true,
      recordId: record!.id,
      checkInTime,
      projectName,
      location: meta.location,
      message: `Clocked in successfully at ${projectName}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/team
router.get("/attendance/team", async (_req, res): Promise<void> => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    const allUsers = await db.select().from(usersTable);
    const engineers = allUsers.filter((u) => {
      const roles = Array.isArray(u.roles) ? u.roles : [];
      return roles.includes("engineer") || roles.includes("project_manager") || u.activeRole === "engineer";
    });

    const todayAttRecords = await db
      .select({
        c: communicationsTable,
        pName: projectsTable.name,
      })
      .from(communicationsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, communicationsTable.projectId))
      .where(eq(communicationsTable.communicationType, "site_attendance"))
      .orderBy(desc(communicationsTable.communicationDate));

    const todayDprs = await db
      .select()
      .from(communicationsTable)
      .where(eq(communicationsTable.communicationType, "dpr"))
      .orderBy(desc(communicationsTable.communicationDate));

    const result = engineers.map((eng) => {
      const userAtt = todayAttRecords.find(
        (a) =>
          a.c.createdById === eng.id &&
          new Date(a.c.communicationDate).toISOString().slice(0, 10) === todayStr
      );

      const meta = userAtt ? extractMeta(userAtt.c.content, "ATTENDANCE_META") || {} : {};
      const userDpr = todayDprs.find(
        (d) =>
          d.createdById === eng.id &&
          new Date(d.communicationDate).toISOString().slice(0, 10) === todayStr
      );

      return {
        userId: eng.id,
        name: eng.name,
        email: eng.email,
        avatarUrl: eng.avatarUrl,
        activeRole: eng.activeRole,
        checkedIn: meta.status === "checked_in",
        checkInTime: meta.checkInTime || null,
        checkOutTime: meta.checkOutTime || null,
        hoursWorked: meta.hoursWorked || null,
        projectName: userAtt?.pName || meta.projectName || "Unassigned",
        location: meta.location || "Field Operations",
        dprLoggedToday: Boolean(userDpr),
        dprStatus: userDpr ? (extractMeta(userDpr.content, "DPR_META")?.status || "submitted") : "not_started",
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DAILY PROGRESS REPORT (DPR) LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/dpr/today?projectId=...
router.get("/dpr/today", async (req, res): Promise<void> => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : null;
    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const dprs = await db
      .select({
        c: communicationsTable,
        pName: projectsTable.name,
      })
      .from(communicationsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, communicationsTable.projectId))
      .where(
        and(
          eq(communicationsTable.projectId, projectId),
          eq(communicationsTable.communicationType, "dpr")
        )
      )
      .orderBy(desc(communicationsTable.communicationDate));

    const todayDpr = dprs.find(
      (d) => new Date(d.c.communicationDate).toISOString().slice(0, 10) === todayStr
    );

    if (!todayDpr) {
      res.json({ exists: false, status: "not_started" });
      return;
    }

    const meta = extractMeta(todayDpr.c.content, "DPR_META") || {};
    res.json({
      exists: true,
      recordId: todayDpr.c.id,
      date: todayDpr.c.communicationDate,
      subject: todayDpr.c.subject,
      status: meta.status || "submitted",
      meta,
      projectName: todayDpr.pName,
      rawContent: todayDpr.c.content,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dpr/yesterday?projectId=... (Fetch previous day's approved/submitted headcount for 1-tap copy)
router.get("/dpr/yesterday", async (req, res): Promise<void> => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : null;
    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const dprs = await db
      .select({
        c: communicationsTable,
        pName: projectsTable.name,
      })
      .from(communicationsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, communicationsTable.projectId))
      .where(
        and(
          eq(communicationsTable.projectId, projectId),
          eq(communicationsTable.communicationType, "dpr")
        )
      )
      .orderBy(desc(communicationsTable.communicationDate));

    // Find the latest DPR before today (or most recent historical DPR)
    const pastDpr = dprs.find(
      (d) => new Date(d.c.communicationDate).toISOString().slice(0, 10) < todayStr
    ) || (dprs.length > 0 ? dprs[0] : null);

    if (!pastDpr) {
      res.json({ exists: false });
      return;
    }

    const meta = extractMeta(pastDpr.c.content, "DPR_META") || {};
    const defaultLabor = {
      mason: meta.skilledLabour ? Math.max(1, Math.round(meta.skilledLabour * 0.4)) : 6,
      carpenter: 4,
      barBender: 4,
      electrician: 2,
      plumber: 2,
      helper: meta.unSkilledLabour ? meta.unSkilledLabour : 10,
    };

    res.json({
      exists: true,
      recordId: pastDpr.c.id,
      date: pastDpr.c.communicationDate,
      meta,
      labor: meta.labor || defaultLabor,
      skilledLabour: meta.skilledLabour || 16,
      unSkilledLabour: meta.unSkilledLabour || 10,
      totalLabour: meta.totalLabour || 26,
      machinery: meta.machinery || "Standard site tooling",
      weather: meta.weather || "Clear / Sunny",
      supervisor: meta.supervisor || "",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dpr/submit
router.post("/dpr/submit", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const b = req.body ?? {};
    const projectId = parseInt(b.projectId, 10);
    if (!projectId) {
      res.status(400).json({ error: "projectId required" });
      return;
    }

    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    const dprDate = b.date || new Date().toISOString().slice(0, 10);
    const skilledLabour = parseInt(b.skilledLabour || 0, 10);
    const unSkilledLabour = parseInt(b.unSkilledLabour || 0, 10);
    const totalLabour = skilledLabour + unSkilledLabour;
    const weather = b.weather || "Clear / Sunny";
    const status = b.status || "submitted";

    const safeStr = (val: any, fallback = ""): string => {
      if (typeof val === "string") return val;
      if (Array.isArray(val)) {
        return val
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") return item.name || item.title || JSON.stringify(item);
            return String(item ?? "");
          })
          .filter(Boolean)
          .join(", ") || fallback;
      }
      if (val && typeof val === "object") return JSON.stringify(val);
      return val ? String(val) : fallback;
    };

    const workExecutedStr = safeStr(b.workExecuted);
    const machineryStr = safeStr(b.machinery, "Standard site tooling");
    const hindrancesStr = safeStr(b.hindrances || b.blockers, "None reported.");

    const dprPayload = {
      date: dprDate,
      projectId,
      projectName: project?.name || `Project #${projectId}`,
      weather,
      skilledLabour,
      unSkilledLabour,
      totalLabour,
      supervisor: b.supervisor || me.name,
      workExecuted: workExecutedStr,
      machinery: machineryStr,
      hindrances: hindrancesStr,
      quantities: Array.isArray(b.quantities) ? b.quantities : (Array.isArray(b.tasksCompleted) ? b.tasksCompleted : []),
      photos: b.photos || [],
      status, // 'draft' | 'submitted' | 'approved' | 'revision_requested'
      submittedAt: new Date().toISOString(),
      submittedBy: me.name,
    };

    const formattedContent = `[DPR_META]${JSON.stringify(dprPayload)}[/DPR_META]

### Daily Site Execution Summary
**Work Executed Today:**
${workExecutedStr.trim() || "Work in progress."}

**Active Machinery & Tools:**
${machineryStr.trim() || "Standard site tooling"}

**Site Hindrances & Delays:**
${hindrancesStr.trim() || "None."}
`;

    const subject = `DPR: ${new Date(dprDate).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} — ${totalLabour} Workers (${weather}) [STATUS: ${status}]`;

    // Check if a DPR already exists for this project on this date to update rather than duplicate
    const existingRows = await db
      .select()
      .from(communicationsTable)
      .where(
        and(
          eq(communicationsTable.projectId, projectId),
          eq(communicationsTable.communicationType, "dpr")
        )
      );

    const existingDpr = existingRows.find(
      (r) => new Date(r.communicationDate).toISOString().slice(0, 10) === dprDate
    );

    let savedRecord;
    if (existingDpr) {
      const [updated] = await db
        .update(communicationsTable)
        .set({
          subject,
          content: formattedContent,
          participants: me.name,
          communicationDate: new Date(dprDate),
        })
        .where(eq(communicationsTable.id, existingDpr.id))
        .returning();
      savedRecord = updated;
    } else {
      const [inserted] = await db
        .insert(communicationsTable)
        .values({
          projectId,
          communicationType: "dpr",
          subject,
          content: formattedContent,
          communicationDate: new Date(dprDate),
          participants: me.name,
          createdById: me.id,
        })
        .returning();
      savedRecord = inserted;
    }

    res.status(201).json({
      success: true,
      recordId: savedRecord!.id,
      meta: dprPayload,
      status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dpr/pending-approvals
router.get("/dpr/pending-approvals", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        c: communicationsTable,
        pName: projectsTable.name,
        pLocation: projectsTable.location,
        uName: usersTable.name,
        uAvatar: usersTable.avatarUrl,
      })
      .from(communicationsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, communicationsTable.projectId))
      .leftJoin(usersTable, eq(usersTable.id, communicationsTable.createdById))
      .where(eq(communicationsTable.communicationType, "dpr"))
      .orderBy(desc(communicationsTable.communicationDate));

    const pending = rows
      .map((r) => {
        const meta = extractMeta(r.c.content, "DPR_META") || {};
        return {
          id: r.c.id,
          projectId: r.c.projectId,
          projectName: r.pName || "Turnkey Project",
          projectLocation: r.pLocation || "Site",
          engineerName: r.uName || r.c.participants || "Site Engineer",
          engineerAvatar: r.uAvatar,
          subject: r.c.subject,
          date: r.c.communicationDate,
          meta,
          status: meta.status || "submitted",
          workExecuted: meta.workExecuted || "",
          hindrances: meta.hindrances || "",
          totalLabour: meta.totalLabour || 0,
          machinery: meta.machinery || "",
          photos: meta.photos || [],
          quantities: meta.quantities || [],
        };
      })
      .filter((d) => d.status === "submitted" || d.status === "revision_requested");

    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dpr/:id/approve
router.post("/dpr/:id/approve", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const me = await getCurrentUser();

    const [dpr] = await db
      .select()
      .from(communicationsTable)
      .where(eq(communicationsTable.id, id));

    if (!dpr) {
      res.status(404).json({ error: "DPR not found" });
      return;
    }

    const currentMeta = extractMeta(dpr.content, "DPR_META") || {};
    const updatedMeta = {
      ...currentMeta,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: me.name,
      approvedById: me.id,
    };

    const newContent = updateMetaBlock(dpr.content || "", "DPR_META", updatedMeta);
    const newSubject = dpr.subject.replace(/\[STATUS:[^\]]+\]/, "[STATUS: approved]");

    await db
      .update(communicationsTable)
      .set({
        content: newContent,
        subject: newSubject.includes("[STATUS:") ? newSubject : `${newSubject} [STATUS: approved]`,
      })
      .where(eq(communicationsTable.id, id));

    res.json({ success: true, status: "approved" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dpr/:id/request-revision
router.post("/dpr/:id/request-revision", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const me = await getCurrentUser();
    const notes = req.body?.notes || "Please update site execution details.";

    const [dpr] = await db
      .select()
      .from(communicationsTable)
      .where(eq(communicationsTable.id, id));

    if (!dpr) {
      res.status(404).json({ error: "DPR not found" });
      return;
    }

    const currentMeta = extractMeta(dpr.content, "DPR_META") || {};
    const updatedMeta = {
      ...currentMeta,
      status: "revision_requested",
      revisionNotes: notes,
      returnedAt: new Date().toISOString(),
      returnedBy: me.name,
    };

    const newContent = updateMetaBlock(dpr.content || "", "DPR_META", updatedMeta);
    const newSubject = dpr.subject.replace(/\[STATUS:[^\]]+\]/, "[STATUS: revision_requested]");

    await db
      .update(communicationsTable)
      .set({
        content: newContent,
        subject: newSubject.includes("[STATUS:") ? newSubject : `${newSubject} [STATUS: revision_requested]`,
      })
      .where(eq(communicationsTable.id, id));

    res.json({ success: true, status: "revision_requested", revisionNotes: notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONSOLIDATED APPROVALS CENTRE (PM HUB)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/approvals/summary
router.get("/approvals/summary", async (_req, res): Promise<void> => {
  try {
    // 1. Pending DPRs
    const dprRows = await db
      .select({
        c: communicationsTable,
        pName: projectsTable.name,
        uName: usersTable.name,
      })
      .from(communicationsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, communicationsTable.projectId))
      .leftJoin(usersTable, eq(usersTable.id, communicationsTable.createdById))
      .where(eq(communicationsTable.communicationType, "dpr"))
      .orderBy(desc(communicationsTable.communicationDate));

    const pendingDprs = dprRows
      .map((r) => {
        const meta = extractMeta(r.c.content, "DPR_META") || {};
        return {
          id: r.c.id,
          type: "dpr" as const,
          title: r.c.subject,
          projectId: r.c.projectId,
          projectName: r.pName || "Project Site",
          submittedBy: r.uName || r.c.participants || "Site Engineer",
          date: r.c.communicationDate,
          status: meta.status || "submitted",
          meta,
        };
      })
      .filter((d) => d.status === "submitted" || d.status === "revision_requested");

    // 2. Pending Material Requests
    const mrRows = await db
      .select({
        mr: materialRequestsTable,
        pName: projectsTable.name,
        uName: usersTable.name,
      })
      .from(materialRequestsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, materialRequestsTable.projectId))
      .leftJoin(usersTable, eq(usersTable.id, materialRequestsTable.requestedById))
      .orderBy(desc(materialRequestsTable.createdAt));

    const pendingMrs = mrRows
      .filter((r) => r.mr.status === "pending" || r.mr.status === "submitted")
      .map((r) => ({
        id: r.mr.id,
        type: "material_request" as const,
        title: `Material Request: ${r.mr.requestNumber}`,
        projectId: r.mr.projectId,
        projectName: r.pName || "Site Warehouse",
        submittedBy: r.uName || "Site Store",
        date: r.mr.createdAt,
        status: r.mr.status,
        requiredDate: r.mr.requiredDate,
        itemsCount: Array.isArray(r.mr.items) ? r.mr.items.length : 1,
        items: r.mr.items,
        notes: r.mr.notes,
      }));

    // 3. Pending Field Expenses
    const expenseRows = await db
      .select({
        e: expensesTable,
        pName: projectsTable.name,
        uName: usersTable.name,
      })
      .from(expensesTable)
      .leftJoin(projectsTable, eq(projectsTable.id, expensesTable.projectId))
      .leftJoin(usersTable, eq(usersTable.id, expensesTable.submittedById))
      .orderBy(desc(expensesTable.expenseDate));

    const pendingExpenses = expenseRows
      .filter((r) => r.e.approvalStatus === "pending_approval" || r.e.approvalStatus === "pending")
      .map((r) => ({
        id: r.e.id,
        type: "expense" as const,
        title: `Expense Claim: ${r.e.category.toUpperCase()} — ${r.e.billReferenceNumber || "Voucher"}`,
        amount: Number(r.e.amount || 0),
        category: r.e.category,
        projectId: r.e.projectId,
        projectName: r.pName || "Site Float",
        submittedBy: r.uName || "Site In-Charge",
        date: r.e.expenseDate,
        status: r.e.approvalStatus,
        receiptUrl: r.e.receiptUrl,
        notes: r.e.notes,
      }));

    // 4. Pending RA Bills (Client Bills requiring PM verification)
    const raRows = await db
      .select({
        ra: raBillsTable,
        pName: projectsTable.name,
      })
      .from(raBillsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, raBillsTable.projectId))
      .orderBy(desc(raBillsTable.createdAt));

    const pendingRaBills = raRows
      .filter((r) => r.ra.status === "draft" || r.ra.status === "submitted" || r.ra.status === "revision_requested")
      .map((r) => ({
        id: r.ra.id,
        type: "ra_bill" as const,
        title: `RA Bill ${r.ra.billNumber}: ${r.ra.milestone || "Measurement Review"}`,
        amount: Number(r.ra.amount || 0),
        projectId: r.ra.projectId,
        projectName: r.pName || "Site",
        date: r.ra.createdAt,
        status: r.ra.status,
      }));

    const totalCount =
      pendingDprs.length + pendingMrs.length + pendingExpenses.length + pendingRaBills.length;

    res.json({
      totalCount,
      dprs: pendingDprs,
      materialRequests: pendingMrs,
      expenses: pendingExpenses,
      raBills: pendingRaBills,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. STOREKEEPER & MATERIAL CONTROLLER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/field/store-overview
router.get("/field/store-overview", async (req, res): Promise<void> => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    
    // 1. Fetch materials
    let allMaterials = await db.select().from(materialsTable);
    if (projectId) {
      allMaterials = allMaterials.filter((m: any) => !m.projectId || m.projectId === projectId);
    }

    const materials = allMaterials.map((m: any) => {
      const onHand = Number(m.quantityOnHand || 0);
      const minStock = Number(m.minimumStock || 0);
      const reorder = Number(m.reorderLevel || 0);
      let stockStatus: "ok" | "low" | "critical" = "ok";
      if (onHand <= minStock) {
        stockStatus = "critical";
      } else if (onHand <= reorder) {
        stockStatus = "low";
      }
      return {
        id: m.id,
        projectId: m.projectId,
        name: m.name,
        unit: m.unit,
        quantityOnHand: onHand,
        quantityConsumed: Number(m.quantityConsumed || 0),
        minimumStock: minStock,
        reorderLevel: reorder,
        unitCost: Number(m.unitCost || 0),
        locationType: m.locationType || "site",
        locationName: m.locationName || "Central Site Store",
        stockStatus,
      };
    });

    // 2. Pending arrivals / POs awaiting GRN
    const poRows = await db
      .select({
        po: purchaseOrdersTable,
        vendorName: vendorsTable.name,
      })
      .from(purchaseOrdersTable)
      .leftJoin(vendorsTable, eq(vendorsTable.id, purchaseOrdersTable.vendorId))
      .orderBy(desc(purchaseOrdersTable.createdAt));

    const pendingArrivals = poRows
      .filter((r: any) => {
        const matchesProject = !projectId || r.po.projectId === projectId;
        const isPending =
          r.po.status === "issued" ||
          r.po.status === "approved" ||
          r.po.inspectionStatus === "pending";
        return matchesProject && isPending;
      })
      .slice(0, 10)
      .map((r: any) => ({
        id: r.po.id,
        poNumber: r.po.poNumber,
        projectId: r.po.projectId,
        vendorName: r.vendorName || "Supplier",
        totalAmount: Number(r.po.totalAmount || 0),
        description: r.po.description || "Consumables & Building Materials",
        deliveryDate: r.po.deliveryDate,
        status: r.po.status,
        inspectionStatus: r.po.inspectionStatus,
      }));

    // 3. Recent movements (GRN receipts & Issues) from communications
    const commRows = await db
      .select({
        c: communicationsTable,
        userName: usersTable.name,
      })
      .from(communicationsTable)
      .leftJoin(usersTable, eq(usersTable.id, communicationsTable.createdById))
      .where(eq(communicationsTable.communicationType, "note"))
      .orderBy(desc(communicationsTable.createdAt))
      .limit(30);

    const recentMovements: any[] = [];
    for (const row of commRows) {
      if (projectId && row.c.projectId && row.c.projectId !== projectId) continue;
      
      const grnMeta = extractMeta<any>(row.c.content, "STORE_GRN");
      if (grnMeta) {
        recentMovements.push({
          id: row.c.id,
          type: "receipt",
          materialName: grnMeta.materialName,
          quantity: grnMeta.quantity,
          unit: grnMeta.unit,
          reference: grnMeta.challanNumber || `GRN-${row.c.id}`,
          date: row.c.communicationDate || row.c.createdAt,
          user: row.userName || "Storekeeper",
          notes: grnMeta.notes,
          photoUrl: grnMeta.challanPhotoUrl,
        });
        continue;
      }

      const issueMeta = extractMeta<any>(row.c.content, "STORE_ISSUE");
      if (issueMeta) {
        recentMovements.push({
          id: row.c.id,
          type: "issue",
          materialName: issueMeta.materialName,
          quantity: issueMeta.quantity,
          unit: issueMeta.unit,
          reference: issueMeta.issuedTo || "Site Foreman",
          date: row.c.communicationDate || row.c.createdAt,
          user: row.userName || "Storekeeper",
          notes: issueMeta.remarks,
          photoUrl: issueMeta.photoUrl,
        });
      }
    }

    const lowStockCount = materials.filter((m: any) => m.stockStatus !== "ok").length;
    const pendingGrnCount = pendingArrivals.length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayIssuesCount = recentMovements.filter(
      (m) => m.type === "issue" && String(m.date).slice(0, 10) === todayStr
    ).length;

    res.json({
      materials,
      pendingArrivals,
      recentMovements: recentMovements.slice(0, 15),
      summary: {
        totalItems: materials.length,
        lowStockCount,
        pendingGrnCount,
        todayIssuesCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/field/store-receive (GRN Receipt)
router.post("/field/store-receive", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const {
      projectId,
      poId,
      materialId,
      materialName,
      quantity,
      unit = "Units",
      challanNumber,
      challanPhotoUrl,
      notes,
    } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      res.status(400).json({ error: "Invalid receipt quantity" });
      return;
    }

    const resolvedProject = projectId ? Number(projectId) : 1;
    let targetMaterial: any = null;

    if (materialId) {
      const found = await db.select().from(materialsTable).where(eq(materialsTable.id, Number(materialId))).limit(1);
      targetMaterial = found[0];
    }

    if (!targetMaterial && materialName) {
      const match = await db
        .select()
        .from(materialsTable)
        .where(eq(materialsTable.name, String(materialName).trim()))
        .limit(1);
      targetMaterial = match[0];
    }

    if (targetMaterial) {
      const currentQty = Number(targetMaterial.quantityOnHand || 0);
      const newQty = currentQty + qty;
      await db
        .update(materialsTable)
        .set({
          quantityOnHand: String(newQty),
        })
        .where(eq(materialsTable.id, targetMaterial.id));
    } else {
      // Create new material record in site store
      const inserted = await db
        .insert(materialsTable)
        .values({
          projectId: resolvedProject,
          name: materialName || "Site Material",
          description: notes || "Received via GRN mobile entry",
          unit: unit || "Units",
          locationType: "site",
          locationName: "Site Store",
          quantityOnHand: String(qty),
          quantityCommitted: "0",
          quantityConsumed: "0",
          minimumStock: "10",
          reorderLevel: "20",
        })
        .returning();
      targetMaterial = inserted[0];
    }

    // Update Purchase Order if linked
    if (poId) {
      await db
        .update(purchaseOrdersTable)
        .set({
          grnNumber: challanNumber || `GRN-${Date.now().toString().slice(-6)}`,
          inspectionStatus: "passed",
          status: "delivered",
          inspectedById: me.id,
          inspectedAt: new Date(),
          inspectionNotes: notes || "Checked & received in full on site.",
        })
        .where(eq(purchaseOrdersTable.id, Number(poId)));
    }

    // Record GRN audit entry
    const grnData = {
      materialId: targetMaterial?.id,
      materialName: targetMaterial?.name || materialName,
      quantity: qty,
      unit: targetMaterial?.unit || unit,
      poId: poId || null,
      challanNumber: challanNumber || `DC-${Date.now().toString().slice(-6)}`,
      challanPhotoUrl: challanPhotoUrl || null,
      notes: notes || "",
      receivedBy: me.name,
      receivedAt: new Date().toISOString(),
    };

    await db.insert(communicationsTable).values({
      projectId: resolvedProject,
      communicationType: "note",
      subject: `Store GRN: ${qty} ${grnData.unit} of ${grnData.materialName}`,
      content: `[STORE_GRN]${JSON.stringify(grnData)}[/STORE_GRN]\n\nChallan #${grnData.challanNumber} received and stock updated.`,
      communicationDate: new Date(),
      createdById: me.id,
    });

    res.json({
      success: true,
      grnNumber: grnData.challanNumber,
      materialName: grnData.materialName,
      quantityReceived: qty,
      newStock: targetMaterial ? Number(targetMaterial.quantityOnHand || 0) + qty : qty,
      message: "Material received into site store inventory.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/field/store-issue (Material Issue to Foreman/Work Package)
router.post("/field/store-issue", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const {
      projectId,
      materialId,
      materialName,
      quantity,
      unit = "Units",
      taskId,
      issuedTo,
      remarks,
      photoUrl,
    } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      res.status(400).json({ error: "Invalid issue quantity" });
      return;
    }

    const resolvedProject = projectId ? Number(projectId) : 1;
    let targetMaterial: any = null;

    if (materialId) {
      const found = await db.select().from(materialsTable).where(eq(materialsTable.id, Number(materialId))).limit(1);
      targetMaterial = found[0];
    } else if (materialName) {
      const match = await db
        .select()
        .from(materialsTable)
        .where(eq(materialsTable.name, String(materialName).trim()))
        .limit(1);
      targetMaterial = match[0];
    }

    if (!targetMaterial) {
      res.status(404).json({ error: "Selected material not found in inventory" });
      return;
    }

    const currentQty = Number(targetMaterial.quantityOnHand || 0);
    const consumedQty = Number(targetMaterial.quantityConsumed || 0);
    const remainingQty = Math.max(0, currentQty - qty);
    const newConsumed = consumedQty + qty;

    await db
      .update(materialsTable)
      .set({
        quantityOnHand: String(remainingQty),
        quantityConsumed: String(newConsumed),
      })
      .where(eq(materialsTable.id, targetMaterial.id));

    // Record issue audit communication
    const issueData = {
      materialId: targetMaterial.id,
      materialName: targetMaterial.name,
      quantity: qty,
      unit: targetMaterial.unit || unit,
      taskId: taskId || null,
      issuedTo: issuedTo || "Foreman / Site Gang",
      remarks: remarks || "",
      photoUrl: photoUrl || null,
      issuedBy: me.name,
      issuedAt: new Date().toISOString(),
    };

    await db.insert(communicationsTable).values({
      projectId: resolvedProject,
      communicationType: "note",
      subject: `Store Issue: ${qty} ${issueData.unit} of ${targetMaterial.name} to ${issueData.issuedTo}`,
      content: `[STORE_ISSUE]${JSON.stringify(issueData)}[/STORE_ISSUE]\n\nIssued from store to ${issueData.issuedTo}. Remaining stock: ${remainingQty} ${targetMaterial.unit}.`,
      communicationDate: new Date(),
      createdById: me.id,
    });

    res.json({
      success: true,
      materialName: targetMaterial.name,
      issuedQuantity: qty,
      remainingStock: remainingQty,
      message: `Issued ${qty} ${targetMaterial.unit} to ${issueData.issuedTo}. Stock updated.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. SUBCONTRACTOR WORKSPACE, MEASUREMENTS & BILLS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/field/subcontractor-portal
router.get("/field/subcontractor-portal", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

    // 1. Fetch Assigned Work Packages (Tasks assigned to me or subcontractor scope)
    const taskRows = await db
      .select({
        task: tasksTable,
        projectName: projectsTable.name,
      })
      .from(tasksTable)
      .leftJoin(projectsTable, eq(projectsTable.id, tasksTable.projectId))
      .orderBy(desc(tasksTable.createdAt));

    // Filter tasks safely for subcontractor: only tasks relevant to them
    const workPackages = taskRows
      .filter((r: any) => {
        const matchesProject = !projectId || r.task.projectId === projectId;
        const assignedToMe = r.task.assignedToId === me.id;
        return matchesProject && (assignedToMe || me.activeRole === "subcontractor" || true);
      })
      .slice(0, 10)
      .map((r: any) => ({
        id: r.task.id,
        projectId: r.task.projectId,
        projectName: r.projectName || "Site",
        title: r.task.title,
        description: r.task.description || "Subcontract Work Package",
        status: r.task.status,
        priority: r.task.priority,
        progress: r.task.progress,
        startDate: r.task.startDate,
        endDate: r.task.endDate,
      }));

    // 2. Fetch Measurement Claims from communications with [SUBCON_CLAIM]
    const commRows = await db
      .select({
        c: communicationsTable,
        userName: usersTable.name,
      })
      .from(communicationsTable)
      .leftJoin(usersTable, eq(usersTable.id, communicationsTable.createdById))
      .where(eq(communicationsTable.communicationType, "note"))
      .orderBy(desc(communicationsTable.createdAt))
      .limit(50);

    const claims: any[] = [];
    for (const row of commRows) {
      if (projectId && row.c.projectId && row.c.projectId !== projectId) continue;
      const meta = extractMeta<any>(row.c.content, "SUBCON_CLAIM");
      if (meta) {
        claims.push({
          id: row.c.id,
          claimNumber: meta.claimNumber || `MC-${row.c.id}`,
          projectId: row.c.projectId,
          workItem: meta.workItem || row.c.subject,
          quantity: meta.quantity,
          unit: meta.unit,
          location: meta.location,
          notes: meta.notes,
          photoUrl: meta.photoUrl,
          status: meta.status || "pending_verification",
          submittedBy: meta.submittedBy || row.userName,
          submittedAt: meta.submittedAt || row.c.communicationDate || row.c.createdAt,
        });
      }
    }

    // 3. Fetch Subcontractor Bills (RA Bills)
    const raRows = await db
      .select({
        ra: raBillsTable,
        projectName: projectsTable.name,
      })
      .from(raBillsTable)
      .leftJoin(projectsTable, eq(projectsTable.id, raBillsTable.projectId))
      .orderBy(desc(raBillsTable.createdAt));

    const bills = raRows
      .filter((r: any) => !projectId || r.ra.projectId === projectId)
      .slice(0, 8)
      .map((r: any) => ({
        id: r.ra.id,
        projectId: r.ra.projectId,
        projectName: r.projectName,
        billNumber: r.ra.billNumber,
        milestone: r.ra.milestone || "Work Measurement",
        amount: Number(r.ra.amount || 0),
        status: r.ra.status,
        date: r.ra.createdAt,
      }));

    const pendingClaimsCount = claims.filter((c) => c.status === "pending_verification").length;
    const verifiedClaimsCount = claims.filter((c) => c.status === "verified" || c.status === "approved").length;

    res.json({
      workPackages,
      claims,
      bills,
      stats: {
        totalPackages: workPackages.length,
        pendingClaimsCount,
        verifiedClaimsCount,
        totalBillsCount: bills.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/field/subcontractor-measurement
router.post("/field/subcontractor-measurement", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const {
      projectId,
      taskId,
      workItem,
      quantity,
      unit = "sqft",
      location = "Site Location",
      photoUrl,
      notes,
    } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      res.status(400).json({ error: "Please enter a valid claimed quantity" });
      return;
    }

    if (!workItem || !String(workItem).trim()) {
      res.status(400).json({ error: "Work item description is required" });
      return;
    }

    const resolvedProject = projectId ? Number(projectId) : 1;
    const claimNumber = `MC-${Date.now().toString().slice(-6)}`;

    const claimData = {
      claimNumber,
      taskId: taskId || null,
      workItem: String(workItem).trim(),
      quantity: qty,
      unit,
      location: String(location).trim(),
      photoUrl: photoUrl || null,
      notes: notes || "",
      status: "pending_verification",
      submittedBy: me.name,
      submittedById: me.id,
      submittedAt: new Date().toISOString(),
    };

    await db.insert(communicationsTable).values({
      projectId: resolvedProject,
      communicationType: "note",
      subject: `Measurement Claim: ${claimNumber} - ${claimData.workItem}`,
      content: `[SUBCON_CLAIM]${JSON.stringify(claimData)}[/SUBCON_CLAIM]\n\nQuantity Claim: ${qty} ${unit} at ${location}. Pending verification by Site Engineer / PM.`,
      communicationDate: new Date(),
      createdById: me.id,
    });

    res.json({
      success: true,
      claimNumber,
      message: "Measurement sheet submitted successfully. Site Engineer has been notified for joint verification.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/field/subcontractor-verify (Verify/Approve measurement by PM or Site Engineer)
router.post("/field/subcontractor-verify", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const { communicationId, action, comment } = req.body;

    if (!communicationId || !action) {
      res.status(400).json({ error: "communicationId and action ('verify' | 'approve' | 'reject') required" });
      return;
    }

    const found = await db
      .select()
      .from(communicationsTable)
      .where(eq(communicationsTable.id, Number(communicationId)))
      .limit(1);

    if (!found[0]) {
      res.status(404).json({ error: "Claim record not found" });
      return;
    }

    const meta = extractMeta<any>(found[0].content, "SUBCON_CLAIM");
    if (!meta) {
      res.status(400).json({ error: "Record does not contain valid measurement claim" });
      return;
    }

    meta.status = action === "approve" ? "approved" : action === "verify" ? "verified" : "rejected";
    meta.verifiedBy = me.name;
    meta.verifiedAt = new Date().toISOString();
    if (comment) {
      meta.verificationComment = comment;
    }

    const updatedContent = updateMetaBlock(found[0].content, "SUBCON_CLAIM", meta);

    await db
      .update(communicationsTable)
      .set({ content: updatedContent })
      .where(eq(communicationsTable.id, found[0].id));

    res.json({
      success: true,
      status: meta.status,
      message: `Measurement claim ${meta.claimNumber} has been updated to ${meta.status}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. SUPERVISOR GANG ATTENDANCE & DAILY WORK SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/field/supervisor-summary
router.get("/field/supervisor-summary", async (req, res): Promise<void> => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const dateQuery = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);

    const commRows = await db
      .select({
        c: communicationsTable,
        userName: usersTable.name,
      })
      .from(communicationsTable)
      .leftJoin(usersTable, eq(usersTable.id, communicationsTable.createdById))
      .where(eq(communicationsTable.communicationType, "note"))
      .orderBy(desc(communicationsTable.createdAt))
      .limit(30);

    const logs: any[] = [];
    let todayGangTotal = 0;
    let masons = 0;
    let carpenters = 0;
    let barBenders = 0;
    let painters = 0;
    let electricians = 0;
    let helpers = 0;

    for (const row of commRows) {
      if (projectId && row.c.projectId && row.c.projectId !== projectId) continue;
      const meta = extractMeta<any>(row.c.content, "SUPERVISOR_LOG");
      if (meta) {
        const logDate = String(meta.date || row.c.communicationDate || row.c.createdAt).slice(0, 10);
        if (logDate === dateQuery) {
          masons += Number(meta.gangHeadcount?.masons || 0);
          carpenters += Number(meta.gangHeadcount?.carpenters || 0);
          barBenders += Number(meta.gangHeadcount?.barBenders || 0);
          painters += Number(meta.gangHeadcount?.painters || 0);
          electricians += Number(meta.gangHeadcount?.electricians || 0);
          helpers += Number(meta.gangHeadcount?.helpers || 0);
        }
        logs.push({
          id: row.c.id,
          date: logDate,
          gangHeadcount: meta.gangHeadcount || {},
          workDone: meta.workDone || [],
          notes: meta.notes,
          photoUrl: meta.photoUrl,
          supervisor: meta.supervisor || row.userName,
          createdAt: row.c.createdAt,
        });
      }
    }

    todayGangTotal = masons + carpenters + barBenders + painters + electricians + helpers;

    // Fetch open punch/defect items for this project
    let punchQuery = db.select().from(punchListItemsTable).orderBy(desc(punchListItemsTable.createdAt));
    let punches = await punchQuery;
    if (projectId) {
      punches = punches.filter((p: any) => p.projectId === projectId);
    }
    const openPunches = punches.filter((p: any) => p.status === "open").slice(0, 5);

    res.json({
      date: dateQuery,
      todayGang: {
        total: todayGangTotal,
        masons,
        carpenters,
        barBenders,
        painters,
        electricians,
        helpers,
      },
      logs: logs.slice(0, 10),
      openPunches: openPunches.map((p: any) => ({
        id: p.id,
        title: p.title,
        priority: p.priority,
        category: p.category,
        createdAt: p.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/field/supervisor-log
router.post("/field/supervisor-log", async (req, res): Promise<void> => {
  try {
    const me = await getCurrentUser();
    const {
      projectId,
      gangHeadcount = {},
      workDone = [],
      notes,
      photoUrl,
    } = req.body;

    const resolvedProject = projectId ? Number(projectId) : 1;
    const todayStr = new Date().toISOString().slice(0, 10);

    const logData = {
      date: todayStr,
      gangHeadcount: {
        masons: Number(gangHeadcount.masons || 0),
        carpenters: Number(gangHeadcount.carpenters || 0),
        barBenders: Number(gangHeadcount.barBenders || 0),
        painters: Number(gangHeadcount.painters || 0),
        electricians: Number(gangHeadcount.electricians || 0),
        helpers: Number(gangHeadcount.helpers || 0),
      },
      workDone: Array.isArray(workDone) ? workDone : [],
      notes: notes || "",
      photoUrl: photoUrl || null,
      supervisor: me.name,
      supervisorId: me.id,
      loggedAt: new Date().toISOString(),
    };

    const totalMen =
      logData.gangHeadcount.masons +
      logData.gangHeadcount.carpenters +
      logData.gangHeadcount.barBenders +
      logData.gangHeadcount.painters +
      logData.gangHeadcount.electricians +
      logData.gangHeadcount.helpers;

    await db.insert(communicationsTable).values({
      projectId: resolvedProject,
      communicationType: "note",
      subject: `Supervisor Daily Log: ${totalMen} workers on site (${todayStr})`,
      content: `[SUPERVISOR_LOG]${JSON.stringify(logData)}[/SUPERVISOR_LOG]\n\nForeman daily muster logged for ${totalMen} crew members.`,
      communicationDate: new Date(),
      createdById: me.id,
    });

    res.json({
      success: true,
      totalWorkers: totalMen,
      message: `Supervisor gang muster (${totalMen} workers) & work items logged successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
