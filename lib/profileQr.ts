export type ProfileQrTarget = { uid?: string; email?: string };

const PREFIX = "bgt-profile";

export function encodeProfileQr(profile: { uid: string; nickname?: string; email?: string }): string {
  return JSON.stringify({
    t: PREFIX,
    uid: profile.uid,
    nickname: profile.nickname ?? "",
    email: profile.email ?? "",
  });
}

export function parseProfileQr(raw: string): ProfileQrTarget | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const uid = typeof data.uid === "string" ? data.uid.trim() : "";
      const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
      if (uid) return { uid, email: email || undefined };
      if (email) return { email };
      return null;
    }
  } catch {
    // Not JSON — fall through to plain-text formats.
  }

  if (text.includes("@")) return { email: text.toLowerCase() };
  if (/^[A-Za-z0-9_-]{15,}$/.test(text)) return { uid: text };
  return null;
}
