type UsageWindow = { id: string; usedPct: number; resetsAt: string | null };
type Snapshot = {
  accountId: string;
  label: string;
  provider: string;
  status: string;
  windows: UsageWindow[];
  thresholds: { warnPct: number; criticalPct: number };
  errorMessage?: string;
};
type Account = {
  id: string;
  provider: string;
  label: string;
  connected: boolean;
};
type Panel = {
  id: string;
  label: string;
  deviceProfile: string;
  accountIds: string[];
  apiKey: string;
  lastSeenAt?: string;
};
type Me = { userId: string; userName: string; isAdmin: boolean };
type DashboardUser = { userId: string; userName: string };
type Settings = {
  pollIntervalSeconds: number;
  warnPct: number;
  criticalPct: number;
  mqtt: {
    host: string;
    port: number;
    username: string;
    password: string;
    topicPrefix: string;
  };
  ha: { url: string; token: string };
};

const ADMIN_USER_KEY = "maxxmeter-admin-user";

const app = document.getElementById("app")!;
let page = "overview";
let me: Me | null = null;
let adminUsers: DashboardUser[] = [];

document.querySelectorAll(".nav").forEach((btn) => {
  btn.addEventListener("click", () => {
    page = (btn as HTMLButtonElement).dataset.page ?? "overview";
    document.querySelectorAll(".nav").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    void render();
  });
});

