export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
}

export async function exportPublicKeyToPem(key) {
  try {
    const spki = await window.crypto.subtle.exportKey('spki', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
    return '-----BEGIN PUBLIC KEY-----\n' + b64.match(/.{1,64}/g).join('\n') + '\n-----END PUBLIC KEY-----';
  } catch (err) {
    console.error('[E2EE] Failed to export public key:', err);
    throw err;
  }
}

export async function exportPrivateKeyToPem(key) {
  try {
    const pkcs8 = await window.crypto.subtle.exportKey('pkcs8', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
    return '-----BEGIN PRIVATE KEY-----\n' + b64.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----';
  } catch (err) {
    console.error('[E2EE] Failed to export private key:', err);
    throw err;
  }
}

export function generateNonce(length = 24) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
