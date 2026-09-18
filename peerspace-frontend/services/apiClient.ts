const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: any
  token?: string
}

async function request(endpoint: string, options: ApiOptions = {}) {

  const token =
    options.token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null)

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || "API error")
  }

  return await res.json()
}

export const apiClient = {

  /* ---------------- AUTH ---------------- */

  signup: (data: {
    username: string
    email: string
    password: string
  }) =>
    request("/auth/signup", {
      method: "POST",
      body: data,
    }),

  login: async (data: {
    email: string
    password: string
  }) => {

    const res = await request("/auth/login", {
      method: "POST",
      body: data,
    })

    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.token)
    }

    return res
  },

  /* ---------------- USERS ---------------- */

  getUser: (id: number) =>
    request(`/users/${id}`),

  updateUser: (id: number, data: any) =>
    request(`/users/${id}`, {
      method: "PUT",
      body: data,
    }),

  /* ---------------- COMMUNITIES ---------------- */

  getCommunities: () =>
    request("/communities"),

  createCommunity: (data: {
    name: string
    description: string
    owner_id: number
  }) =>
    request("/communities/create", {
      method: "POST",
      body: data,
    }),

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

  sendMessage: (data: {
    channel_id: number
    user_id: number
    message_text: string
  }) =>
    request("/messages/send", {
      method: "POST",
      body: data,
    }),

  /* ---------------- CHAT ---------------- */

  chat: (data: {
    message: string
  }) =>
    request("/chat", {
      method: "POST",
      body: data,
    }),
}