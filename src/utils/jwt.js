const base64UrlDecode = (input) => {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = atob(padded)
    const decoder = new TextDecoder('utf-8')
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0))
    return decoder.decode(bytes)
  } catch (error) {
    console.error('Failed to decode base64 payload from JWT', error)
    return null
  }
}

export const decodeJwtPayload = (token) => {
  if (!token) {
    return null
  }

  const segments = token.split('.')
  if (segments.length < 2) {
    return null
  }

  const payload = base64UrlDecode(segments[1])
  if (!payload) {
    return null
  }

  try {
    return JSON.parse(payload)
  } catch (error) {
    console.error('Failed to parse JWT payload', error)
    return null
  }
}

export const getJwtExpiration = (token) => {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) {
    return null
  }
  return payload.exp * 1000
}
