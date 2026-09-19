let socket: WebSocket | null = null
let currentChannelId: number | null = null

export interface SocketMessage {
  id: number
  user_id: number
  username: string
  channel_id: number | null
  message_text: string
  status: string
  ai_feedback?: string | null
  created_at?: string | null
}

type MessageHandler = (data: SocketMessage) => void

let listeners: MessageHandler[] = []

export function connectSocket(channelId: number) {

  // Previously this returned any existing socket regardless of channel, so
  // moving between channels kept you subscribed to the first one you opened.
  if (socket && currentChannelId === channelId) {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      return socket
    }
  }

  if (socket) {
    socket.close()
    socket = null
  }

  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

  currentChannelId = channelId
  socket = new WebSocket(`${wsBase}/ws/${channelId}`)

  socket.onopen = () => {
    console.log("WebSocket connected to channel", channelId)
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      listeners.forEach((handler) => handler(data))
    } catch {
      console.warn("Ignoring malformed socket frame")
    }
  }

  socket.onclose = () => {
    console.log("WebSocket disconnected")
    socket = null
    currentChannelId = null
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.close()
    socket = null
    currentChannelId = null
  }
}

export function sendSocketMessage(message: Record<string, unknown>) {

  if (!socket || socket.readyState !== WebSocket.OPEN) return

  socket.send(JSON.stringify(message))
}

export function subscribeMessages(handler: MessageHandler) {

  listeners.push(handler)

  return () => {
    listeners = listeners.filter(
      (h) => h !== handler
    )
  }
}
