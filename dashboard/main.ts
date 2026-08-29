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

const app = document.getElementById("app")!;
let page = "overview";

document.querySelectorAll(".nav").forEach((btn) => {
  btn.addEventListener("click", () => {
    page = (btn as HTMLButtonElement).dataset.page ?? "overview";
    document.querySelectorAll(".nav").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    void render();
  });
});

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

function barColor(pct: number, warn: number, critical: number): string {
  if (pct >= critical) return "var(--red)";
  if (pct >= warn) return "var(--yellow)";
  return "var(--green)";
}

function bar(label: string, pct: number, warn: number, critical: number): string {
  return `<div><div class="row"><strong>${label}</strong><span class="muted">${pct.toFixed(0)}%</span></div>
    <div class="bar"><span style="width:${pct}%;background:${barColor(pct, warn, critical)}"></span></div></div>`;
}

async function renderOverview(): Promise<string> {
  const usage = await api<Snapshot[]>("/api/dashboard/usage");
  if (!usage.length) {
    return `<div class="card"><p>No accounts yet. Add one on the <strong>Accounts</strong> tab.</p></div>`;
  }
  return usage
    .map((s) => {
      const session = s.windows.find((w) => w.id === "session");
      const weekly = s.windows.find((w) => w.id === "weekly");
      return `<div class="card">
        <div class="row"><strong>${s.label}</strong><span class="muted">${s.provider}</span><span class="muted">${s.status}</span></div>
        ${session ? bar("Session", session.usedPct, s.thresholds.warnPct, s.thresholds.criticalPct) : ""}
        ${weekly ? bar("Weekly", weekly.usedPct, s.thresholds.warnPct, s.thresholds.criticalPct) : ""}
        ${s.errorMessage ? `<p class="muted">${s.errorMessage}</p>` : ""}
      </div>`;
    })
    .join("");
}

async function renderAccounts(): Promise<string> {
  const accounts = await api<Account[]>("/api/dashboard/accounts");
  const list = accounts
    .map(
      (a) => `<div class="card" data-account="${a.id}" data-provider="${a.provider}">
      <div class="row"><strong>${a.label}</strong><span class="muted">${a.provider}</span>
      <span class="muted">${a.connected ? "connected" : "disconnected"}</span></div>
      <div class="row" style="margin-top:0.5rem">
        ${a.provider === "claude" ? `<button class="primary" data-oauth="${a.id}">OAuth Connect</button>` : ""}
        <input id="token-${a.id}" placeholder="${a.provider === "cursor" ? "WorkosCursorSessionToken" : a.provider === "kimi" ? "sk-kimi-..." : "OAuth token or session key"}" style="flex:1;min-width:200px" />
        <button class="primary" data-connect="${a.id}">Paste token</button>
        <button class="danger" data-disconnect="${a.id}">Disconnect</button>
        <button class="danger" data-delete="${a.id}">Delete</button>
      </div>
      <div id="oauth-box-${a.id}" class="muted" style="display:none;margin-top:0.5rem"></div>
    </div>`,
    )
    .join("");

  return `${list}
    <div class="card">
      <h3>Add account</h3>
      <div class="row">
        <select id="new-provider"><option value="claude">Claude</option><option value="cursor">Cursor</option><option value="kimi">Kimi</option></select>
        <input id="new-label" placeholder="Label" />
        <button class="primary" id="add-account">Add</button>
      </div>
      <p class="muted">Claude supports OAuth Connect. Cursor and Kimi use token paste for now.</p>
    </div>`;
}

async function renderPanels(): Promise<string> {
  const panels = await api<Panel[]>("/api/dashboard/panels");
  const list = panels
    .map(
      (p) => `<div class="card">
      <div class="row"><strong>${p.label}</strong><span class="muted">${p.deviceProfile}</span></div>
      <p class="muted">Panel ID: <code>${p.id}</code></p>
      <p class="muted">API key: <code>${p.apiKey}</code></p>
      <p class="muted">Last seen: ${p.lastSeenAt ?? "never"}</p>
      <pre class="muted"><code>collector_host: homeassistant.local
panel_id: ${p.id}
panel_api_key: ${p.apiKey}</code></pre>
      <div class="row">
        <button class="danger" data-delete-panel="${p.id}">Delete</button>
        <button class="primary" data-regen="${p.id}">Regenerate key</button>
      </div>
    </div>`,
    )
    .join("");

  return `${list}
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
    </div>`;
}

async function renderSettings(): Promise<string> {
  try {
    const s = await api<Record<string, unknown>>("/api/dashboard/settings");
    return `<div class="card"><pre>${JSON.stringify(s, null, 2)}</pre><p class="muted">Edit via add-on options or PUT /api/dashboard/settings (admin).</p></div>`;
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
    } else app.innerHTML = await renderSettings();
  } catch (err) {
    app.innerHTML = `<div class="card"><p>Failed to load: ${err instanceof Error ? err.message : err}</p></div>`;
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
      box.innerHTML = `<p>${start.instructions}</p>
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

  document.querySelectorAll("[data-regen]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLButtonElement).dataset.regen!;
      await api(`/api/dashboard/panels/${id}/regenerate-key`, { method: "POST", body: "{}" });
      void render();
    });
  });
}

void render();
setInterval(() => void render(), 60_000);
