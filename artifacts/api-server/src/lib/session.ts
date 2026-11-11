import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
  activeRole: string;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  status?: string | null;
};

let cachedUser: CurrentUser | null = null;

export async function getCurrentUser(userIdOverride?: number | string | null): Promise<CurrentUser> {
  if (userIdOverride) {
    const numId = Number(userIdOverride);
    if (!Number.isNaN(numId) && numId > 0) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, numId)).limit(1);
      if (user) {
        cachedUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl ?? null,
          roles: user.roles ?? [],
          activeRole: user.activeRole || (user.roles && user.roles[0]) || "viewer",
          phone: user.phone ?? null,
          designation: user.designation ?? null,
          department: user.department ?? null,
          status: user.status ?? "active",
        };
        return cachedUser;
      }
    }
  }

  if (cachedUser) return cachedUser;
  const [user] = await db.select().from(usersTable).orderBy(usersTable.id).limit(1);
  if (!user) throw new Error("No seed user found");
  cachedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    roles: user.roles ?? [],
    activeRole: user.activeRole || (user.roles && user.roles[0]) || "viewer",
    phone: user.phone ?? null,
    designation: user.designation ?? null,
    department: user.department ?? null,
    status: user.status ?? "active",
  };
  return cachedUser;
}

export async function setActiveRole(role: string, userIdOverride?: number | string | null): Promise<CurrentUser> {
  const current = await getCurrentUser(userIdOverride);
  await db
    .update(usersTable)
    .set({ activeRole: role })
    .where(eq(usersTable.id, current.id));
  cachedUser = { ...current, activeRole: role };
  return cachedUser;
}

export function clearUserCache() {
  cachedUser = null;
}

export function setSessionUser(user: any): CurrentUser {
  cachedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    roles: user.roles ?? [],
    activeRole: user.activeRole || (user.roles && user.roles[0]) || "viewer",
    phone: user.phone ?? null,
    designation: user.designation ?? null,
    department: user.department ?? null,
    status: user.status ?? "active",
  };
  return cachedUser;
}
