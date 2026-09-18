"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Check, Ban } from "lucide-react"

interface FlaggedMessage {
  id: number
  message_text: string
  user_id: number
  status: string
  ai_feedback?: string
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export default function ModerationPage() {

  const [messages, setMessages] = useState<FlaggedMessage[]>([])
  const [loading, setLoading] = useState(true)

  async function loadMessages() {

    const res = await fetch(`${API}/messages/flagged`)

    const data = await res.json()

    setMessages(data.data || [])
    setLoading(false)
  }

  async function updateStatus(id: number, status: string) {

    await fetch(`${API}/messages/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    })

    setMessages((prev) =>
      prev.filter((m) => m.id !== id)
    )
  }

  useEffect(() => {
    loadMessages()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading moderation queue...
      </div>
    )
  }

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold text-white mb-8">
        Moderation Queue
      </h1>

      <div className="flex flex-col gap-4">

        {messages.map((msg) => (

          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0f1422] border border-[#1c2233] rounded-lg p-4 flex gap-4"
          >

            {/* MESSAGE CONTENT */}

            <div className="flex-1">

              <div className="text-sm text-gray-400 mb-1">
                User {msg.user_id}
              </div>

              <div className="text-white mb-2">
                {msg.message_text}
              </div>

              {msg.ai_feedback && (

                <div className="text-xs text-yellow-400">

                  AI Flag: {msg.ai_feedback}

                </div>

              )}

            </div>

            {/* ACTION BUTTONS */}

            <div className="flex items-center gap-2">

              <button
                onClick={() =>
                  updateStatus(msg.id, "approved")
                }
                className="p-2 bg-green-600 rounded hover:bg-green-500"
              >

                <Check size={16} />

              </button>

              <button
                onClick={() =>
                  updateStatus(msg.id, "blocked")
                }
                className="p-2 bg-red-600 rounded hover:bg-red-500"
              >

                <Ban size={16} />

              </button>

            </div>

          </motion.div>

        ))}

      </div>

    </div>
  )
}