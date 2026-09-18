"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  delay?: number
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  trendValue,
  delay = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-2xl p-6 shadow-xl group"
    >
      {/* Background Glow Effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-all duration-300 shadow-inner">
          <Icon size={24} />
        </div>

        {trend && trendValue && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            trend === 'up' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' :
            trend === 'down' ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
            'text-gray-400 bg-white/5 border border-white/10'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
        
        {description && (
          <p className="text-xs text-gray-500 mt-3 border-t border-white/5 pt-3">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  )
}
