"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X } from "lucide-react"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/services/apiClient"
import { useRouter } from "next/navigation"
import clsx from "clsx"

// We map backend Communities to Search Results
interface Community {
  id: number
  name: string
  description?: string
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()

  const { data: communities, isLoading } = useQuery<Community[]>({
    queryKey: ["communities"],
    queryFn: apiClient.getCommunities,
    enabled: open // Only fetch when modal opens
  })

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  // Filter Logic
  const filtered = communities?.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(query.toLowerCase()))
  ) || []

  function handleSelect(id: number) {
    setOpen(false)
    setQuery("")
    router.push(`/channel/${id}`)
  }

  return (
    <>
      {/* SEARCH BUTTON IN NAV */}
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center justify-between gap-3 px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl hover:bg-black/60 hover:border-indigo-500/50 transition-all w-64 shadow-inner"
      >
        <div className="flex items-center gap-2">
          <Search size={14} className="text-gray-400 group-hover:text-indigo-400 transition-colors" />
          <span className="text-sm font-medium text-gray-400 group-hover:text-gray-300">Quick Search...</span>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-500 font-bold">
          <kbd>Ctrl</kbd> <kbd>K</kbd>
        </div>
      </button>

      {/* SEARCH MODAL */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32 p-4">
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-2xl bg-[#0a0d14]/90 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 flex flex-col"
            >
              {/* TOP INPUT */}
              <div className="relative border-b border-white/5 bg-white/[0.02] p-4 flex items-center gap-3">
                <Search size={20} className="text-indigo-400 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find communities, channels, or people..."
                  className="flex-1 bg-transparent outline-none text-white text-lg placeholder-gray-500 font-medium"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400 hover:text-white transition-all border border-white/10"
                >
                  ESC
                </button>
              </div>

              {/* RESULTS AREA */}
              <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-indigo-400/50 gap-3">
                    <div className="h-6 w-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                    <span className="text-sm font-medium">Searching network...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No communities found matching "{query}"</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="px-2 pb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Communities
                    </div>
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect(c.id)}
                        className="w-full text-left group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 focus:bg-white/10 outline-none transition-all border border-transparent hover:border-white/5"
                      >
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white truncate">
                            {c.name}
                          </h4>
                          {c.description && (
                            <p className="text-xs text-gray-500 truncate group-hover:text-gray-400">
                              {c.description}
                            </p>
                          )}
                        </div>
                        <div className="text-xs font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Join <kbd className="ml-1 bg-white/10 px-1.5 py-0.5 rounded text-[10px]">↵</kbd>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="bg-black/40 p-3 border-t border-white/5 flex items-center justify-center gap-6 text-[11px] text-gray-500 font-medium">
                <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-white/5">↑</kbd> <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-white/5">↓</kbd> to navigate</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-white/5">↵</kbd> to select</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}