function getRandomBytes(length) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file, passphrase) {
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const data = new Uint8Array(await file.arrayBuffer());
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)
  );
  // Format: [magic 'MTENC1'(6)][salt16][iv12][ciphertext]
  const magic = new TextEncoder().encode("MTENC1");
  const out = new Uint8Array(magic.length + salt.length + iv.length + ciphertext.length);
  out.set(magic, 0);
  out.set(salt, magic.length);
  out.set(iv, magic.length + salt.length);
  out.set(ciphertext, magic.length + salt.length + iv.length);
  const blob = new Blob([out], { type: "application/octet-stream" });
  return { blob, salt, iv };
}

export async function decryptBlob(encryptedBlob, passphrase) {
  const buf = new Uint8Array(await encryptedBlob.arrayBuffer());
  const magic = new TextEncoder().encode("MTENC1");
  if (buf.length < magic.length + 16 + 12) throw new Error("Encrypted data too short");
  // verify magic
  for (let i = 0; i < magic.length; i++) {
    if (buf[i] !== magic[i]) throw new Error("Unsupported format");
  }
  const salt = buf.slice(magic.length, magic.length + 16);
  const iv = buf.slice(magic.length + 16, magic.length + 16 + 12);
  const ciphertext = buf.slice(magic.length + 16 + 12);
  const key = await deriveKey(passphrase, salt);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
  );
  return new Blob([plaintext]);
}
