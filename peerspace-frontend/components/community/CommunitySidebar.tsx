"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Home, Shield, LogOut } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import clsx from "clsx"

interface Community {
  id: number
  name: string
  description?: string
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const GRADIENT_PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
]

export default function CommunitySidebar() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [activeCommunityId, setActiveCommunityId] = useState<number | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch(`${API}/communities/`)
      .then(r => r.json())
      .then((data: Community[]) => {
        setCommunities(data)
        if (data.length > 0 && !activeCommunityId) {
          setActiveCommunityId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  function handleLogout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full h-full py-2">

      {/* Home icon */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => router.push("/home")}
        className={clsx(
          "h-12 w-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-md",
          pathname === "/home"
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/40"
            : "bg-white/[0.06] hover:bg-indigo-500/30 text-gray-400 hover:text-white"
        )}
        title="Home"
      >
        <Home size={20} className="text-white" />
      </motion.div>

      <div className="h-[1px] w-8 bg-white/10 rounded my-1" />

      {/* Community list */}
      <div className="flex flex-col items-center gap-2 overflow-y-auto flex-1 w-full scrollbar-hide">
        <AnimatePresence>
          {communities.map((community, index) => {
            const isActive = activeCommunityId === community.id
            const gradient = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length]
            const initials = community.name.slice(0, 2).toUpperCase()

            return (
              <div key={community.id} className="relative group">
                {/* Active pill indicator */}
                {isActive && (
                  <motion.div
                    layoutId="commActiveIndicator"
                    className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-white shadow-lg"
                  />
                )}

                <motion.div
                  whileHover={{ scale: 1.1, borderRadius: "12px" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => {
                    setActiveCommunityId(community.id)
                    router.push(`/channel/${community.id}`)
                  }}
                  className={clsx(
                    "h-12 w-12 rounded-2xl flex items-center justify-center cursor-pointer font-bold text-sm text-white bg-gradient-to-br shadow-md transition-all",
                    isActive ? `${gradient} shadow-lg` : "from-white/10 to-white/5 opacity-70 hover:opacity-100"
                  )}
                  title={community.name}
                >
                  {initials}
                </motion.div>

                {/* Tooltip */}
                <div className="absolute left-[60px] top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs rounded-lg bg-black/90 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none z-50 shadow-xl">
                  {community.name}
                </div>
              </div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="h-[1px] w-8 bg-white/10 rounded mt-1" />

      {/* Add community */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push("/communities")}
        className="h-12 w-12 rounded-2xl bg-white/[0.06] hover:bg-emerald-500/80 hover:text-white flex items-center justify-center text-gray-400 transition-all shadow-sm"
        title="Browse & Create Communities"
      >
        <Plus size={20} />
      </motion.button>

      {/* Admin shortcut */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push("/admin")}
        className="h-12 w-12 rounded-2xl bg-white/[0.06] hover:bg-pink-500/60 hover:text-white flex items-center justify-center text-gray-500 transition-all"
        title="Admin Panel"
      >
        <Shield size={18} />
      </motion.button>

      {/* Logout */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogout}
        className="h-12 w-12 rounded-2xl bg-white/[0.04] hover:bg-red-500/60 hover:text-white flex items-center justify-center text-gray-600 transition-all mb-2"
        title="Logout"
      >
        <LogOut size={18} />
      </motion.button>

    </div>
  )
}