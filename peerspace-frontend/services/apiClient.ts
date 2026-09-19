import {
  API_BASE,
  authFetch,
  ensureGuestSession,
  storeSession,
  type StoredUser,
} from "./authFetch"

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
}

async function request(endpoint: string, options: ApiOptions = {}) {

  const res = await authFetch(`${API_BASE}${endpoint}`, {
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    let detail = ""
    try {
      const data = await res.json()
      detail = data?.detail || ""
    } catch {
      detail = await res.text().catch(() => "")
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }

  return await res.json()
}

export const apiClient = {

  /* ---------------- AUTH ---------------- */

  signup: async (data: {
    username: string
    email: string
    password: string
  }) => {

    const res = await request("/auth/signup", {
      method: "POST",
      body: data,
    })

    if (res.token && res.user) {
      storeSession(res.token, res.user as StoredUser)
    }

    return res
  },

  login: async (data: {
    email: string
    password: string
  }) => {

    const res = await request("/auth/login", {
      method: "POST",
      body: data,
    })

    if (res.token && res.user) {
      storeSession(res.token, res.user as StoredUser)
    }

    return res
  },

  guest: () => ensureGuestSession(),

  me: () => request("/auth/me"),

  /* ---------------- USERS ---------------- */

  getUser: (id: number) =>
    request(`/users/${id}`),

  updateUser: (id: number, data: { username?: string }) =>
    request(`/users/${id}`, {
      method: "PUT",
      body: data,
    }),

  getProfile: (id: number) =>
    request(`/profile/${id}`),

  updateProfile: (id: number, data: { bio?: string; profile_picture?: string }) =>
    request(`/profile/${id}`, {
      method: "PUT",
      body: data,
    }),

  /* ---------------- COMMUNITIES ---------------- */

  getCommunities: () =>
    request("/communities/"),

  createCommunity: (data: {
    name: string
    description: string
    icon?: string
  }) =>
    request("/communities/create", {
      method: "POST",
      body: data,
    }),

  joinCommunity: (id: number) =>
    request(`/communities/${id}/join`, { method: "POST" }),

  leaveCommunity: (id: number) =>
    request(`/communities/${id}/leave`, { method: "POST" }),

  getMembers: (id: number) =>
    request(`/communities/${id}/members`),

  /* ---------------- CHANNELS ---------------- */

  getChannels: (communityId: number) =>
    request(`/channels/${communityId}`),

  createChannel: (data: {
    name: string
    community_id: number
  }) =>
    request("/channels/create", {
      method: "POST",
      body: data,
    }),

  /* ---------------- MESSAGES ---------------- */

  getMessages: (channelId: number) =>
    request(`/messages/${channelId}`),

  // user_id is intentionally absent: the server takes the author from the token.
  sendMessage: (data: {
    channel_id: number
    message_text: string
  }) =>
    request("/messages/send", {
      method: "POST",
      body: data,
    }),

  deleteMessage: (messageId: number) =>
    request(`/messages/${messageId}`, { method: "DELETE" }),

  /* ---------------- MODERATION ---------------- */

  getFlagged: () =>
    request("/messages/flagged"),

  setMessageStatus: (messageId: number, newStatus: string) =>
    request(`/messages/${messageId}/status`, {
      method: "PUT",
      body: { new_status: newStatus },
    }),

  getAdminStats: () =>
    request("/messages/admin/stats"),
}
