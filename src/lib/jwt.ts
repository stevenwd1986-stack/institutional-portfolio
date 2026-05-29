// Verifies a HS256 JWT using the Web Crypto API (no external dependencies).
// Returns the decoded payload or null if invalid/expired.

export interface AdviserClaims {
  sub:   string
  email: string
  name:  string
  iat:   number
  exp:   number
}

function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export async function verifyAdviserToken(token: string): Promise<AdviserClaims | null> {
  const secret = import.meta.env.VITE_INSTITUTIONAL_LINK_SECRET as string | undefined
  if (!secret) {
    console.warn('VITE_INSTITUTIONAL_LINK_SECRET not set — token validation skipped')
    return null
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, sigB64] = parts

    // Import the HMAC key
    const keyMaterial = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw', keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Verify signature
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const signature    = b64urlDecode(sigB64)
    const valid = await crypto.subtle.verify('HMAC', key, signature as unknown as BufferSource, signingInput)
    if (!valid) return null

    // Decode payload
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)))

    // Check expiry
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload as AdviserClaims
  } catch {
    return null
  }
}
