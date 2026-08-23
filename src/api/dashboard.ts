import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccountsForUser,
} from "../accounts/registry.js";
import { deleteCredential, getCredential, saveCredential } from "../auth/vault.js";
import { loadSettings, saveSettings } from "../config.js";
import { ProviderIdSchema } from "../models.js";
import type { UsagePoller } from "../poller.js";
import {
  createPanel,
  deletePanel,
  getPanel,
  listPanelsForUser,
  regeneratePanelApiKey,
  updatePanel,
} from "../panels/registry.js";
import { resolveTargetUserId, resolveUserFromRequest } from "../users/context.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function createDashboardServer(poller: UsagePoller) {
  const app = Fastify({ logger: false });

  app.addHook("onRequest", async (req, reply) => {
    const remote = req.socket.remoteAddress ?? "";
    const trusted =
      remote === "172.30.32.2" ||
      remote === "127.0.0.1" ||
      remote === "::1" ||
      remote === "::ffff:127.0.0.1" ||
      process.env.MAXXMETER_TRUST_ALL_INGRESS === "true";
    if (!trusted && process.env.NODE_ENV === "production") {
      return reply.code(403).send({ error: "ingress only" });
    }
  });

  app.get("/api/dashboard/me", async (req) => {
    const user = resolveUserFromRequest(req);
    return { userId: user.userId, userName: user.userName, isAdmin: user.isAdmin };
  });

  app.get<{ Querystring: { userId?: string } }>("/api/dashboard/usage", async (req) => {
    const user = resolveUserFromRequest(req);
    const target = resolveTargetUserId(user, req.query.userId);
    return poller.getSnapshotsForUser(target);
  });

  app.get("/api/dashboard/accounts", async (req) => {
    const user = resolveUserFromRequest(req);
    const accounts = await listAccountsForUser(user.userId);
    const enriched = await Promise.all(
      accounts.map(async (a) => ({
        ...a,
        connected: Boolean(await getCredential(a.id)),
      })),
    );
    return enriched;
  });

  app.post<{ Body: { provider: string; label: string } }>(
    "/api/dashboard/accounts",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const provider = ProviderIdSchema.safeParse(req.body?.provider);
      const label = req.body?.label?.trim();
      if (!provider.success || !label) {
        return reply.code(400).send({ error: "provider and label required" });
      }
      const account = await createAccount({
        provider: provider.data,
        label,
        ownerUserId: user.userId,
        ownerUserName: user.userName,
      });
      return account;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/dashboard/accounts/:id",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const account = await getAccount(req.params.id);
      if (!account) return reply.code(404).send({ error: "not found" });
      if (account.ownerUserId !== user.userId && !user.isAdmin) {
        return reply.code(403).send({ error: "forbidden" });
      }
      await deleteCredential(account.id);
      await deleteAccount(account.id);
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string }; Body: { token: string; authMethod?: string } }>(
    "/api/dashboard/accounts/:id/connect",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const account = await getAccount(req.params.id);
      if (!account) return reply.code(404).send({ error: "not found" });
      if (account.ownerUserId !== user.userId && !user.isAdmin) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const token = req.body?.token?.trim();
      if (!token) return reply.code(400).send({ error: "token required" });

      const authMethod =
        req.body.authMethod === "oauth"
          ? "oauth"
          : account.provider === "kimi"
            ? "api_key"
            : account.provider === "cursor"
              ? "session"
              : "session";

      await saveCredential({
        accountId: account.id,
        ownerUserId: account.ownerUserId,
        provider: account.provider,
        authMethod,
        accessToken: token,
        connectedAt: new Date().toISOString(),
      });
      await poller.pollOnce();
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/dashboard/accounts/:id/disconnect",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const account = await getAccount(req.params.id);
      if (!account) return reply.code(404).send({ error: "not found" });
      if (account.ownerUserId !== user.userId && !user.isAdmin) {
        return reply.code(403).send({ error: "forbidden" });
      }
      await deleteCredential(account.id);
      await poller.pollOnce();
      return { ok: true };
    },
  );

  app.get("/api/dashboard/panels", async (req) => {
    const user = resolveUserFromRequest(req);
    return listPanelsForUser(user.userId);
  });

  app.post<{
    Body: { label: string; deviceProfile: string; accountIds?: string[] };
  }>("/api/dashboard/panels", async (req, reply) => {
    const user = resolveUserFromRequest(req);
    const label = req.body?.label?.trim();
    const deviceProfile = req.body?.deviceProfile;
    if (!label || (deviceProfile !== "nspanel-eu" && deviceProfile !== "nspanel-us-portrait")) {
      return reply.code(400).send({ error: "label and deviceProfile required" });
    }
    const owned = await listAccountsForUser(user.userId);
    const ownedIds = new Set(owned.map((a) => a.id));
    const accountIds = (req.body.accountIds ?? owned.map((a) => a.id)).filter((id) =>
      ownedIds.has(id),
    );
    const panel = await createPanel({
      label,
      deviceProfile,
      ownerUserId: user.userId,
      accountIds,
    });
    return panel;
  });

  app.put<{
    Params: { id: string };
    Body: { label?: string; accountIds?: string[]; deviceProfile?: string };
  }>("/api/dashboard/panels/:id", async (req, reply) => {
    const user = resolveUserFromRequest(req);
    const panel = await getPanel(req.params.id);
    if (!panel) return reply.code(404).send({ error: "not found" });
    if (panel.ownerUserId !== user.userId && !user.isAdmin) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const owned = await listAccountsForUser(panel.ownerUserId);
    const ownedIds = new Set(owned.map((a) => a.id));
    const accountIds = req.body.accountIds?.filter((id) => ownedIds.has(id));
    const updated = await updatePanel(panel.id, {
      label: req.body.label?.trim() || panel.label,
      accountIds: accountIds ?? panel.accountIds,
      deviceProfile:
        req.body.deviceProfile === "nspanel-eu" || req.body.deviceProfile === "nspanel-us-portrait"
          ? req.body.deviceProfile
          : panel.deviceProfile,
    });
    return updated;
  });

  app.post<{ Params: { id: string } }>(
    "/api/dashboard/panels/:id/regenerate-key",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const panel = await getPanel(req.params.id);
      if (!panel) return reply.code(404).send({ error: "not found" });
      if (panel.ownerUserId !== user.userId && !user.isAdmin) {
        return reply.code(403).send({ error: "forbidden" });
      }
      return regeneratePanelApiKey(panel.id);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/dashboard/panels/:id",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const panel = await getPanel(req.params.id);
      if (!panel) return reply.code(404).send({ error: "not found" });
      if (panel.ownerUserId !== user.userId && !user.isAdmin) {
        return reply.code(403).send({ error: "forbidden" });
      }
      await deletePanel(panel.id);
      return { ok: true };
    },
  );

  app.get("/api/dashboard/settings", async (req, reply) => {
    const user = resolveUserFromRequest(req);
    if (!user.isAdmin) return reply.code(403).send({ error: "admin only" });
    const settings = await loadSettings();
    return {
      ...settings,
      ha: { ...settings.ha, token: settings.ha.token ? "***" : "" },
      mqtt: { ...settings.mqtt, password: settings.mqtt.password ? "***" : "" },
    };
  });

  app.put<{ Body: Record<string, unknown> }>("/api/dashboard/settings", async (req, reply) => {
    const user = resolveUserFromRequest(req);
    if (!user.isAdmin) return reply.code(403).send({ error: "admin only" });
    const current = await loadSettings();
    const body = req.body ?? {};
    const next = {
      ...current,
      ...body,
      mqtt: { ...current.mqtt, ...(body.mqtt as object) },
      ha: {
        ...current.ha,
        ...(body.ha as object),
        token:
          (body.ha as { token?: string })?.token === "***"
            ? current.ha.token
            : ((body.ha as { token?: string })?.token ?? current.ha.token),
      },
    };
    await saveSettings(next);
    return { ok: true };
  });

  // OAuth placeholder — redirects documented for future PKCE implementation
  app.get<{ Params: { provider: string } }>(
    "/api/auth/:provider/start",
    async (req, reply) => {
      return reply.redirect(
        `/accounts?oauth=pending&provider=${encodeURIComponent(req.params.provider)}`,
      );
    },
  );

  const dashboardDist = join(__dirname, "../../dashboard/dist");
  await app.register(fastifyStatic, {
    root: dashboardDist,
    prefix: "/",
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not found" });
    }
    return reply.sendFile("index.html");
  });

  return app;
}
