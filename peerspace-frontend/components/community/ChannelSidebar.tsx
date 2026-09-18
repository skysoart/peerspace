"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Hash, ChevronDown, Plus, Loader2, Settings } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import clsx from "clsx"

interface Channel {
  id: number
  name: string
  community_id: number
}

interface Community {
  id: number
  name: string
  description?: string
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export default function ChannelSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(false)
  const [textOpen, setTextOpen] = useState(true)
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState("")
  const [adding, setAdding] = useState(false)

  // Determine active channel from URL
  const activeChannelId = pathname?.startsWith("/channel/")
    ? parseInt(pathname.split("/channel/")[1])
    : null

  // Determine which community to show — if we're on /channel/:id, use the channel's community
  useEffect(() => {
    if (!activeChannelId) return
    setLoading(true)

    // Fetch all communities and match
    fetch(`${API}/communities/`)
      .then(r => r.json())
      .then(async (comms: Community[]) => {
        if (comms.length > 0) {
          // try to find the community for the active channel
          const firstComm = comms[0]
          setCommunity(firstComm)
          const res = await fetch(`${API}/channels/${firstComm.id}`)
          const chans: Channel[] = await res.json()
          setChannels(chans)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeChannelId])

  // Also update when navigating to communities
  useEffect(() => {
    const communityMatch = pathname?.match(/\/channel\/(\d+)/)
    if (!communityMatch) return
    const channelId = parseInt(communityMatch[1])

    // Find which community owns this channel
    fetch(`${API}/communities/`)
      .then(r => r.json())
      .then(async (comms: Community[]) => {
        for (const comm of comms) {
          try {
            const res = await fetch(`${API}/channels/${comm.id}`)
            const chans: Channel[] = await res.json()
            if (chans.some(c => c.id === channelId)) {
              setCommunity(comm)
              setChannels(chans)
              return
            }
          } catch {}
        }
        // fallback: just use first community
        if (comms.length > 0) {
          const res = await fetch(`${API}/channels/${comms[0].id}`)
          const chans = await res.json()
          setCommunity(comms[0])
          setChannels(chans)
        }
      })
  }, [pathname])

  async function addChannel() {
    if (!newChannelName.trim() || !community) return
    setAdding(true)
    try {
      const res = await fetch(`${API}/channels/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName.trim(), community_id: community.id })
      })
      const chan: Channel = await res.json()
      setChannels(prev => [...prev, chan])
      setNewChannelName("")
      setShowAddChannel(false)
    } catch {}
    setAdding(false)
  }

  return (
    <div className="h-full flex flex-col bg-transparent">

      {/* Community Header */}
      <div className="h-[56px] border-b border-white/10 flex items-center justify-between px-4 bg-black/20 backdrop-blur-sm shrink-0">
        <span className="font-bold text-white text-sm tracking-wide truncate">
          {community?.name || "Loading..."}
        </span>
        <Settings size={16} className="text-gray-500 hover:text-white cursor-pointer transition-colors" />
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        
        <div>
          <button
            onClick={() => setTextOpen(!textOpen)}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 uppercase tracking-widest px-2 py-1 hover:text-white w-full font-bold mb-1 transition-colors"
          >
            <ChevronDown size={13} className={clsx("transition-transform", !textOpen && "-rotate-90")} />
            Text Channels
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddChannel(!showAddChannel) }}
              className="ml-auto text-gray-600 hover:text-white transition-colors"
            >
              <Plus size={14} />
            </button>
          </button>

          <AnimatePresence>
            {showAddChannel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-2"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <input
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addChannel()}
                    placeholder="new-channel-name"
                    className="flex-1 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={addChannel}
                    disabled={adding}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {textOpen && (
              <motion.div
                key="text-channels"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                  </div>
                ) : channels.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-600 italic">No channels yet</div>
                ) : (
                  channels.map(channel => {
                    const isActive = activeChannelId === channel.id
                    return (
                      <motion.div
                        key={channel.id}
                        whileHover={{ x: 3 }}
                        onClick={() => router.push(`/channel/${channel.id}`)}
                        className={clsx(
                          "flex items-center gap-2 px-2 py-2 rounded-md text-sm cursor-pointer transition-all group",
                          isActive
                            ? "bg-indigo-600/80 text-white shadow-lg shadow-indigo-500/20"
                            : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                        )}
                      >
                        <Hash size={15} className={isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300"} />
                        <span className="flex-1 truncate">{channel.name}</span>
                      </motion.div>
                    )
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  )
}