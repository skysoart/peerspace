"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ShieldCheck, Activity, Users, Hash, ChevronRight, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import FloatingLines from "@/components/ui/floating-lines"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface Community {
  id: number
  name: string
  description: string
}

interface Stats {
  safe_messages: number
  flagged_messages: number
  total_channels: number
}

const AVATARS = ["from-indigo-500 to-purple-600","from-pink-500 to-rose-600","from-emerald-500 to-teal-600","from-amber-500 to-orange-600"]

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [communities, setCommunities] = useState<Community[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [commRes, statsRes] = await Promise.all([
          fetch(`${API}/communities/`),
          fetch(`${API}/messages/admin/stats`)
        ])
        const comms = await commRes.json()
        const st = await statsRes.json()
        setCommunities(comms)
        setStats(st)
      } catch {}
      setLoading(false)
    }
    fetchAll()
  }, [])

  return (
    <div className="min-h-full p-8 md:p-10 relative overflow-x-hidden">
      <FloatingLines />

      {/* Background ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/8 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/8 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-400 font-medium mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Moderation Active
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{user?.username || "Guest"}</span> 👋
          </h1>
          <p className="text-gray-400 text-lg">Here's what's happening in your network.</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/communities")}
          className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Create Community
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {[
          { icon: ShieldCheck, label: "Messages Approved", value: loading ? "..." : (stats?.safe_messages ?? 0), color: "text-emerald-400", bg: "from-emerald-500/10 to-transparent", border: "border-emerald-500/20" },
          { icon: Activity, label: "Active Channels", value: loading ? "..." : (stats?.total_channels ?? 0), color: "text-indigo-400", bg: "from-indigo-500/10 to-transparent", border: "border-indigo-500/20" },
          { icon: Users, label: "Threats Detected", value: loading ? "..." : (stats?.flagged_messages ?? 0), color: "text-red-400", bg: "from-red-500/10 to-transparent", border: "border-red-500/20" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.5 }}
            className={clsx("relative overflow-hidden p-6 rounded-2xl border bg-gradient-to-br backdrop-blur-sm", stat.border, stat.bg, "bg-white/[0.02]")}
          >
            <div className="flex items-start justify-between mb-3">
              <stat.icon size={22} className={stat.color} />
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500 uppercase tracking-widest font-bold">Live</span>
            </div>
            <div className={clsx("text-4xl font-black mb-1", stat.color)}>{String(stat.value)}</div>
            <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Communities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <motion.div
          initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Your Communities</h3>
            <button
              onClick={() => router.push("/communities")}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1"
            >
              View All <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-gray-500 py-8">
              <Loader2 className="animate-spin" size={20} /> Loading communities...
            </div>
          ) : communities.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/15 text-center">
              <p className="text-gray-500 mb-4">No communities yet.</p>
              <button
                onClick={() => router.push("/communities")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Create your first community
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communities.slice(0, 4).map((c, i) => (
                <motion.div
                  key={c.id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => router.push(`/channel/${c.id}`)}
                  className="group p-5 bg-white/[0.025] border border-white/10 backdrop-blur-md rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={clsx("h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-base shadow-md", AVATARS[i % AVATARS.length])}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Active</span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{c.name}</h4>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{c.description || "No description yet."}</p>
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                    <Hash size={13} /> Enter Community →
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sidebar: AI Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-bold text-white">AI System Status</h3>

          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
              <span className="text-sm font-semibold text-emerald-400">Gemini Moderator Online</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">AI powered by Gemini 2.0 Flash is actively scanning all messages in real-time.</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md space-y-3">
            <h4 className="text-sm font-bold text-white">Quick Actions</h4>
            {[
              { label: "Admin Dashboard", path: "/admin", color: "text-pink-400" },
              { label: "Browse Communities", path: "/communities", color: "text-indigo-400" },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={clsx("w-full text-left text-sm font-medium transition-colors hover:text-white", item.color)}
              >
                → {item.label}
              </button>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}