// Home Assistant serves the add-on under /api/hassio_ingress/<session>/, so requests must
// be resolved against the document base rather than the site root.
function apiUrl(path: string): string {
  return new URL(path.replace(/^\/+/, ""), new URL(".", document.baseURI)).toString();
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

function getSelectedUserId(): string {
  if (!me?.isAdmin) return me?.userId ?? "default";
  return sessionStorage.getItem(ADMIN_USER_KEY) ?? me.userId;
}

function isImpersonating(): boolean {
  return me?.isAdmin === true && getSelectedUserId() !== me.userId;
}

function userQuery(): string {
  if (!isImpersonating()) return "";
  return `?userId=${encodeURIComponent(getSelectedUserId())}`;
}

function getSelectedUserName(): string {
  const id = getSelectedUserId();
  if (id === me?.userId) return me.userName;
  return adminUsers.find((u) => u.userId === id)?.userName ?? id;
}

function updateImpersonationBanner(): void {
  const banner = document.getElementById("impersonation-banner");
  if (!banner) return;
  if (isImpersonating()) {
    banner.hidden = false;
    banner.textContent = `Viewing as ${getSelectedUserName()}`;
  } else {
    banner.hidden = true;
    banner.textContent = "";
  }
}

function renderUserSwitcher(): void {
  const container = document.getElementById("user-switcher");
  if (!container || !me?.isAdmin) return;

  const options = adminUsers
    .map(
      (u) =>
        `<option value="${escapeHtml(u.userId)}"${u.userId === getSelectedUserId() ? " selected" : ""}>${escapeHtml(u.userName)}</option>`,
    )
    .join("");

  container.innerHTML = `<label>User <select id="admin-user-select">${options}</select></label>`;
  document.getElementById("admin-user-select")?.addEventListener("change", (ev) => {
    const select = ev.target as HTMLSelectElement;
    sessionStorage.setItem(ADMIN_USER_KEY, select.value);
    updateImpersonationBanner();
    void render();
  });
}

function barColor(pct: number, warn: number, critical: number): string {
  if (pct >= critical) return "var(--red)";
  if (pct >= warn) return "var(--yellow)";
  return "var(--green)";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bar(label: string, pct: number, warn: number, critical: number): string {
  return `<div><div class="row"><strong>${escapeHtml(label)}</strong><span class="muted">${pct.toFixed(0)}%</span></div>
    <div class="bar"><span style="width:${pct}%;background:${barColor(pct, warn, critical)}"></span></div></div>`;
}

async function renderOverview(): Promise<string> {
  const usage = await api<Snapshot[]>(`/api/dashboard/usage${userQuery()}`);
  if (!usage.length) {
    return `<div class="card"><p>No accounts yet. Add one on the <strong>Accounts</strong> tab.</p></div>`;
  }
  return usage
    .map((s) => {
      const session = s.windows.find((w) => w.id === "session");
      const weekly = s.windows.find((w) => w.id === "weekly");
      return `<div class="card">
        <div class="row"><strong>${escapeHtml(s.label)}</strong><span class="muted">${escapeHtml(s.provider)}</span><span class="muted">${escapeHtml(s.status)}</span></div>
        ${session ? bar("Session", session.usedPct, s.thresholds.warnPct, s.thresholds.criticalPct) : ""}
        ${weekly ? bar("Weekly", weekly.usedPct, s.thresholds.warnPct, s.thresholds.criticalPct) : ""}
        ${s.errorMessage ? `<p class="muted">${escapeHtml(s.errorMessage)}</p>` : ""}
      </div>`;
    })
    .join("");
}

async function renderAccounts(): Promise<string> {
  const accounts = await api<Account[]>(`/api/dashboard/accounts${userQuery()}`);
  const list = accounts
    .map(
      (a) => `<div class="card" data-account="${escapeHtml(a.id)}" data-provider="${escapeHtml(a.provider)}">
      <div class="row"><strong>${escapeHtml(a.label)}</strong><span class="muted">${escapeHtml(a.provider)}</span>
      <span class="muted">${a.connected ? "connected" : "disconnected"}</span></div>
      <div class="row" style="margin-top:0.5rem">
        ${a.provider === "claude" ? `<button class="primary" data-oauth="${escapeHtml(a.id)}">OAuth Connect</button>` : ""}
        <input id="token-${escapeHtml(a.id)}" placeholder="${a.provider === "cursor" ? "WorkosCursorSessionToken" : a.provider === "kimi" ? "sk-kimi-..." : "OAuth token or session key"}" style="flex:1;min-width:200px" />
        <button class="primary" data-connect="${escapeHtml(a.id)}">Paste token</button>
        <button class="danger" data-disconnect="${escapeHtml(a.id)}">Disconnect</button>
        <button class="danger" data-delete="${escapeHtml(a.id)}">Delete</button>
      </div>
      <div id="oauth-box-${escapeHtml(a.id)}" class="muted" style="display:none;margin-top:0.5rem"></div>
    </div>`,
    )
    .join("");

  const addAccount =
    !isImpersonating()
      ? `${list}
    <div class="card">
      <h3>Add account</h3>
      <div class="row">
        <select id="new-provider"><option value="claude">Claude</option><option value="cursor">Cursor</option><option value="kimi">Kimi</option></select>
        <input id="new-label" placeholder="Label" />
        <button class="primary" id="add-account">Add</button>
      </div>
      <p class="muted">Claude supports OAuth Connect. Cursor and Kimi use token paste for now.</p>
    </div>`
      : `${list}<div class="card"><p class="muted">Switch to your own user to add accounts.</p></div>`;

  return addAccount;
}

async function renderPanels(): Promise<string> {
  const [panels, accounts] = await Promise.all([
    api<Panel[]>(`/api/dashboard/panels${userQuery()}`),
    api<Account[]>(`/api/dashboard/accounts${userQuery()}`),
  ]);

  const accountOptions = (panel: Panel) =>
    accounts
      .map(
        (a) =>
          `<label class="checkbox-row"><input type="checkbox" data-panel-account="${escapeHtml(panel.id)}" value="${escapeHtml(a.id)}"${panel.accountIds.includes(a.id) ? " checked" : ""} /> ${escapeHtml(a.label)} <span class="muted">(${escapeHtml(a.provider)})</span></label>`,
      )
      .join("");

  const list = panels
    .map(
      (p) => `<div class="card" data-panel="${escapeHtml(p.id)}">
      <div class="row"><strong>${escapeHtml(p.label)}</strong><span class="muted">${escapeHtml(p.deviceProfile)}</span></div>
      <p class="muted">Panel ID: <code>${escapeHtml(p.id)}</code></p>
      <p class="muted">API key: <code>${escapeHtml(p.apiKey)}</code></p>
      <p class="muted">Last seen: ${escapeHtml(p.lastSeenAt ?? "never")}</p>
      <div class="form-section">
        <h4>Displayed accounts</h4>
        <p class="muted">Leave all unchecked to show every connected account on this panel.</p>
        <div class="checkbox-list">${accountOptions(p) || '<p class="muted">No accounts yet.</p>'}</div>
        <button class="primary" data-save-panel-accounts="${escapeHtml(p.id)}">Save accounts</button>
      </div>
      <pre class="muted"><code>collector_host: homeassistant.local
panel_id: ${escapeHtml(p.id)}
panel_api_key: ${escapeHtml(p.apiKey)}</code></pre>
      <div class="row">
        <button class="danger" data-delete-panel="${escapeHtml(p.id)}">Delete</button>
        <button class="primary" data-regen="${escapeHtml(p.id)}">Regenerate key</button>
      </div>
    </div>`,
    )
    .join("");

  const addPanel =
    !isImpersonating()
      ? `${list}
    <div class="card">
      <h3>Register panel</h3>
      <div class="row">
        <input id="panel-label" placeholder="Office panel" />
        <select id="panel-profile">
          <option value="nspanel-eu">NSPanel EU (480×320)</option>
          <option value="nspanel-us-portrait">NSPanel US portrait (320×480)</option>
        </select>
        <button class="primary" id="add-panel">Add panel</button>
      </div>
    </div>`
      : `${list}<div class="card"><p class="muted">Switch to your own user to register panels.</p></div>`;

  return addPanel;
}

async function renderSettings(): Promise<string> {
  try {
    const s = await api<Settings>("/api/dashboard/settings");
    const pwdPlaceholder = s.mqtt.password === "***" ? "***" : "";
    const tokenPlaceholder = s.ha.token === "***" ? "***" : "";
    return `<div class="card">
      <h3>Global settings</h3>
      <form id="settings-form" class="form-grid">
        <label>Poll interval (seconds)
          <input type="number" id="pollIntervalSeconds" min="60" value="${s.pollIntervalSeconds}" />
        </label>
        <label>Warn threshold (%)
          <input type="number" id="warnPct" min="0" max="100" value="${s.warnPct}" />
        </label>
        <label>Critical threshold (%)
          <input type="number" id="criticalPct" min="0" max="100" value="${s.criticalPct}" />
        </label>
        <div class="form-section">
          <h4>MQTT</h4>
          <div class="form-grid">
            <label>Host <input type="text" id="mqtt-host" value="${escapeHtml(s.mqtt.host)}" /></label>
            <label>Port <input type="number" id="mqtt-port" value="${s.mqtt.port}" /></label>
            <label>Username <input type="text" id="mqtt-username" value="${escapeHtml(s.mqtt.username)}" /></label>
            <label>Password <input type="password" id="mqtt-password" placeholder="${escapeHtml(pwdPlaceholder)}" autocomplete="new-password" /></label>
            <label>Topic prefix <input type="text" id="mqtt-topicPrefix" value="${escapeHtml(s.mqtt.topicPrefix)}" /></label>
          </div>
        </div>
        <div class="form-section">
          <h4>Home Assistant</h4>
          <div class="form-grid">
            <label>URL <input type="text" id="ha-url" value="${escapeHtml(s.ha.url)}" /></label>
            <label>Token <input type="password" id="ha-token" placeholder="${escapeHtml(tokenPlaceholder)}" autocomplete="new-password" /></label>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="primary">Save settings</button>
          <p id="settings-status" class="form-status muted"></p>
        </div>
      </form>
    </div>`;
  } catch {
    return `<div class="card"><p class="muted">Settings visible to HA admins only.</p></div>`;
  }
}

async function render(): Promise<void> {
  try {
    if (page === "overview") app.innerHTML = await renderOverview();
    else if (page === "accounts") {
      app.innerHTML = await renderAccounts();
      bindAccountActions();
    } else if (page === "panels") {
      app.innerHTML = await renderPanels();
      bindPanelActions();
    } else {
      app.innerHTML = await renderSettings();
      bindSettingsActions();
    }
  } catch (err) {
    app.innerHTML = `<div class="card"><p>Failed to load: ${escapeHtml(err instanceof Error ? err.message : String(err))}</p></div>`;
  }
}

function bindAccountActions(): void {
  document.getElementById("add-account")?.addEventListener("click", async () => {
    const provider = (document.getElementById("new-provider") as HTMLSelectElement).value;
    const label = (document.getElementById("new-label") as HTMLInputElement).value.trim();
    if (!label) return;
    await api("/api/dashboard/accounts", {
      method: "POST",
      body: JSON.stringify({ provider, label }),
    });
    void render();
  });

  document.querySelectorAll("[data-oauth]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLButtonElement).dataset.oauth!;
      const start = await api<{ stateId: string; authorizationUrl: string; instructions: string }>(
        `/api/auth/claude/start?accountId=${encodeURIComponent(id)}`,
      );
      window.open(start.authorizationUrl, "_blank");
      const box = document.getElementById(`oauth-box-${id}`)!;
      box.style.display = "block";
      box.innerHTML = `<p>${escapeHtml(start.instructions)}</p>
        <div class="row">
          <input id="oauth-code-${id}" placeholder="Authorization code" style="flex:1" />
          <button class="primary" data-oauth-submit="${id}" data-state="${start.stateId}">Submit code</button>
        </div>`;
      box.querySelector(`[data-oauth-submit="${id}"]`)?.addEventListener("click", async (ev) => {
        const target = ev.currentTarget as HTMLButtonElement;
        const code = (document.getElementById(`oauth-code-${id}`) as HTMLInputElement).value.trim();
        const stateId = target.dataset.state!;
        if (!code) return;
        await api("/api/auth/claude/exchange", {
          method: "POST",
          body: JSON.stringify({ stateId, code }),
        });
        void render();
      });
    });
  });

  document.querySelectorAll("[data-connect]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLButtonElement).dataset.connect!;
      const token = (document.getElementById(`token-${id}`) as HTMLInputElement).value.trim();
      if (!token) return;
      await api(`/api/dashboard/accounts/${id}/connect`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      void render();
    });
  });

  document.querySelectorAll("[data-disconnect]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLButtonElement).dataset.disconnect!;
      await api(`/api/dashboard/accounts/${id}/disconnect`, { method: "POST", body: "{}" });
      void render();
    });
  });

  document.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLButtonElement).dataset.delete!;
      await api(`/api/dashboard/accounts/${id}`, { method: "DELETE" });
      void render();
    });
  });
}

