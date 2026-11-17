// SHA-256 of photo/file bytes and base64 <-> bytes, for backups and (later) photo upload: the hash is of the FILE bytes, so a server can check it.
// Needs typed arrays; with uuid.ts this is the only file allowed to use them (ESLint R09 exemption). It handles files, never doses.
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function base64ToBlob(base64: string, mime: string): Blob {
  return new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: mime });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); // chunks: a photo is too big for one call
  return btoa(binary);
}
