"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { apiClient } from "@/services/apiClient"
import { Shield, Users, Plus, X, Search, Hash, Loader2 } from "lucide-react"
import clsx from "clsx"

interface Community {
  id: number
  name: string
  description: string
}

export default function CommunitiesPage() {

  const router = useRouter()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [newCommunityName, setNewCommunityName] = useState("")
  const [newCommunityDesc, setNewCommunityDesc] = useState("")
  const [newCommunityRules, setNewCommunityRules] = useState("")

  // Get logged-in user
  function getOwnerId(): number {
    try {
      const stored = localStorage.getItem("user")
      if (stored) return JSON.parse(stored).id ?? 1
    } catch {}
    return 1
  }

  /* FETCH COMMUNITIES */

  const { data: communities, isLoading } = useQuery<Community[]>({
    queryKey: ["communities"],
    queryFn: apiClient.getCommunities
  })

  /* CREATE COMMUNITY */

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.createCommunity({
        name: newCommunityName,
        description: newCommunityDesc,
        owner_id: getOwnerId(),
      })
    },
    onSuccess: () => {
      setOpen(false)
      setNewCommunityName("")
      setNewCommunityDesc("")
      setNewCommunityRules("")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
    }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-full">

      {/* HEADER */}

      <div className="flex items-center justify-between mb-10">

        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Discover Communities
          </h1>
          <p className="text-gray-400">
            Find your tribe or start a new space focused on what matters to you.
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 transition px-5 py-2.5 rounded-xl text-white font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Create Community
        </button>

      </div>

      {/* GRID */}
      
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {communities?.map((community) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * community.id }}
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => router.push(`/channel/${community.id}`)}
              className="group relative cursor-pointer bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/50 shadow-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] overflow-hidden"
            >

              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <h2 className="text-2xl font-bold text-white mb-2 relative z-10 group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all">
                {community.name}
              </h2>

              <p className="text-gray-400 text-sm mb-6 leading-relaxed relative z-10">
                {community.description}
              </p>

              <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium relative z-10">
                <Users size={16} />
                Open Community &rarr;
              </div>

            </motion.div>
          ))}

        </div>
      )}

      {/* ADVANCED CREATE COMMUNITY MODAL */}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-[#0a0d14] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Create Community</h2>
                  <p className="text-sm text-gray-400 mt-1">Set up your space and configure AI moderation.</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                
                {/* General Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Community Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Next.js Developers"
                      value={newCommunityName}
                      onChange={(e) => setNewCommunityName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      placeholder="What is this community about?"
                      rows={2}
                      value={newCommunityDesc}
                      onChange={(e) => setNewCommunityDesc(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner resize-none"
                    />
                  </div>
                </div>

                {/* AI Rules Section */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />
                  
                  <div className="flex items-center gap-2 mb-3 relative z-10">
                    <Shield size={18} className="text-indigo-400" />
                    <h3 className="text-sm font-semibold text-indigo-300">AI Moderation Rules (Gemini Powered)</h3>
                  </div>
                  
                  <p className="text-xs text-indigo-200/60 mb-3 relative z-10">
                    Define custom behavioral rules for your community. The AI Moderator will analyze messages against these rules to block or flag appropriate content securely.
                  </p>
                  
                  <textarea
                    placeholder="e.g. No profanity. Be helpful. Do not post malicious links or spam. Keep discussions related to web development."
                    rows={4}
                    className="w-full bg-black/20 border border-indigo-500/30 rounded-lg px-4 py-3 text-sm text-white placeholder-indigo-300/30 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all shadow-inner resize-none relative z-10"
                    value={newCommunityRules}
                    onChange={(e) => setNewCommunityRules(e.target.value)}
                  />
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3 shrink-0">
                <button
                  disabled={createMutation.isPending}
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={createMutation.isPending || !newCommunityName.trim()}
                  onClick={() => createMutation.mutate()}
                  className={clsx(
                    "px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2",
                    newCommunityName.trim()
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02]"
                      : "bg-white/5 text-gray-500 cursor-not-allowed"
                  )}
                >
                  {createMutation.isPending ? (
                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Create & Apply Rules"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}