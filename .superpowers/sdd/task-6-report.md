# Task 6 Report: Smoke verification + spec status

## Status

**Complete with caveat.** Spec status updated and committed. Layout timer-ID check passed. PowerShell smoke scripts failed because interim TFT binary is absent (expected — gitignored, operator must download).

## Commits

| Hash | Message |
|------|---------|
| `1ebebf4` | Mark office panel TFT prep design implemented. |

Branch `main` is ahead of `origin/main` by 9 commits. Not pushed (per brief).

## Smoke verification

### Step 1: host-tft-on-ha.ps1 -Mode interim

**FAIL (exit 1)**

```
TFT not found: D:\Code\token-panel\panel\nextion\starter\nspanel_portrait.tft
```

Script correctly validates file presence before printing HA copy/URL instructions.

### Step 1: prepare-office-panel.ps1 -Mode interim

**FAIL (exit 1)**

```
Interim TFT missing: D:\Code\token-panel\panel\nextion\starter\nspanel_portrait.tft
Restore from NSPanel-Easy portrait TFT or re-download into panel/nextion/starter/
```

No stub present in workspace (Task 3 used a local gitignored stub that is no longer on disk). Did not invent a binary per brief guidance.

**Operator unblock:** Download `nspanel_portrait.tft` from NSPanel-Easy (see `scripts/install-office-panel.ps1` URL or `OFFICE-PANEL-FLASH.md`) into `panel/nextion/starter/`, then re-run both scripts.

### Step 2: Select-String timer IDs

**PASS (exit 0)**

All four patterns matched in `panel/nextion/maxxmeter-us-portrait-layout.md`:

| Pattern | Matches |
|---------|---------|
| `tm_breathe` | yes (table row + event code + checklist) |
| `tm_bar` | yes |
| `tm_crit` | yes |
| `tm_heart` | yes |

## Spec update

`docs/superpowers/specs/2026-09-05-office-panel-tft-prep-design.md` status line set to:

> **Status:** Implemented — operator fills secrets + Nextion compile

## Concerns

1. **Interim TFT not in repo** — by design (`.gitignore` lines 15–17). Smoke for hosting/prepare scripts requires operator to place the binary locally before full end-to-end verification.
2. **Prior Task 3 stub ephemeral** — verification in Task 3 relied on a local stub; fresh clones will hit the same missing-TFT error until download step completes.

## Handoff

Scripts, layout doc, secrets scaffold, and spec are committed. Operator next steps: download interim TFT → run `prepare-office-panel.ps1` → fill secrets → copy TFT to HA www → `esphome run office-panel.yaml` → compile final UI from layout doc.

## Final-review fix pass

Fixed all Important findings and the requested Minor polish:

- Converted every Nextion Event `pco`/`bco` value to verified RGB565.
- Added an eight-tick target-based overview bar settle and independent `j0`/`j1` critical pulse state.
- Made `prepare-office-panel.ps1 -SkipVerify` pass through to the host helper and rewrite a newly scaffolded custom-HA-host secrets file without touching an existing one.
- Made explicit custom TFT path/name arguments select custom hosting guidance, documented EU custom mode, removed PowerShell Unicode arrows, and made ESPHome flash guidance profile-aware.
- Moved the heartbeat component table and cleaned up the Nextion README hierarchy/duplicate walkthrough.

Tests run:

- **PASS** — PowerShell parser accepted both changed scripts.
- **PASS** — `Select-String` found `tm_breathe`, `tm_bar`, `tm_crit`, and `tm_heart`; no six-digit hex remained in Event `pco`/`bco` assignments.
- **PASS** — `powershell -NoProfile -File scripts/prepare-office-panel.ps1 -Mode interim -SkipVerify`; the existing `secrets.yaml` SHA-256 was unchanged.
- **PASS** — isolated new-secrets smoke with `-HaHost 10.20.30.40 -SkipVerify`; both `collector_host` and `nextion_update_url_us` were rewritten.
- **PASS** — explicit `-TftPath` plus `-RemoteName` smoke selected the custom banner/key and profile-YAML guidance.
- **PASS** — `git diff --check`.

Concern: Nextion Editor/HMI compilation was not available, so Event syntax and animation behavior still need confirmation in the Editor simulator.
