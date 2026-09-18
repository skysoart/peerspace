"use client"

import { useEffect, useState } from "react"
import ChatLayout from "@/components/chat/ChatLayout"
import MessageInput from "@/components/chat/MessageInput"
import {
  connectSocket,
  sendSocketMessage,
  subscribeMessages
} from "@/services/socket"

interface Message {
  id: number
  user: {
    id: number
    username: string
  }
  content: string
  createdAt: string
}

export default function RealtimeChat({
  channelId
}: {
  channelId: number
}) {

  const [messages, setMessages] = useState<Message[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {

    const socket = connectSocket(channelId)

    socket.onopen = () => {
      setConnected(true)
    }

    socket.onclose = () => {
      setConnected(false)
    }

    const unsubscribe = subscribeMessages((data) => {

      const msg: Message = {
        id: Date.now(),
        user: {
          id: data.user_id,
          username: `User ${data.user_id}`
        },
        content: data.message_text,
        createdAt: new Date().toLocaleTimeString()
      }

      setMessages((prev) => [...prev, msg])
    })

    return () => {
      unsubscribe()
    }

  }, [channelId])

  function handleSend(text: string) {

    sendSocketMessage({
      channel_id: channelId,
      user_id: 1,
      message_text: text
    })

  }

  return (

    <div className="flex flex-col h-full">

      {/* CONNECTION STATUS */}

      {!connected && (
        <div className="text-xs text-yellow-400 px-6 py-2">
          Connecting to chat server...
        </div>
      )}

      {/* CHAT */}

      <ChatLayout />

      {/* INPUT */}

      <MessageInput onSend={handleSend} />

    </div>

  )
}