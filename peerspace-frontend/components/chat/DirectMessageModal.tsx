"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, UserPlus, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import clsx from "clsx"

interface DirectMessageModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DirectMessageModal({ isOpen, onClose }: DirectMessageModalProps) {
  const [username, setUsername] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsSearching(true)

    // Simulate API search / DB lookup
    setTimeout(() => {
      setIsSearching(false)
      // For now, push them to a mock DM channel route or generic channel based on the person's name
      // Real implementation would create/fetch a DM conversation ID from the backend
      router.push(`/channel/dm_${username.toLowerCase()}`)
      onClose()
      setUsername("")
    }, 800)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-md bg-[#0a0d14] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 blur-[60px] rounded-full pointer-events-none" />

            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Direct Message</h2>
                  <p className="text-xs text-gray-400">Connect directly via Username</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY */}
            <form onSubmit={handleConnect} className="p-6 relative z-10">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search exact username
              </label>
              
              <div className="relative group mb-6">
                <Search size={18} className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  placeholder="e.g. JohnDoe123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-[15px] text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={!username.trim() || isSearching}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all shadow-lg",
                    username.trim() && !isSearching
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02]"
                      : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
                  )}
                >
                  {isSearching ? (
                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Start Chat
                    </>
                  )}
                </button>
              </div>
            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
