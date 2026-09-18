"use client"

import { ReactNode, useState, useEffect } from "react"
import { motion } from "framer-motion"
import CommunitySidebar from "@/components/community/CommunitySidebar"
import ChannelSidebar from "@/components/community/ChannelSidebar"
import { useRouter } from "next/navigation"
import { Bell, Search, User } from "lucide-react"

interface StoredUser {
  id: number
  username: string
  email?: string
  type?: string
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))
  }, [])

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-black">

      {/* COMMUNITY SIDEBAR (icon strip) */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-[72px] bg-white/[0.02] backdrop-blur-3xl border-r border-white/[0.07] flex flex-col items-center py-4 gap-4 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative shrink-0"
      >
        {/* Brand */}
        <div
          onClick={() => router.push("/")}
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 cursor-pointer hover:scale-105 transition-transform mb-1 shrink-0"
        >
          <span className="text-white font-extrabold text-lg tracking-tighter">P</span>
        </div>

        <div className="w-8 h-[1px] bg-white/10 shrink-0" />

        <CommunitySidebar />
      </motion.div>

      {/* CHANNEL SIDEBAR */}
      <motion.div
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="w-[240px] bg-white/[0.025] backdrop-blur-xl border-r border-white/[0.07] z-10 shrink-0"
      >
        <ChannelSidebar />
      </motion.div>

      {/* MAIN CONTENT AREA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col bg-transparent relative overflow-hidden"
      >
        {/* TOP BAR */}
        <div className="h-[60px] border-b border-white/[0.07] flex items-center px-6 bg-black/10 backdrop-blur-2xl sticky top-0 z-30 shadow-sm shrink-0">

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-xs text-gray-400 font-medium">All systems operational</span>
          </div>

          <div className="ml-auto flex items-center gap-3">

            <button className="h-8 px-3 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 border border-white/10">
              <Search size={13} />
              Search
            </button>

            <button className="relative h-9 w-9 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center border border-white/10 transition-colors">
              <Bell size={16} />
            </button>

            {/* User Avatar */}
            <button
              onClick={() => router.push("/profile")}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md hover:scale-105 transition-transform"
              title={user?.username}
            >
              {user?.username?.[0]?.toUpperCase() ?? <User size={16} />}
            </button>

          </div>
        </div>

        {/* PAGE CONTENT */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 overflow-auto relative z-0"
        >
          {children}
        </motion.div>

      </motion.div>

    </div>
  )
}