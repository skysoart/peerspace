"use client"

import { motion } from "framer-motion"

export default function TypingIndicator({
  users
}: {
  users: string[]
}) {

  if (!users.length) return null

  return (

    <div className="px-6 py-2 text-sm text-gray-400 flex items-center gap-2">

      <span>
        {users.join(", ")} {users.length > 1 ? "are" : "is"} typing
      </span>

      {/* animated dots */}

      <div className="flex gap-1">

        <motion.span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity
          }}
        />

        <motion.span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: 0.2
          }}
        />

        <motion.span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: 0.4
          }}
        />

      </div>

    </div>

  )
}