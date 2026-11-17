// UUIDv5 (RFC 4122, SHA-1): the same name always gives the same id, in the browser and on a server (Postgres uuid_generate_v5).
// Hashing needs typed arrays; this is the only file allowed to use them (ESLint R09 exemption). It handles ids, never doses.
const HEX = '0123456789abcdef';
const toBytes = (hex: string): number[] => (hex.replace(/-/g, '').match(/../g) ?? []).map((h) => HEX.indexOf(h[0]) * 16 + HEX.indexOf(h[1]));

export async function uuidv5(name: string, namespace: string): Promise<string> {
  const data = new Uint8Array([...toBytes(namespace), ...new TextEncoder().encode(name)]);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', data)).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50; // version 5
  h[8] = (h[8] & 0x3f) | 0x80; // RFC 4122 variant
  const x = [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
