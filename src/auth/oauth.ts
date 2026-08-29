import { createHash, randomBytes } from "node:crypto";

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export function generatePkce(): PkcePair {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64Url(randomBytes(16));
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function buildQuery(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}
