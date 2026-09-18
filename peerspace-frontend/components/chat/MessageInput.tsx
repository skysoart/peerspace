"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { motion } from "framer-motion"
import { Send, Smile, Paperclip } from "lucide-react"
import clsx from "clsx"

interface Props {
  onSend?: (text: string) => void
}

export default function MessageInput({ onSend }: Props) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return

    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }

  function handleSend() {
    if (!message.trim()) return

    onSend?.(message)

    setMessage("")

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-6 pb-6 pt-2">

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-3xl shadow-2xl focus-within:bg-white/[0.05] focus-within:border-indigo-500/50 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300"
      >

        {/* FILE UPLOAD */}

        <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5">
          <Paperclip size={20} />
        </button>

        {/* TEXTAREA */}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message channel..."
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none text-[15px] text-white placeholder-gray-500 max-h-[200px] py-1.5 focus:ring-0 leading-relaxed"
        />

        {/* EMOJI BUTTON */}

        <button className="text-gray-400 hover:text-indigo-400 transition-colors p-2 rounded-xl hover:bg-white/5">
          <Smile size={20} />
        </button>

        {/* SEND BUTTON */}

        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={handleSend}
          className={clsx(
            "p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center",
            message
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
              : "bg-white/5 text-gray-500 cursor-not-allowed"
          )}
        >
          <Send size={18} className={message ? "translate-x-0.5" : ""} />
        </motion.button>

      </motion.div>

    </div>
  )
}