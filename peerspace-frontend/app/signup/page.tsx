"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { apiClient } from "@/services/apiClient"
import { Mail, Lock, User, Loader2 } from "lucide-react"

export default function SignupPage() {

  const router = useRouter()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [strength, setStrength] = useState(0)

  function checkStrength(p: string) {

    let s = 0

    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++

    setStrength(s)
  }

  async function handleSignup(e: React.FormEvent) {

    e.preventDefault()

    setError("")
    setLoading(true)

    try {

      await apiClient.signup({
        username,
        email,
        password
      })

      router.push("/login")

    } catch (err) {

      setError("Signup failed")

    } finally {

      setLoading(false)

    }

  }

  // ------------------------------
  // CONTINUE AS GUEST
  // ------------------------------

  function handleAnonymous() {

    const guestUser = {
      id: 99999,  // Use a fixed numeric guest ID for API compatibility  
      username: "Guest_" + Math.floor(Math.random() * 10000),
      type: "guest"
    }

    localStorage.setItem("user", JSON.stringify(guestUser))

    router.push("/home")

  }

  return (

    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Background Glows */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-[420px] bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-2xl p-8 shadow-2xl relative z-10"
      >

        {/* TITLE */}

        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <User className="text-white" size={24} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2 tracking-tight">
          Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">PEERSPACE</span>
        </h1>

        <p className="text-gray-400 text-sm text-center mb-8">
          Create an account to scale your audience securely
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        <form
          onSubmit={handleSignup}
          className="flex flex-col gap-5"
        >

          <div className="relative group">

            <User
              size={18}
              className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors"
            />

            <input
              type="text"
              placeholder="Username"
              required
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />

          </div>

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
              onChange={(e) => {
                setPassword(e.target.value)
                checkStrength(e.target.value)
              }}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />

          </div>

          {/* PASSWORD STRENGTH */}
          {password.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  strength === 1
                    ? "bg-red-500 w-1/3"
                    : strength === 2
                    ? "bg-yellow-500 w-2/3"
                    : strength === 3
                    ? "bg-emerald-500 w-full"
                    : "w-0"
                }`}
              />
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium shadow-lg shadow-indigo-500/25"
          >

            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}

          </motion.button>

        </form>

        {/* Continue as Guest */}

        <button
          onClick={handleAnonymous}
          className="mt-4 w-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md text-gray-300 py-3 rounded-xl font-medium transition-all duration-300 hover:border-white/20"
        >
          Continue as Guest
        </button>

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-gray-400">

          Already have an account?

          <button
            onClick={() => router.push("/login")}
            className="ml-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline underline-offset-4"
          >
            Login here
          </button>

        </div>

      </motion.div>

    </div>
  )
}