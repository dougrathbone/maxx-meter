import { z } from "zod";

export const ProviderIdSchema = z.enum(["claude", "cursor", "kimi"]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const DeviceProfileSchema = z.enum(["nspanel-eu", "nspanel-us-portrait"]);
export type DeviceProfile = z.infer<typeof DeviceProfileSchema>;

export const AccountStatusSchema = z.enum([
  "ok",
  "auth_expired",
  "rate_limited",
  "error",
  "disconnected",
]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

export const AuthMethodSchema = z.enum(["oauth", "session", "api_key"]);
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

export const UsageWindowSchema = z.object({
  id: z.enum(["session", "weekly"]),
  usedPct: z.number().min(0).max(100),
  resetsAt: z.string().datetime().nullable(),
});

export type UsageWindow = z.infer<typeof UsageWindowSchema>;

export const UsageSnapshotSchema = z.object({
  accountId: z.string(),
  ownerUserId: z.string(),
  provider: ProviderIdSchema,
  label: z.string(),
  status: AccountStatusSchema,
  authMethod: AuthMethodSchema.optional(),
  updatedAt: z.string().datetime(),
  windows: z.array(UsageWindowSchema),
  thresholds: z.object({
    warnPct: z.number(),
    criticalPct: z.number(),
  }),
  errorMessage: z.string().optional(),
});

export type UsageSnapshot = z.infer<typeof UsageSnapshotSchema>;

export const AccountSchema = z.object({
  id: z.string().min(1),
  provider: ProviderIdSchema,
  label: z.string().min(1),
  ownerUserId: z.string(),
  ownerUserName: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Account = z.infer<typeof AccountSchema>;

export const PanelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  deviceProfile: DeviceProfileSchema,
  ownerUserId: z.string(),
  accountIds: z.array(z.string()),
  apiKey: z.string().min(16),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().optional(),
});

export type Panel = z.infer<typeof PanelSchema>;

export const StoredCredentialSchema = z.object({
  accountId: z.string(),
  ownerUserId: z.string(),
  provider: ProviderIdSchema,
  authMethod: AuthMethodSchema,
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  connectedAt: z.string().datetime(),
  email: z.string().optional(),
});

export type StoredCredential = z.infer<typeof StoredCredentialSchema>;

export const GlobalSettingsSchema = z.object({
  pollIntervalSeconds: z.number().int().min(60).default(300),
  warnPct: z.number().min(0).max(100).default(70),
  criticalPct: z.number().min(0).max(100).default(90),
  mqtt: z.object({
    host: z.string().default("core-mosquitto"),
    port: z.number().int().default(1883),
    username: z.string().default(""),
    password: z.string().default(""),
    topicPrefix: z.string().default("maxxmeter"),
    tls: z.boolean().default(false),
  }),
  ha: z.object({
    url: z.string().default("http://supervisor/core"),
    token: z.string().default(""),
  }),
});

export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;

export const PanelUsageResponseSchema = z.object({
  panel: z.object({
    id: z.string(),
    label: z.string(),
    deviceProfile: DeviceProfileSchema,
  }),
  accounts: z.array(UsageSnapshotSchema),
  thresholds: z.object({
    warnPct: z.number(),
    criticalPct: z.number(),
  }),
});

export type PanelUsageResponse = z.infer<typeof PanelUsageResponseSchema>;
