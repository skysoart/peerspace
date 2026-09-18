"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Activity, MessageSquareWarning, Mic, Send, Box, ShieldCheck, ShieldAlert, Cpu } from "lucide-react"
import clsx from "clsx"
import FloatingLines from "@/components/ui/floating-lines"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loginError, setLoginError] = useState(false)

  // Dashboard State
  const [aiEnabled, setAiEnabled] = useState(true)
  const [activeChannel, setActiveChannel] = useState("java-fullstack")
  
  // Stats
  const [stats, setStats] = useState({ safe: 0, blocked: 0, channels: 0 })
  const [logs, setLogs] = useState<string[]>([])
  
  // Messages
  const [adminMessages, setAdminMessages] = useState<{id: string, text: string, type: string, feedback?: string}[]>([])
  const [feedMessages, setFeedMessages] = useState<{id: string, text: string, type: string}[]>([])
  const [inputMsg, setInputMsg] = useState("")

  const logsEndRef = useRef<HTMLDivElement>(null)
  const adminMsgEndRef = useRef<HTMLDivElement>(null)

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [...prev, `[${time}] ${msg}`])
  }

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  useEffect(() => {
    adminMsgEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [adminMessages])

  // Fetch real stats from backend
  async function fetchStats() {
    try {
      const res = await fetch(`${API}/messages/admin/stats`)
      if (res.ok) {
        const data = await res.json()
        setStats({ safe: data.safe_messages, blocked: data.flagged_messages, channels: data.total_channels })
      }
    } catch (e) {
      console.error("Failed to fetch stats", e)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      addLog("Security cleared. Interface initialized.")
      fetchStats()
      const interval = setInterval(fetchStats, 5000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])


  function handleLogin() {
    if (username === "admin" && password === "techKali") {
      setIsAuthenticated(true)
      setLoginError(false)
    } else {
      setLoginError(true)
    }
  }

  async function handleSend() {
    if (!inputMsg.trim()) return
    const text = inputMsg.trim()
    setInputMsg("")

    if (!aiEnabled) {
      setStats(prev => ({ ...prev, safe: prev.safe + 1 }))
      setAdminMessages(prev => [...prev, { id: Date.now().toString(), text, type: "sent" }])
      setFeedMessages(prev => [...prev, { id: Date.now().toString(), text, type: "received" }])
      addLog(`Message sent bypassing AI filter.`)
      return
    }

    try {
      addLog(`Analyzing network payload...`)
      
      // We assume channel_id 1 is the test target
      const res = await fetch(`${API}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: 1, channel_id: 1, message_text: text })
      })
      
      const data = await res.json()
      
      if (data.moderation_result === "APPROVED") {
        setStats(prev => ({ ...prev, safe: prev.safe + 1 }))
        setAdminMessages(prev => [...prev, { id: data.id?.toString() || Date.now().toString(), text, type: "sent" }])
        setFeedMessages(prev => [...prev, { id: data.id?.toString() || Date.now().toString(), text, type: "received" }])
        addLog(`Payload APPROVED by AI. Sent to network.`)
      } else {
        setStats(prev => ({ ...prev, blocked: prev.blocked + 1 }))
        setAdminMessages(prev => [...prev, { id: data.id?.toString() || Date.now().toString(), text, type: "blocked", feedback: data.feedback }])
        addLog(`Payload FLAGGED. Threat detected in message.`)
      }
    } catch (e) {
      addLog(`❌ Server Timeout or Error connecting to Moderator.`)
    }
  }

  async function forceOverride(msgId: string, text: string) {
    const key = window.prompt("Admin Key Required to Override Rules:")
    if (key === "techKali") {
      
      try {
        await fetch(`${API}/messages/admin/override/${msgId}`, { method: "POST" })
      } catch (e) {}

      setStats(prev => ({ ...prev, blocked: prev.blocked - 1, safe: prev.safe + 1 }))
      setAdminMessages(prev => prev.map(m => m.id === msgId ? { ...m, type: "sent", text: `${m.text} (Admin Overridden)` } : m))
      setFeedMessages(prev => [...prev, { id: Date.now().toString(), text, type: "received" }])
      addLog(`⚠️ Policy Override Executed: Content forcefully broadcasted.`)
    } else {
      alert("Invalid Admin Key")
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_center,#15182A_0%,#060010_100%)]">
        <FloatingLines />
        <AnimatePresence>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/[0.02] p-[50px] rounded-[30px] border border-white/[0.08] backdrop-blur-[40px] w-[400px] text-center shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
          >
            <div className="text-[1.6rem] font-black tracking-[2px] mb-[10px] text-white flex items-center justify-center gap-[10px] font-outfit">
               PEERSPACE <span className="text-[#5EEAD4]">AI</span>
            </div>
            <h2 className="text-white mb-[10px] font-outfit font-bold text-2xl">Security Portal</h2>
            <p className="text-[#718096] text-[0.85rem] mb-[30px]">Initialize session to proceed</p>
            
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-[14px] mb-[20px] bg-white/[0.05] border border-white/[0.08] rounded-[12px] text-white outline-none text-[1rem]" 
              placeholder="Username" 
            />
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full p-[14px] mb-[20px] bg-white/[0.05] border border-white/[0.08] rounded-[12px] text-white outline-none text-[1rem]" 
              placeholder="Admin Passkey" 
            />
            
            <button 
              onClick={handleLogin}
              className="w-full p-[14px] bg-gradient-to-br from-[#E947F5] to-[#7D26CF] border-none rounded-[12px] text-white font-black cursor-pointer transition-transform hover:scale-105"
            >
              Unlock Interface
            </button>
            
            {loginError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#FF4D4D] mt-[15px] text-[0.8rem] font-bold">
                Access Denied
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  const isGeneral = activeChannel === "general"

  return (
    <div className="flex h-screen bg-[#060010] text-[#E2E8F0] overflow-hidden font-sans font-inter relative z-20">
      <FloatingLines />
      
      {/* SIDEBAR */}
      <div className="w-[260px] bg-[#050508] border-r border-white/10 flex flex-col p-[30px_20px] z-[100] relative">
        <div className="text-[1.6rem] font-black tracking-[2px] mb-[50px] text-white flex items-center gap-[10px] font-outfit">
          <div className="w-[22px] h-[22px] rounded-[6px] bg-gradient-to-br from-[#E947F5] to-[#7D26CF] shadow-[0_0_10px_#E947F5]" /> 
          PEERSPACE
        </div>

        <div className="text-[0.65rem] text-[#4A5568] uppercase tracking-[2px] m-[30px_0_15px] font-bold">Communities</div>
        <div className="p-[12px_15px] rounded-[12px] cursor-pointer transition-all flex items-center gap-[12px] mb-[6px] text-[#94A3B8] text-[0.95rem] font-medium hover:bg-white/5">🌐 Global Network</div>
        <div className="p-[12px_15px] rounded-[12px] cursor-pointer transition-all flex items-center gap-[12px] mb-[6px] text-[#94A3B8] text-[0.95rem] font-medium hover:bg-white/5">🎓 Official Groups</div>

        <div className="text-[0.65rem] text-[#4A5568] uppercase tracking-[2px] m-[30px_0_15px] font-bold">Test Channels</div>
        
        <div 
          onClick={() => {
            setActiveChannel("general")
            setAiEnabled(false)
            addLog("Channel: General. AI Filter Disabled.")
          }}
          className={clsx(
            "p-[12px_15px] rounded-[12px] cursor-pointer transition-all flex items-center gap-[12px] mb-[6px] text-[0.95rem] font-medium",
            isGeneral ? "bg-white/5 text-[#FF9900] border border-white/10 shadow-[0_0_15px_rgba(255,153,0,0.1)]" : "text-[#94A3B8] hover:bg-white/5"
          )}
        >
          # general
        </div>
        
        <div 
          onClick={() => {
            setActiveChannel("java-fullstack")
            setAiEnabled(true)
            addLog("Channel: Java Full Stack. AI Filter Enabled.")
          }}
          className={clsx(
            "p-[12px_15px] rounded-[12px] cursor-pointer transition-all flex items-center gap-[12px] mb-[6px] text-[0.95rem] font-medium",
            !isGeneral ? "bg-white/5 text-[#5EEAD4] border border-white/10 shadow-[0_0_15px_rgba(94,234,212,0.1)]" : "text-[#94A3B8] hover:bg-white/5"
          )}
        >
          # java-fullstack
        </div>

      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 bg-transparent">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-[40px] h-[80px] border-b border-white/10 bg-[#060010]/40 backdrop-blur-[20px]">
          <div className="flex gap-[25px] items-center">
            <span className="text-[0.9rem] font-semibold text-[#94A3B8] cursor-pointer hover:text-white transition-colors">Moderation AI ▾</span>
            <span className="text-[0.9rem] font-semibold text-[#94A3B8] cursor-pointer hover:text-white transition-colors">Live Stats ▾</span>
            <span className="text-[0.9rem] font-semibold text-[#94A3B8] cursor-pointer hover:text-white transition-colors">System Logs ▾</span>
          </div>
          <div className="flex gap-[15px] items-center">
            
            <div 
              onClick={() => {
                setAiEnabled(!aiEnabled)
                addLog(`Admin manually toggled AI state: ${!aiEnabled ? 'ON' : 'OFF'}`)
              }}
              className={clsx(
                "border rounded-[30px] p-[10px_20px] flex items-center gap-[10px] cursor-pointer transition-all",
                aiEnabled ? "border-[#5EEAD4] bg-[#5EEAD4]/5" : "border-white/10 bg-white/[0.03]"
              )}
            >
              <div className={clsx("w-[10px] h-[10px] rounded-full shadow-[0_0_10px]", aiEnabled ? "bg-[#5EEAD4] shadow-[#5EEAD4]" : "bg-[#FF4D4D] shadow-[#FF4D4D]")} />
              <span className="text-[0.8rem] font-black text-white font-outfit uppercase">AI FILTER: {aiEnabled ? 'ON' : 'OFF'}</span>
            </div>

          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-[40px_50px] flex flex-col gap-[30px] overflow-y-auto custom-scrollbar">
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="m-0 text-[3rem] font-black text-white tracking-tight font-outfit">
                Welcome back, <span className={isGeneral ? "text-[#FF9900]" : "text-[#5EEAD4]"}>Admin.</span>
              </h1>
              <p className="text-[#94A3B8] mt-[8px]">Here's what is happening in your network today.</p>
            </div>
            <div className="bg-[#5EEAD4]/5 text-[#5EEAD4] border border-[#5EEAD4]/20 p-[8px_18px] rounded-[30px] text-[0.9rem] font-bold flex items-center gap-[8px]">
              <div className="w-2 h-2 rounded-full bg-[#5EEAD4] animate-pulse" />
              100% Health
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[25px] mb-[10px]">
            <div className="bg-[#14161E]/70 rounded-[24px] border border-white/10 p-[25px] backdrop-blur-[40px]">
              <div className="text-[3rem] font-black text-white leading-none font-outfit">{stats.safe}</div>
              <div className="text-[0.75rem] text-[#4A5568] uppercase mt-[10px] tracking-[2px] font-bold flex items-center gap-2"><ShieldCheck size={14}/> Approved Messages</div>
            </div>
            <div className="bg-[#14161E]/70 rounded-[24px] border border-white/10 p-[25px] backdrop-blur-[40px]">
              <div className={clsx("text-[3rem] font-black leading-none font-outfit", isGeneral ? "text-[#FF9900]" : "text-[#5EEAD4]")}>{stats.channels}</div>
              <div className="text-[0.75rem] text-[#4A5568] uppercase mt-[10px] tracking-[2px] font-bold flex items-center gap-2"><Activity size={14}/> Active Channels</div>
            </div>
            <div className="bg-[#14161E]/70 rounded-[24px] border border-white/10 p-[25px] backdrop-blur-[40px]">
              <div className="text-[3rem] font-black text-[#FF4D4D] leading-none font-outfit">{stats.blocked}</div>
              <div className="text-[0.75rem] text-[#4A5568] uppercase mt-[10px] tracking-[2px] font-bold flex items-center gap-2"><ShieldAlert size={14}/> Threats Detected</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr_0.8fr] gap-[30px] min-h-[500px] pb-[20px]">
            
            {/* SENDER PANEL */}
            <div className="flex flex-col bg-[#14161E]/70 rounded-[24px] border border-white/10 overflow-hidden backdrop-blur-[40px]">
              <div className="p-[20px_25px] border-b border-white/10 font-black text-[1.1rem] text-white bg-black/20 flex justify-between items-center font-outfit">
                Admin Console (You)
                <span className={clsx("text-[0.7rem] bg-white/5 p-[4px_12px] rounded-[20px] uppercase font-black tracking-widest", isGeneral ? "text-[#FF9900]" : "text-[#5EEAD4]")}>
                  {isGeneral ? "General" : "Java Full Stack"}
                </span>
              </div>
              <div className="flex-1 p-[25px] overflow-y-auto flex flex-col gap-[20px] custom-scrollbar">
                
                {adminMessages.length === 0 && <div className="text-white/30 text-sm m-auto font-medium">Send a test message to evaluate the AI model...</div>}

                {adminMessages.map((msg, i) => (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={i} className={clsx("flex gap-[15px] relative")}>
                     <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center font-black text-[1.2rem] text-white shrink-0 bg-gradient-to-br from-[#FFB3CC] to-[#FF4D94]">A</div>
                     <div className="flex flex-col items-start min-w-0">
                        <div className="font-black text-[0.95rem] text-white mb-[4px]">Admin</div>
                        <div className={clsx(
                          "rounded-[18px] overflow-hidden border max-w-full flex",
                          msg.type === "blocked" 
                            ? "border-[#FF4D4D] bg-[#FF4D4D]/10" 
                            : "bg-[#2F4BA2]/50 border-white/10"
                        )}>
                           <div className={clsx("text-[1rem] leading-[1.5] p-[14px_20px] break-words", msg.type === "blocked" ? "text-[#FFB3B3]" : "text-[#CBD5E0]")}>
                             {msg.type === "blocked" ? (
                               <>
                                  <span className="font-bold text-white mb-2 block">🚫 FLAGGED BY AI MODEL:</span>
                                  {msg.text}
                                  <div className="mt-2 text-xs opacity-70 border-t border-red-500/30 pt-2"><Cpu size={12} className="inline mr-1"/>Reason: {msg.feedback}</div>
                               </>
                             ) : msg.text}
                           </div>

                           {/* FORCE OVERRIDE BUTTON INJECTED FOR BLOCKED ITEMS */}
                           {msg.type === "blocked" && (
                              <div 
                                onClick={() => forceOverride(msg.id, msg.text)}
                                className="w-[120px] bg-[#FF9900] flex items-end justify-center pb-[15px] cursor-pointer transition-[filter] hover:brightness-120 shrink-0"
                              >
                                <div className="font-outfit font-black text-[10px] text-black uppercase text-center leading-[1.2] pointer-events-none">
                                  FORCE APPROVE<br/>(techKali)
                                </div>
                              </div>
                           )}

                        </div>
                     </div>
                  </motion.div>
                ))}
                <div ref={adminMsgEndRef} />
              </div>
              <div className="p-[20px_25px] bg-black/40 flex gap-[12px] items-center border-t border-white/10">
                <button className="w-[48px] h-[48px] bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"><Mic size={20}/></button>
                <input 
                  type="text" 
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Inject payload to channel..." 
                  className="flex-1 p-[14px_20px] rounded-[12px] border border-white/10 bg-white/[0.03] text-white outline-none focus:border-[#5EEAD4] transition-colors"
                />
                <button onClick={handleSend} className="w-[85px] h-[48px] bg-[#E947F5] border-none rounded-[12px] text-white font-black hover:brightness-110 flex items-center justify-center"><Send size={18}/></button>
              </div>
            </div>

            {/* RECEIVER PANEL */}
            <div className="flex flex-col bg-[#14161E]/70 rounded-[24px] border border-white/10 overflow-hidden backdrop-blur-[40px]">
               <div className="p-[20px_25px] border-b border-white/10 font-black text-[1.1rem] text-white bg-black/20 font-outfit">
                Live App Sync <span className="text-xs ml-2 text-[#94A3B8] font-normal tracking-wide bg-white/5 py-1 px-3 rounded-full">User Device View</span>
               </div>
               <div className="flex-1 p-[25px] overflow-y-auto flex flex-col gap-[20px] custom-scrollbar">
                
                {feedMessages.length === 0 && <div className="text-white/30 text-sm m-auto font-medium">Awaiting valid inbound messages...</div>}

                {feedMessages.map((msg, i) => (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={i} className={clsx("flex gap-[15px] relative")}>
                     <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center font-black text-[1.2rem] text-white shrink-0 bg-gradient-to-br from-[#CCB3FF] to-[#704DFF]">P</div>
                     <div className="flex flex-col items-start min-w-0">
                        <div className="font-black text-[0.95rem] text-white mb-[4px]">Channel Users</div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-[18px] overflow-hidden max-w-full">
                           <div className="text-[1rem] leading-[1.5] text-[#CBD5E0] p-[14px_20px] break-words">
                             {msg.text}
                           </div>
                        </div>
                     </div>
                  </motion.div>
                ))}
               </div>
            </div>

            {/* LOGS PANEL */}
            <div className="flex flex-col bg-[#14161E]/70 rounded-[24px] border border-white/10 overflow-hidden backdrop-blur-[40px]">
               <div className="p-[20px_25px] border-b border-white/10 font-black text-[1.1rem] text-white bg-black/20 font-outfit text-center">
                System Process Logs
               </div>
               <div className="flex-1 p-[25px] overflow-y-auto flex flex-col gap-[12px] custom-scrollbar font-mono text-[0.75rem] text-[#4A5568]">
                 {logs.map((log, i) => (
                    <motion.div initial={{opacity:0, x:-5}} animate={{opacity:1, x:0}} key={i} className="border-l-2 border-[#5EEAD4]/30 pl-3">
                       {log.includes('APPROVED') && <span className="text-[#5EEAD4] mr-1">SUCCESS:</span>}
                       {log.includes('FLAGGED') && <span className="text-[#FF4D4D] mr-1">WARNING:</span>}
                       {log}
                    </motion.div>
                 ))}
                 <div ref={logsEndRef}/>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