function bindPanelActions(): void {
  document.getElementById("add-panel")?.addEventListener("click", async () => {
    const label = (document.getElementById("panel-label") as HTMLInputElement).value.trim();
    const deviceProfile = (document.getElementById("panel-profile") as HTMLSelectElement).value;
    if (!label) return;
    await api("/api/dashboard/panels", {
      method: "POST",
      body: JSON.stringify({ label, deviceProfile }),
    });
    void render();
  });

  document.querySelectorAll("[data-delete-panel]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLButtonElement).dataset.deletePanel!;
      await api(`/api/dashboard/panels/${id}`, { method: "DELETE" });
      void render();
    });
  });

  document.querySelectorAll("[data-save-panel-accounts]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const panelId = (btn as HTMLButtonElement).dataset.savePanelAccounts!;
      const checked = [
        ...document.querySelectorAll<HTMLInputElement>(
          `input[data-panel-account="${panelId}"]:checked`,
        ),
      ].map((el) => el.value);
      await api(`/api/dashboard/panels/${panelId}`, {
        method: "PUT",
        body: JSON.stringify({ accountIds: checked }),
      });
      void render();
    });
  });

  document.querySelectorAll("[data-regen]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLButtonElement).dataset.regen!;
      await api(`/api/dashboard/panels/${id}/regenerate-key`, { method: "POST", body: "{}" });
      void render();
    });
  });
}

