"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smile, Reply } from "lucide-react"
import clsx from "clsx"

interface Message {
  id: number
  user: {
    id: number
    username: string
    avatar?: string
  }
  content: string
  createdAt: string
}

const demoMessages: Message[] = [
  {
    id: 1,
    user: { id: 1, username: "Ansh" },
    content: "Welcome to PeerSpace 🚀",
    createdAt: "10:00",
  },
  {
    id: 2,
    user: { id: 2, username: "Sarah" },
    content: "This UI already looks insane 🔥",
    createdAt: "10:02",
  },
  {
    id: 3,
    user: { id: 1, username: "Ansh" },
    content: "Wait until real-time messaging gets added.",
    createdAt: "10:04",
  },
]

export default function ChatLayout({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col h-full">

      {/* MESSAGE LIST */}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">

        <AnimatePresence>

          {messages.map((msg) => {
            const isOwn = msg.user.id === 1 // assuming 1 is current user for demo
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={clsx(
                  "group flex gap-3 max-w-[85%]",
                  isOwn ? "ml-auto flex-row-reverse" : ""
                )}
              >

                {/* AVATAR */}

                {!isOwn && (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-sm font-bold text-white shadow-md border border-white/10">
                    {msg.user.username[0]}
                  </div>
                )}


                {/* MESSAGE BODY */}

                <div className={clsx("flex flex-col", isOwn ? "items-end" : "items-start")}>

                  <div className={clsx("flex items-center gap-2 mb-1.5", isOwn ? "flex-row-reverse" : "")}>

                    <span className="font-medium text-[13px] text-gray-300">
                      {isOwn ? "You" : msg.user.username}
                    </span>

                    <span className="text-[11px] text-gray-500 tracking-wide">
                      {msg.createdAt}
                    </span>

                  </div>

                  <div 
                    className={clsx(
                      "px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                      isOwn 
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm" 
                        : "bg-white/[0.04] border border-white/5 text-gray-200 rounded-tl-sm backdrop-blur-md"
                    )}
                  >
                    {msg.content}
                  </div>

                </div>


                {/* MESSAGE ACTIONS */}

                <div 
                  className={clsx(
                    "opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1",
                    isOwn ? "mr-2" : "ml-2"
                  )}
                >

                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors">
                    <Smile size={18} />
                  </button>

                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors">
                    <Reply size={18} />
                  </button>

                </div>

              </motion.div>
            )
          })}

        </AnimatePresence>

        <div ref={bottomRef} />

      </div>

    </div>
  )
}