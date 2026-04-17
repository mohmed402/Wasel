/**
 * Customer auth session — stored in localStorage as 'wasel_customer_session'.
 * Shape: {
 *   id, name, phone, email, address,
 *   token, refresh_token, expires_at, auth_user_id, role
 * }
 *
 * Uses Supabase Auth access_token as bearer token.
 * Every customer API call sends Authorization: Bearer <token>.
 */

const SESSION_KEY = 'wasel_customer_session'

export function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || !s.token) return null
    // Support either ms or seconds from different payload versions
    const expiresAtMs = s.expires_at && s.expires_at < 1e12 ? s.expires_at * 1000 : s.expires_at
    if (expiresAtMs && Date.now() > expiresAtMs) {
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
