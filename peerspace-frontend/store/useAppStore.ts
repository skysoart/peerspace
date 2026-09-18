import { create } from "zustand"

interface User {
  id: number
  username: string
  avatar?: string
}

interface Community {
  id: number
  name: string
}

interface Channel {
  id: number
  name: string
  community_id: number
}

interface Notification {
  id: number
  message: string
  createdAt: string
}

interface AppState {
  user: User | null
  communities: Community[]
  channels: Channel[]
  activeCommunity: number | null
  activeChannel: number | null
  notifications: Notification[]
  theme: "dark" | "light"

  setUser: (user: User) => void
  setCommunities: (c: Community[]) => void
  setChannels: (c: Channel[]) => void

  setActiveCommunity: (id: number) => void
  setActiveChannel: (id: number) => void

  addNotification: (n: Notification) => void
  removeNotification: (id: number) => void

  toggleTheme: () => void
}

export const useAppStore = create<AppState>((set) => ({

  user: null,

  communities: [],

  channels: [],

  activeCommunity: null,

  activeChannel: null,

  notifications: [],

  theme: "dark",

  setUser: (user) =>
    set({
      user,
    }),

  setCommunities: (communities) =>
    set({
      communities,
    }),

  setChannels: (channels) =>
    set({
      channels,
    }),

  setActiveCommunity: (id) =>
    set({
      activeCommunity: id,
    }),

  setActiveChannel: (id) =>
    set({
      activeChannel: id,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (n) => n.id !== id
      ),
    })),

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "dark" ? "light" : "dark",
    })),

}))