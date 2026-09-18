"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { apiClient } from "@/services/apiClient"
import { Mail, Lock, Loader2 } from "lucide-react"

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    setError("")

    try {

      const res = await apiClient.login({
        email,
        password
      })

      // Save user info to localStorage for use across the app
      if (res.user) {
        localStorage.setItem("user", JSON.stringify(res.user))
      } else {
        // Fallback: parse the email as username if no user object returned
        localStorage.setItem("user", JSON.stringify({
          id: res.user_id || 1,
          username: email.split("@")[0],
          email,
          type: "user"
        }))
      }

      router.push("/home")

    } catch (err: any) {

      setError("Invalid email or password. Please try again.")

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-[420px] bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-2xl p-8 shadow-2xl relative z-10"
      >

        {/* TITLE */}

        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Lock className="text-white" size={24} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2 tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">PEERSPACE</span>
        </h1>

        <p className="text-gray-400 text-sm text-center mb-8">
          Sign in to access your intelligent communities
        </p>


        {/* ERROR */}

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}


        {/* FORM */}

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-5"
        >

          {/* EMAIL */}

          <div className="relative group">

            <Mail
              size={18}
              className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors"
            />

            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />

          </div>


          {/* PASSWORD */}

          <div className="relative group">

            <Lock
              size={18}
              className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors"
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />

          </div>


          {/* LOGIN BUTTON */}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium shadow-lg shadow-indigo-500/25"
          >

            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Authenticating...
              </>
            ) : (
              "Login to Dashboard"
            )}

          </motion.button>

        </form>


        {/* FOOTER */}

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-gray-400">

          Don't have an account?

          <button
            onClick={() => router.push("/signup")}
            className="ml-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline underline-offset-4"
          >
            Create one now
          </button>

        </div>

      </motion.div>

    </div>
  )
}