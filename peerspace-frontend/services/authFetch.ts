/**
 * Shared transport for the PeerSpace API.
 *
 * The backend now derives the acting user from the bearer token rather than
 * trusting a user_id in the request body, so every call has to carry the
 * token. `authFetch` is a drop-in replacement for `fetch` that attaches it.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export interface StoredUser {
  id: number
  username: string
  email?: string
  type?: string
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("token")
  } catch {
    return null
  }
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("user")
    return raw ? (JSON.parse(raw) as StoredUser) : null
  } catch {
    return null
  }
}

export function storeSession(token: string, user: StoredUser) {
  try {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))
  } catch {
    /* storage unavailable (private mode) - session stays in memory only */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  } catch {
    /* nothing to clear */
  }
}

/** Start (or resume) an anonymous session backed by a real token. */
export async function ensureGuestSession(): Promise<StoredUser | null> {
  const res = await fetch(`${API_BASE}/auth/guest`, { method: "POST" })
  if (!res.ok) return null
  const data = await res.json()
  storeSession(data.token, data.user)
  return data.user as StoredUser
}

export async function authFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers || {})

  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(url, { ...init, headers })

  // Tokens last a day. When one lapses, drop the dead session and send the
  // person back to the door rather than leaving the UI silently empty.
  if (res.status === 401 && typeof window !== "undefined") {
    clearSession()
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login"
    }
  }

  return res
}
