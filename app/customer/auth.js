/**
 * Customer auth session — stored in localStorage as 'wasel_customer_session'.
 * Shape: { id, name, phone, email, address, wallet_balance, wallet_currency, token, expires_at }
 *
 * No server-side JWT. The session token is a random string issued by the login API
 * and stored server-side per customer (column: session_token, session_expires_at).
 * Every customer API call sends it as a Bearer token.
 */

const SESSION_KEY = 'wasel_customer_session'

export function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || !s.token) return null
    // Treat as expired if expires_at is in the past
    if (s.expires_at && Date.now() > s.expires_at) {
      clearSession()
      return null
    }
    return s
  } catch {
    return null
  }
}

export function setSession(session) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    // Dispatch storage event so other tabs/components can react
    window.dispatchEvent(new Event('wasel_session_change'))
  } catch {}
}

export function clearSession() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_KEY)
    window.dispatchEvent(new Event('wasel_session_change'))
  } catch {}
}

export function isLoggedIn() {
  return !!getSession()
}

/** Auth header for fetch calls — returns {} if no session */
export function authHeaders() {
  const s = getSession()
  if (!s?.token) return {}
  return { Authorization: `Bearer ${s.token}` }
}