function bindSettingsActions(): void {
  document.getElementById("settings-form")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const status = document.getElementById("settings-status");
    const mqttPassword = (document.getElementById("mqtt-password") as HTMLInputElement).value;
    const haToken = (document.getElementById("ha-token") as HTMLInputElement).value;
    const body = {
      pollIntervalSeconds: Number(
        (document.getElementById("pollIntervalSeconds") as HTMLInputElement).value,
      ),
      warnPct: Number((document.getElementById("warnPct") as HTMLInputElement).value),
      criticalPct: Number((document.getElementById("criticalPct") as HTMLInputElement).value),
      mqtt: {
        host: (document.getElementById("mqtt-host") as HTMLInputElement).value,
        port: Number((document.getElementById("mqtt-port") as HTMLInputElement).value),
        username: (document.getElementById("mqtt-username") as HTMLInputElement).value,
        password: mqttPassword || "***",
        topicPrefix: (document.getElementById("mqtt-topicPrefix") as HTMLInputElement).value,
      },
      ha: {
        url: (document.getElementById("ha-url") as HTMLInputElement).value,
        token: haToken || "***",
      },
    };
    try {
      await api("/api/dashboard/settings", { method: "PUT", body: JSON.stringify(body) });
      if (status) {
        status.textContent = "Settings saved.";
        status.style.color = "var(--green)";
      }
    } catch (err) {
      if (status) {
        status.textContent = err instanceof Error ? err.message : "Save failed";
        status.style.color = "var(--red)";
      }
    }
  });
}

async function init(): Promise<void> {
  me = await api<Me>("/api/dashboard/me");
  if (me.isAdmin) {
    adminUsers = await api<DashboardUser[]>("/api/dashboard/users");
    if (!adminUsers.some((u) => u.userId === me!.userId)) {
      adminUsers.push({ userId: me.userId, userName: me.userName });
      adminUsers.sort((a, b) => a.userName.localeCompare(b.userName));
    }
    if (!sessionStorage.getItem(ADMIN_USER_KEY)) {
      sessionStorage.setItem(ADMIN_USER_KEY, me.userId);
    }
    renderUserSwitcher();
  }
  updateImpersonationBanner();
  void render();
}

void init();
setInterval(() => void render(), 60_000);
