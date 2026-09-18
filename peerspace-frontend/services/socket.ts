let socket: WebSocket | null = null

type MessageHandler = (data: any) => void

let listeners: MessageHandler[] = []

export function connectSocket(channelId: number) {

  if (socket) return socket

  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"
  
  socket = new WebSocket(
    `${wsBase}/ws/${channelId}`
  )

  socket.onopen = () => {
    console.log("WebSocket connected")
  }

  socket.onmessage = (event) => {

    const data = JSON.parse(event.data)

    listeners.forEach((handler) =>
      handler(data)
    )
  }

  socket.onclose = () => {
    console.log("WebSocket disconnected")
    socket = null
  }

  return socket
}

export function sendSocketMessage(message: any) {

  if (!socket) return

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