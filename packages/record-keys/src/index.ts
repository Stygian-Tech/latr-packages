const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function bytesToBase32Upper(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += B32[(value << (5 - bits)) & 31];
  }
  return out;
}

export async function sha256Utf8(text: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(buf);
}

export async function latrExternalRkeyFromNormalizedUrl(
  normalizedUrl: string
): Promise<string> {
  return bytesToBase32Upper(await sha256Utf8(normalizedUrl));
}

export async function latrItemRkeyFromSubjectUri(
  subjectUri: string
): Promise<string> {
  return bytesToBase32Upper(await sha256Utf8(subjectUri));
}

export async function entryReadStateRkeyFromSubjectUri(
  subjectUri: string
): Promise<string> {
  return latrItemRkeyFromSubjectUri(subjectUri);
}

export function latrFingerprintHex(buf: Uint8Array): string {
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function latrFingerprintFromNormalizedUrl(
  normalizedUrl: string
): Promise<string> {
  return latrFingerprintHex(await sha256Utf8(normalizedUrl));
}
