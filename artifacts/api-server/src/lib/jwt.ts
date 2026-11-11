import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "kanak-turnkey-production-secret-key-360-turnkeyerp";

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  roles: string[];
  activeRole: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf-8");
}

/**
 * Sign a payload into an HMAC-SHA256 (HS256) JSON Web Token.
 * Defaults to 7-day expiration.
 */
export function signToken(payload: Omit<JwtPayload, "iat" | "exp">, expiresInSeconds = 7 * 24 * 3600): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = Object.assign({}, payload, {
    iat: now,
    exp: now + expiresInSeconds,
  }) as JwtPayload;

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(dataToSign)
    .digest("base64url");

  return `${dataToSign}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 JSON Web Token.
 * Returns decoded payload if valid and unexpired, null otherwise.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(dataToSign)
      .digest("base64url");

    if (signature.length !== expectedSignature.length) {
      return null;
    }

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
