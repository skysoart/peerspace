"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"

export default function NotificationCenter() {

  const [open, setOpen] = useState(false)

  const notifications = useAppStore(
    (state) => state.notifications
  )

  const removeNotification = useAppStore(
    (state) => state.removeNotification
  )

  const unreadCount = notifications.length

  return (

    <div className="relative">

      {/* BELL BUTTON */}

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="relative text-gray-400 hover:text-white"
      >

        <Bell size={20} />

        {unreadCount > 0 && (

          <span className="absolute -top-2 -right-2 bg-red-500 text-xs px-1.5 py-0.5 rounded-full text-white">

            {unreadCount}

          </span>

        )}

      </motion.button>

      {/* DROPDOWN PANEL */}

      <AnimatePresence>

        {open && (

          <motion.div
            key="notifications-dropdown"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-3 w-[320px] bg-[#0f1422] border border-[#1c2233] rounded-xl shadow-lg overflow-hidden"
          >

            <div className="p-3 border-b border-[#1c2233] text-sm text-gray-300">

              Notifications

            </div>

            {notifications.length === 0 && (

              <div className="p-4 text-sm text-gray-400 text-center">

                No notifications

              </div>

            )}

            {notifications.map((n) => (

              <div
                key={n.id}
                className="flex items-start gap-3 p-3 hover:bg-[#1c2233] transition"
              >

                <div className="flex-1 text-sm text-gray-300">

                  {n.message}

                  <div className="text-xs text-gray-500 mt-1">
                    {n.createdAt}
                  </div>

                </div>

                <button
                  onClick={() =>
                    removeNotification(n.id)
                  }
                  className="text-gray-500 hover:text-white"
                >

                  <X size={14} />

                </button>

              </div>

            ))}

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  )
}