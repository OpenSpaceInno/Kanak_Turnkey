import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
  activeRole: string;
};

let cachedUser: CurrentUser | null = null;

export async function getCurrentUser(): Promise<CurrentUser> {
  if (cachedUser) return cachedUser;
  const [user] = await db.select().from(usersTable).orderBy(usersTable.id).limit(1);
  if (!user) throw new Error("No seed user found");
  cachedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    roles: user.roles ?? [],
    activeRole: user.activeRole,
  };
  return cachedUser;
}

export async function setActiveRole(role: string): Promise<CurrentUser> {
  const current = await getCurrentUser();
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
