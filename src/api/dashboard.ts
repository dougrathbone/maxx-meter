import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import { ingressBasePath, withIngressBase } from "./ingress.js";
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  listAccountsForUser,
} from "../accounts/registry.js";
import { deleteCredential, getCredential, saveCredential } from "../auth/vault.js";
import {
  claudeExpiresAt,
  exchangeClaudeOAuthCode,
  startClaudeOAuth,
} from "../auth/claude-oauth.js";
import { loadSettings, saveSettings } from "../config.js";
import { GlobalSettingsSchema, ProviderIdSchema } from "../models.js";
import type { UsagePoller } from "../poller.js";
import type { MqttPublisher } from "../mqtt/publisher.js";
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

const DASHBOARD_MISSING_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>MaxxMeter</title></head>
<body><h1>MaxxMeter</h1>
<p>The dashboard bundle is missing. Rebuild the add-on (<code>npm run build</code>) and restart.</p>
</body></html>`;

// Supervisor lives on 172.30.32.0/23; ingress requests always arrive from that subnet.
const SUPERVISOR_SUBNET = /^(?:::ffff:)?172\.30\.3[23]\.\d{1,3}$/;

function isTrustedRemote(remote: string): boolean {
  return (
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1" ||
    SUPERVISOR_SUBNET.test(remote)
  );
}

export async function createDashboardServer(poller: UsagePoller, mqtt?: MqttPublisher) {
  const app = Fastify({ logger: false });

  app.addHook("onRequest", async (req, reply) => {
    const trusted =
      isTrustedRemote(req.socket.remoteAddress ?? "") ||
      process.env.MAXXMETER_TRUST_ALL_INGRESS === "true";
    if (!trusted && process.env.NODE_ENV === "production") {
      return reply.code(403).send({ error: "ingress only" });
    }
  });

  app.get("/api/dashboard/me", async (req) => {
    const user = resolveUserFromRequest(req);
    return { userId: user.userId, userName: user.userName, isAdmin: user.isAdmin };
  });

  app.get("/api/dashboard/users", async (req, reply) => {
    const user = resolveUserFromRequest(req);
    if (!user.isAdmin) return reply.code(403).send({ error: "admin only" });
    const accounts = await listAccounts();
    const byUser = new Map<string, string>();
    for (const a of accounts) {
      if (!byUser.has(a.ownerUserId)) {
        byUser.set(a.ownerUserId, a.ownerUserName ?? a.ownerUserId);
      }
    }
    return [...byUser.entries()]
      .map(([userId, userName]) => ({ userId, userName }))
      .sort((a, b) => a.userName.localeCompare(b.userName));
  });

  app.get<{ Querystring: { userId?: string } }>("/api/dashboard/usage", async (req) => {
    const user = resolveUserFromRequest(req);
    const target = resolveTargetUserId(user, req.query.userId);
    return poller.getSnapshotsForUser(target);
  });

  app.get<{ Querystring: { userId?: string } }>("/api/dashboard/accounts", async (req) => {
    const user = resolveUserFromRequest(req);
    const target = resolveTargetUserId(user, req.query.userId);
    const accounts = await listAccountsForUser(target);
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

  app.get<{ Querystring: { userId?: string } }>("/api/dashboard/panels", async (req) => {
    const user = resolveUserFromRequest(req);
    const target = resolveTargetUserId(user, req.query.userId);
    return listPanelsForUser(target);
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
    const mqttBody = body.mqtt as { password?: string } | undefined;
    const haBody = body.ha as { token?: string } | undefined;
    const next = GlobalSettingsSchema.parse({
      ...current,
      ...body,
      mqtt: {
        ...current.mqtt,
        ...(body.mqtt as object),
        password:
          mqttBody?.password === "***"
            ? current.mqtt.password
            : (mqttBody?.password ?? current.mqtt.password),
      },
      ha: {
        ...current.ha,
        ...(body.ha as object),
        token:
          haBody?.token === "***" ? current.ha.token : (haBody?.token ?? current.ha.token),
      },
    });
    await saveSettings(next);
    poller.restart();
    void poller.pollOnce();
    if (mqtt) {
      const latest = await loadSettings();
      mqtt.reconnect(latest);
    }
    return { ok: true };
  });

  app.get<{ Querystring: { accountId?: string } }>(
    "/api/auth/claude/start",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const accountId = req.query.accountId;
      if (!accountId) return reply.code(400).send({ error: "accountId required" });

      const account = await getAccount(accountId);
      if (!account) return reply.code(404).send({ error: "account not found" });
      if (account.ownerUserId !== user.userId && !user.isAdmin) {
        return reply.code(403).send({ error: "forbidden" });
      }
      if (account.provider !== "claude") {
        return reply.code(400).send({ error: "not a claude account" });
      }

      const result = await startClaudeOAuth({
        accountId: account.id,
        ownerUserId: account.ownerUserId,
      });
      return result;
    },
  );

  app.post<{ Body: { stateId?: string; code?: string } }>(
    "/api/auth/claude/exchange",
    async (req, reply) => {
      const user = resolveUserFromRequest(req);
      const stateId = req.body?.stateId?.trim();
      const code = req.body?.code?.trim();
      if (!stateId || !code) {
        return reply.code(400).send({ error: "stateId and code required" });
      }

      try {
        const result = await exchangeClaudeOAuthCode({ stateId, code });
        const account = await getAccount(result.accountId);
        if (!account) return reply.code(404).send({ error: "account not found" });
        if (account.ownerUserId !== user.userId && !user.isAdmin) {
          return reply.code(403).send({ error: "forbidden" });
        }

        await saveCredential({
          accountId: result.accountId,
          ownerUserId: result.ownerUserId,
          provider: "claude",
          authMethod: "oauth",
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresAt: claudeExpiresAt(result.expires_in),
          connectedAt: new Date().toISOString(),
        });
        await poller.pollOnce();
        return { ok: true, accountId: result.accountId };
      } catch (err) {
        return reply.code(400).send({
          error: err instanceof Error ? err.message : "OAuth exchange failed",
        });
      }
    },
  );

  // Cursor/Kimi: token paste fallback (OAuth requires provider-registered redirect URIs)
  app.get<{ Params: { provider: string } }>(
    "/api/auth/:provider/start",
    async (req, reply) => {
      const provider = req.params.provider;
      if (provider === "claude") {
        return reply.code(400).send({ error: "Use /api/auth/claude/start?accountId=" });
      }
      return reply.redirect(
        `${ingressBasePath(req)}/accounts?oauth=manual&provider=${encodeURIComponent(provider)}`,
      );
    },
  );

  const dashboardDist = join(__dirname, "../../dashboard/dist");
  const indexHtml = await readIndexHtml(dashboardDist);

  const sendIndex = (req: FastifyRequest, reply: FastifyReply) =>
    reply
      .type("text/html; charset=utf-8")
      .send(withIngressBase(indexHtml, ingressBasePath(req)));

  // Intercept before @fastify/static so the shell always carries a <base href> pointing at
  // the ingress prefix; without it the browser asks Home Assistant for ./assets and /api.
  app.addHook("onRequest", async (req, reply) => {
    if (req.method !== "GET" && req.method !== "HEAD") return;
    const path = req.url.split("?")[0];
    if (path === "/" || path === "/index.html") {
      return sendIndex(req, reply);
    }
  });

  await app.register(fastifyStatic, {
    root: dashboardDist,
    prefix: "/",
    index: false,
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not found" });
    }
    return sendIndex(req, reply);
  });

  return app;
}

async function readIndexHtml(dashboardDist: string): Promise<string> {
  try {
    return await readFile(join(dashboardDist, "index.html"), "utf8");
  } catch {
    console.warn(`MaxxMeter: dashboard bundle not found at ${dashboardDist}`);
    return DASHBOARD_MISSING_HTML;
  }
}
