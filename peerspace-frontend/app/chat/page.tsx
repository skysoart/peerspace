"use client"

import { useState } from "react"
import { apiClient } from "@/services/apiClient"

export default function ChatPage() {

  const [message, setMessage] = useState("")
  const [response, setResponse] = useState("")

  const sendMessage = async () => {

    if (!message) return

    try {

      const res = await apiClient.chat({
        message: message
      })

      setResponse(res.reply)

    } catch (error) {
      console.error(error)
    }

  }

  return (
    <div style={{ padding: 40 }}>

      <h1>Chat Test</h1>

      <input
        type="text"
        placeholder="Type message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{
          padding: 10,
          marginRight: 10,
          border: "1px solid gray"
        }}
      />

      <button onClick={sendMessage}>
        Send
      </button>

      <div style={{ marginTop: 20 }}>
        <b>You said:</b> {response}
      </div>

    </div>
  )
}