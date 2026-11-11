import { Router, type IRouter } from "express";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getCurrentUser, setActiveRole, clearUserCache, setSessionUser } from "../lib/session";
import { hashPassword, verifyPassword } from "../lib/password";

const router: IRouter = Router();

router.get("/auth/me", async (_req, res): Promise<void> => {
  const user = await getCurrentUser();
  res.json(user);
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password, userId } = req.body || {};

  let user;
  if (userId) {
    [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId))).limit(1);
  } else if (email) {
    [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
  }

  if (!user) {
    res.status(404).json({ error: "User not found with provided credentials" });
    return;
  }

  if (user.status === "inactive" || user.status === "suspended") {
    res.status(403).json({ error: "This user account has been deactivated. Please contact your administrator." });
    return;
  }

  if (password && user.passwordHash && user.passwordSalt) {
    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      res.status(401).json({ error: "Invalid password. Default password is Kanak@123." });
      return;
    }
  }

  const sessionUser = setSessionUser(user);
  res.json(sessionUser);
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  clearUserCache();
  res.json({ success: true, message: "Logged out successfully" });
});

router.post("/auth/switch-role", async (req, res): Promise<void> => {
  const role = (req.body?.role ?? "").toString();
  if (!role) {
    res.status(400).json({ error: "role required" });
    return;
  }
  const user = await setActiveRole(role);
  res.json(user);
});

router.post("/auth/change-password", async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters long" });
    return;
  }

  const me = await getCurrentUser();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, me.id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // If user already has a password set, verify current password
  if (user.passwordHash && user.passwordSalt) {
    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required" });
      return;
    }
    const isValid = verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      res.status(400).json({ error: "Current password does not match our records" });
      return;
    }
  }

  const { hash, salt } = hashPassword(newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash: hash, passwordSalt: salt })
    .where(eq(usersTable.id, me.id));

  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: "Password changed successfully",
      resourceType: "user",
      resourceId: me.id,
      status: "success",
    },
  ]);

  clearUserCache();
  res.json({ success: true, message: "Password updated successfully" });
});

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.id);
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      roles: u.roles ?? [],
      activeRole: u.activeRole,
      phone: u.phone ?? "",
      designation: u.designation ?? "",
      department: u.department ?? "",
      status: u.status ?? "active",
      hasPasswordSet: Boolean(u.passwordHash),
      createdAt: u.createdAt,
    })),
  );
});

router.post("/users", async (req, res): Promise<void> => {
  const {
    name,
    email,
    password,
    roles = ["viewer"],
    activeRole = "viewer",
    phone,
    designation,
    department,
    status = "active",
  } = req.body || {};

  if (!name || !email) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase()))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "A user with this email address already exists" });
    return;
  }

  const rawPassword = password && password.length >= 6 ? password : "Kanak@123";
  const { hash, salt } = hashPassword(rawPassword);

  const [newUser] = await db
    .insert(usersTable)
    .values([
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: hash,
        passwordSalt: salt,
        roles: Array.isArray(roles) && roles.length > 0 ? roles : ["viewer"],
        activeRole: activeRole || "viewer",
        phone: phone || null,
        designation: designation || null,
        department: department || null,
        status: status || "active",
      },
    ])
    .returning();

  const me = await getCurrentUser();
  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: `Created user ${newUser!.name} (${newUser!.email})`,
      resourceType: "user",
      resourceId: newUser!.id,
      status: "success",
    },
  ]);

  res.status(201).json({
    id: newUser!.id,
    email: newUser!.email,
    name: newUser!.name,
    avatarUrl: newUser!.avatarUrl,
    roles: newUser!.roles ?? [],
    activeRole: newUser!.activeRole,
    phone: newUser!.phone ?? "",
    designation: newUser!.designation ?? "",
    department: newUser!.department ?? "",
    status: newUser!.status ?? "active",
    hasPasswordSet: true,
    createdAt: newUser!.createdAt,
  });
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!, 10);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updates: any = {};
  if (req.body.name !== undefined) updates.name = req.body.name.trim();
  if (req.body.email !== undefined) updates.email = req.body.email.trim().toLowerCase();
  if (req.body.roles !== undefined && Array.isArray(req.body.roles)) updates.roles = req.body.roles;
  if (req.body.activeRole !== undefined) updates.activeRole = req.body.activeRole;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.designation !== undefined) updates.designation = req.body.designation;
  if (req.body.department !== undefined) updates.department = req.body.department;
  if (req.body.status !== undefined) updates.status = req.body.status;

  if (req.body.newPassword && typeof req.body.newPassword === "string" && req.body.newPassword.length >= 6) {
    const { hash, salt } = hashPassword(req.body.newPassword);
    updates.passwordHash = hash;
    updates.passwordSalt = salt;
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  clearUserCache();

  const me = await getCurrentUser();
  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: `Updated profile for user ${updatedUser!.name}`,
      resourceType: "user",
      resourceId: updatedUser!.id,
      status: "success",
    },
  ]);

  res.json({
    id: updatedUser!.id,
    email: updatedUser!.email,
    name: updatedUser!.name,
    avatarUrl: updatedUser!.avatarUrl,
    roles: updatedUser!.roles ?? [],
    activeRole: updatedUser!.activeRole,
    phone: updatedUser!.phone ?? "",
    designation: updatedUser!.designation ?? "",
    department: updatedUser!.department ?? "",
    status: updatedUser!.status ?? "active",
    hasPasswordSet: Boolean(updatedUser!.passwordHash),
    createdAt: updatedUser!.createdAt,
  });
});

router.patch("/users/:id/roles", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!, 10);
  const roles: string[] = Array.isArray(req.body?.roles) ? req.body.roles : [];
  const [user] = await db
    .update(usersTable)
    .set({ roles })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  clearUserCache();
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    roles: user.roles ?? [],
    activeRole: user.activeRole,
    phone: user.phone ?? "",
    designation: user.designation ?? "",
    department: user.department ?? "",
    status: user.status ?? "active",
    hasPasswordSet: Boolean(user.passwordHash),
  });
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!, 10);
  const me = await getCurrentUser();
  if (me.id === id) {
    res.status(400).json({ error: "You cannot delete your own currently active account" });
    return;
  }

  const [deletedUser] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deletedUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(auditLogsTable).values([
    {
      userId: me.id,
      activity: `Deleted user ${deletedUser.name} (${deletedUser.email})`,
      resourceType: "user",
      resourceId: deletedUser.id,
      status: "success",
    },
  ]);

  res.json({ success: true, message: "User deleted successfully" });
});

export default router;
