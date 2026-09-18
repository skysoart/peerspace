"use client"

import { motion } from "framer-motion"
import { ShieldAlert, MessageSquare, UserPlus, FileText } from "lucide-react"

export type ActivityType = "warning" | "message" | "join" | "system"

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  timestamp: string
  description?: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
}

const getIconForType = (type: ActivityType) => {
  switch (type) {
    case "warning": return <ShieldAlert size={18} className="text-red-400" />
    case "message": return <MessageSquare size={18} className="text-indigo-400" />
    case "join": return <UserPlus size={18} className="text-emerald-400" />
    case "system": return <FileText size={18} className="text-purple-400" />
  }
}

const getBgForType = (type: ActivityType) => {
  switch (type) {
    case "warning": return "bg-red-500/10 border-red-500/20"
    case "message": return "bg-indigo-500/10 border-indigo-500/20"
    case "join": return "bg-emerald-500/10 border-emerald-500/20"
    case "system": return "bg-purple-500/10 border-purple-500/20"
  }
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-2xl p-6 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight">System & AI Logs</h3>
        <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          View All Logs &rarr;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
            <FileText size={32} className="opacity-50" />
            <p className="text-sm">No recent activity found.</p>
          </div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors duration-200 border border-transparent hover:border-white/10"
            >
              {/* Icon Status */}
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${getBgForType(item.type)}`}>
                {getIconForType(item.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h4 className="text-sm font-semibold text-gray-200 truncate">{item.title}</h4>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">{item.timestamp}</span>
                </div>
                {item.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5 group-hover:text-gray-300 transition-colors">
                    {item.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
