"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import FloatingLines from "@/components/ui/floating-lines"

export default function LandingPage() {

  const router = useRouter()

  const continueAsGuest = () => {

    const guestUser = {
      id: 99999,  // Use a fixed numeric guest ID for API compatibility
      username: "Guest_" + Math.floor(Math.random() * 10000),
      type: "guest"
    }

    localStorage.setItem("user", JSON.stringify(guestUser))

    router.push("/home")
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <FloatingLines />
      
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-[20%] -translate-y-[80%] w-[400px] h-[400px] bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center max-w-3xl px-6"
      >
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="text-white" size={20} />
          </div>
          <span className="text-2xl font-extrabold tracking-widest text-white uppercase">
            PEERSPACE
          </span>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm text-indigo-300 font-medium mb-8 shadow-2xl"
        >
          <Sparkles size={16} />
          Welcome to the new standard for connection
        </motion.div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
          Experience <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm">
            PEERSPACE
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          The ultimate intelligent moderation platform. Build engaged communities, automate safety, and scale your audience globally with an industrial-grade infrastructure.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={continueAsGuest}
            className="group relative px-8 py-4 rounded-xl font-medium text-white shadow-xl isolate"
          >
            {/* Button Background & Glow */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 blur-[2px] transition-all duration-300 group-hover:blur-[8px] group-hover:scale-105" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]" />
            
            {/* Inner Ring */}
            <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-b from-white/10 to-transparent" />
            
            <div className="relative flex items-center gap-2">
              Continue as Guest
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/signup')}
            className="px-8 py-4 rounded-xl font-medium text-white border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/20"
          >
            Create an Account
          </button>
        </div>
      </motion.div>
    </div>
  )
}