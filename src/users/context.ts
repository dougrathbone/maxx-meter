import type { FastifyRequest } from "fastify";

export interface HaUserContext {
  userId: string;
  userName: string;
  isAdmin: boolean;
}

const SINGLE_USER: HaUserContext = {
  userId: "default",
  userName: "Default User",
  isAdmin: true,
};

export function resolveUserFromRequest(req: FastifyRequest): HaUserContext {
  const userId = headerString(req, "x-remote-user-id");
  const userName = headerString(req, "x-remote-user-name") ?? userId ?? "User";
  const adminHeader = headerString(req, "x-remote-user-is-admin");

  if (!userId) {
    if (process.env.MAXXMETER_DEV_USER_ID) {
      return {
        userId: process.env.MAXXMETER_DEV_USER_ID,
        userName: process.env.MAXXMETER_DEV_USER_NAME ?? "Dev User",
        isAdmin: process.env.MAXXMETER_DEV_IS_ADMIN !== "false",
      };
    }
    return SINGLE_USER;
  }

  return {
    userId,
    userName,
    isAdmin: adminHeader === "true" || adminHeader === "1",
  };
}

export function resolveTargetUserId(
  ctx: HaUserContext,
  requestedUserId?: string,
): string {
  if (requestedUserId && ctx.isAdmin) return requestedUserId;
  return ctx.userId;
}

function headerString(req: FastifyRequest, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}
