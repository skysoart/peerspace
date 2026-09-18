"use client"

import { useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { motion } from "framer-motion"

interface Message {
  id: number
  user: {
    id: number
    username: string
  }
  content: string
  createdAt: string
}

export default function VirtualizedMessageList({
  messages
}: {
  messages: Message[]
}) {

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10
  })

  return (

    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto px-6 py-6"
    >

      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative"
        }}
      >

        {rowVirtualizer.getVirtualItems().map((virtualRow) => {

          const message = messages[virtualRow.index]

          return (

            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 w-full flex gap-3"
              style={{
                transform: `translateY(${virtualRow.start}px)`
              }}
            >

              {/* AVATAR */}

              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {message.user.username[0]}
              </div>

              {/* MESSAGE */}

              <div className="flex flex-col">

                <div className="flex items-center gap-2">

                  <span className="font-semibold text-white">
                    {message.user.username}
                  </span>

                  <span className="text-xs text-gray-500">
                    {message.createdAt}
                  </span>

                </div>

                <div className="text-gray-300 text-sm leading-relaxed">
                  {message.content}
                </div>

              </div>

            </motion.div>

          )
        })}

      </div>

    </div>

  )
}