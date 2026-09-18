"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import clsx from "clsx"
import {
  Send, Smile, Paperclip, Mic, MicOff, Phone, PhoneOff,
  Hash, Settings, Users, ShieldCheck, ShieldAlert, ShieldX,
  MoreHorizontal, Trash2, Reply, X, ChevronRight, ChevronLeft,
  UserPlus, LogOut, Crown, UserMinus, Edit2, Check, Loader2,
  Volume2, VolumeX, Video, Pin, Bell
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Msg {
  id: number
  user_id: number
  username: string
  message_text: string
  status: string
  ai_feedback?: string | null
  created_at?: string | null
  reactions?: Record<string, number>  // emoji -> count
  isOwn?: boolean
}

interface Member {
  user_id: number
  username: string
  email: string
  role: string
}

interface Community {
  id: number
  name: string
  description?: string
  icon?: string
  owner_id?: number
}

// ─── Emoji Panel ──────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = {
  "😊 Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝"],
  "👍 Reactions": ["👍","👎","❤️","🔥","👏","🎉","😮","😢","😡","💯","✅","🚀","💀","👀","🤔","💪","🙏","✨","⭐","💎"],
  "🐱 Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉"],
}

// ─── QUICK REACTIONS ──────────────────────────────────────────────────────────
const QUICK_REACTIONS = ["👍","❤️","😂","😮","😢","🔥"]

// ─── AVATAR COLORS ────────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  "from-violet-500 to-purple-700",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-cyan-400 to-blue-600",
  "from-fuchsia-500 to-purple-600",
  "from-lime-400 to-green-600",
  "from-red-400 to-rose-700",
]

type Panel = "members" | "settings" | null

// ══════════════════════════════════════════════════════════════════════════════
export default function ChannelPage() {
  const params = useParams()
  const channelId = parseInt(params.id as string)

  // ─── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Msg[]>([])
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<Panel>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [community, setCommunity] = useState<Community | null>(null)

  // Emoji
  const [showEmoji, setShowEmoji] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0])
  const [hoverMsg, setHoverMsg] = useState<number | null>(null)
  const [quickReactTarget, setQuickReactTarget] = useState<number | null>(null)

  // Message menu
  const [msgMenuId, setMsgMenuId] = useState<number | null>(null)
  const [replyTo, setReplyTo] = useState<Msg | null>(null)

  // Settings edit
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editIcon, setEditIcon] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)

  // Voice channel (simulated with browser APIs)
  const [inVoice, setInVoice] = useState(false)
  const [muted, setMuted] = useState(false)

  // Add member
  const [addMemberEmail, setAddMemberEmail] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  const [addMemberMsg, setAddMemberMsg] = useState("")

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function getCurrentUser() {
    try {
      const s = localStorage.getItem("user")
      if (s) return JSON.parse(s)
    } catch {}
    return { id: 1, username: "You", type: "user" }
  }

  const fmtTime = (iso?: string | null) => {
    if (!iso) return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  // ─── Fetch Community + Channel Info ─────────────────────────────────────────
  async function loadCommunity() {
    try {
      const chRes = await fetch(`${API}/channels/detail/${channelId}`)
      if (!chRes.ok) return
      const chData = await chRes.json()
      const communityId = chData.community_id || 1
      const commRes = await fetch(`${API}/communities/${communityId}`)
      if (commRes.ok) {
        const comm = await commRes.json()
        setCommunity(comm)
        setEditName(comm.name || "")
        setEditDesc(comm.description || "")
        setEditIcon(comm.icon || "")
      }
    } catch {}
  }

  // ─── Fetch Messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/messages/${channelId}`)
      if (!res.ok) return
      const data = await res.json()
      const user = getCurrentUser()
      const raw: any[] = data.messages || data || []
      setMessages(raw.map(m => ({
        ...m,
        isOwn: m.user_id === (user.id || 1),
        reactions: m.reactions || {},
      })))
    } catch {}
    setLoading(false)
  }, [channelId])

  // ─── Fetch Members ───────────────────────────────────────────────────────────
  async function loadMembers() {
    try {
      const chRes = await fetch(`${API}/channels/${channelId}`)
      if (!chRes.ok) return
      const chData = await chRes.json()
      const commId = chData.community_id || 1
      const res = await fetch(`${API}/communities/${commId}/members`)
      if (res.ok) setMembers(await res.json())
    } catch {}
  }

  useEffect(() => {
    loadCommunity()
    loadMessages()
    // Poll every 4 seconds — smarter than 3s since messages don't disappear again
    const interval = setInterval(loadMessages, 4000)
    return () => clearInterval(interval)
  }, [channelId, loadMessages])

  useEffect(() => {
    if (panel === "members") loadMembers()
  }, [panel, channelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Close emoji on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  // ─── Send Message ────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputText.trim()
    if (!text || sending) return

    const user = getCurrentUser()
    setInputText("")
    setSending(true)
    setReplyTo(null)

    const tempId = Date.now()
    const optimistic: Msg = {
      id: tempId,
      user_id: user.id || 1,
      username: user.username,
      message_text: replyTo ? `> @${replyTo.username}: ${replyTo.message_text}\n${text}` : text,
      status: "pending",
      isOwn: true,
      reactions: {},
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch(`${API}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id || 1, channel_id: channelId, message_text: optimistic.message_text }),
      })
      const result = await res.json()
      setMessages(prev => prev.map(m =>
        m.id === tempId ? {
          ...m, id: result.id || tempId, status: result.moderation_result || "APPROVED",
          ai_feedback: result.feedback, created_at: result.created_at,
        } : m
      ))
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" } : m))
    } finally {
      setSending(false)
    }
  }

  // ─── Delete Message ──────────────────────────────────────────────────────────
  async function deleteMessage(msgId: number) {
    const user = getCurrentUser()
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setMsgMenuId(null)
    try {
      await fetch(`${API}/messages/${msgId}?user_id=${user.id || 1}`, { method: "DELETE" })
    } catch {}
  }

  // ─── Toggle Reaction (local only for now) ────────────────────────────────────
  function toggleReaction(msgId: number, emoji: string) {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m
      const reacts = { ...m.reactions }
      reacts[emoji] = (reacts[emoji] || 0) + 1
      return { ...m, reactions: reacts }
    }))
    setQuickReactTarget(null)
    setMsgMenuId(null)
  }

  // ─── Save settings ───────────────────────────────────────────────────────────
  async function saveSettings() {
    if (!community) return
    setSavingSettings(true)
    try {
      const res = await fetch(`${API}/communities/${community.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc, icon: editIcon }),
      })
      if (res.ok) { const updated = await res.json(); setCommunity(updated) }
    } catch {}
    setSavingSettings(false)
  }

  async function leaveGroup() {
    const user = getCurrentUser()
    if (!community) return
    try {
      await fetch(`${API}/communities/${community.id}/leave?user_id=${user.id || 1}`, { method: "POST" })
      window.location.href = "/home"
    } catch {}
  }

  async function removeMember(userId: number) {
    if (!community) return
    try {
      await fetch(`${API}/communities/${community.id}/members/${userId}`, { method: "DELETE" })
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    } catch {}
  }

  // ─── Keyboard ────────────────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ─── Status badge ─────────────────────────────────────────────────────────────
  function StatusBadge({ status }: { status: string }) {
    if (!status || status === "pending" || status === "APPROVED") return null
    const map: Record<string, {icon: any, label: string, cls: string}> = {
      FLAGGED: { icon: ShieldAlert, label: "Flagged", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
      BLOCKED: { icon: ShieldX, label: "Blocked", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
    }
    const c = map[status.toUpperCase()]; if (!c) return null
    const Icon = c.icon
    return (
      <span className={clsx("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border", c.cls)}>
        <Icon size={9} /> {c.label}
      </span>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  const user = getCurrentUser()

  return (
    <div className="flex h-full bg-[#0a0b0f] text-gray-100 overflow-hidden">

      {/* ── MESSAGES COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Channel Header */}
        <div className="h-[56px] border-b border-white/[0.06] flex items-center px-5 bg-[#0d0e14]/80 backdrop-blur-sm gap-3 shrink-0 z-20">
          <Hash size={18} className="text-indigo-400" />
          <span className="font-bold text-white text-[15px]">
            {community ? community.name : `channel-${channelId}`}
          </span>
          {community?.description && (
            <span className="text-gray-500 text-xs border-l border-white/10 pl-3 ml-1 hidden md:block truncate max-w-[200px]">
              {community.description}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {/* Voice Join */}
            <button
              onClick={() => setInVoice(!inVoice)}
              className={clsx(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                inVoice ? "bg-green-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
              )}
              title="Voice Channel"
            >
              {inVoice ? <PhoneOff size={16}/> : <Phone size={16}/>}
            </button>

            {inVoice && (
              <button
                onClick={() => setMuted(!muted)}
                className={clsx("h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                  muted ? "bg-red-600/70 text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
                )}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff size={16}/> : <Mic size={16}/>}
              </button>
            )}

            <button
              onClick={() => setPanel(p => p === "members" ? null : "members")}
              className={clsx("h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                panel === "members" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
              )}
              title="Members"
            >
              <Users size={16}/>
            </button>

            <button
              onClick={() => setPanel(p => p === "settings" ? null : "settings")}
              className={clsx("h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                panel === "settings" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
              )}
              title="Settings"
            >
              <Settings size={16}/>
            </button>
          </div>
        </div>

        {/* Voice bar */}
        <AnimatePresence>
          {inVoice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-green-900/40 border-b border-green-500/20 flex items-center gap-3 px-5 py-2 text-sm"
            >
              <Volume2 size={14} className="text-green-400 animate-pulse"/>
              <span className="text-green-300 font-medium">Voice Active</span>
              <span className="text-gray-500 text-xs">You are in a voice session — press mute to mute, hang up to leave</span>
              <button onClick={() => setInVoice(false)} className="ml-auto text-red-400 hover:text-red-300 flex items-center gap-1 text-xs">
                <PhoneOff size={13}/> Leave
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply banner */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-indigo-900/30 border-b border-indigo-500/20 flex items-center gap-3 px-5 py-2 text-xs"
            >
              <Reply size={13} className="text-indigo-400"/>
              <span className="text-indigo-300">Replying to <b>@{replyTo.username}</b>:</span>
              <span className="text-gray-400 truncate max-w-[300px]">{replyTo.message_text}</span>
              <button onClick={() => setReplyTo(null)} className="ml-auto text-gray-500 hover:text-white"><X size={13}/></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#2d3148 transparent" }}>
          {loading ? (
            <div className="flex items-center justify-center h-full gap-3 text-gray-500">
              <Loader2 className="animate-spin" size={20}/> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 select-none">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
                <Hash size={28} className="text-indigo-400"/>
              </div>
              <p className="text-white font-bold text-lg">Start the conversation!</p>
              <p className="text-gray-500 text-sm">Send the first message to kick things off.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const prevMsg = messages[i - 1]
              const isGrouped = prevMsg && prevMsg.user_id === msg.user_id && !replyTo
              const isOwn = msg.isOwn

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={clsx("group relative flex gap-3 px-2 py-0.5 rounded-xl hover:bg-white/[0.025] transition-colors", isGrouped && "mt-0.5")}
                  onMouseEnter={() => setHoverMsg(msg.id)}
                  onMouseLeave={() => { setHoverMsg(null); if (quickReactTarget === msg.id) setQuickReactTarget(null) }}
                >
                  {/* Avatar / Stack */}
                  {!isGrouped ? (
                    <div className={clsx("h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 shadow-md select-none",
                      AVATAR_PALETTE[msg.user_id % AVATAR_PALETTE.length]
                    )}>
                      {msg.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  ) : (
                    <div className="w-9 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-gray-600">{fmtTime(msg.created_at)}</span>
                    </div>
                  )}

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {!isGrouped && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx("font-semibold text-sm", isOwn ? "text-indigo-300" : "text-gray-200")}>
                          {isOwn ? "You" : msg.username}
                        </span>
                        <span className="text-[11px] text-gray-600">{fmtTime(msg.created_at)}</span>
                        <StatusBadge status={msg.status}/>
                        {msg.status === "pending" && <span className="text-[10px] text-gray-600 italic">sending…</span>}
                      </div>
                    )}

                    {/* Text with quote-reply appearance */}
                    {msg.message_text.startsWith("> @") ? (
                      <div className="space-y-1">
                        <div className="border-l-2 border-indigo-500/50 pl-3 text-xs text-gray-500 leading-relaxed bg-indigo-500/5 rounded-r-lg py-1">
                          {msg.message_text.split("\n")[0].replace("> ", "")}
                        </div>
                        <p className={clsx("text-sm leading-relaxed break-words",
                          msg.status === "FLAGGED" ? "text-amber-200" : msg.status === "BLOCKED" ? "text-red-300 line-through opacity-70" : "text-gray-100"
                        )}>{msg.message_text.split("\n").slice(1).join("\n")}</p>
                      </div>
                    ) : (
                      <p className={clsx("text-sm leading-relaxed break-words",
                        msg.status === "FLAGGED" ? "text-amber-200" : msg.status === "BLOCKED" ? "text-red-300/60 line-through" : "text-gray-100"
                      )}>{msg.message_text}</p>
                    )}

                    {/* AI Feedback */}
                    {msg.ai_feedback && (msg.status === "FLAGGED" || msg.status === "BLOCKED") && (
                      <div className="mt-1 flex items-start gap-1.5 text-[11px] text-gray-500">
                        <ShieldAlert size={11} className="shrink-0 mt-0.5 text-amber-500/60"/>{msg.ai_feedback}
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-sm transition-all"
                          >
                            <span>{emoji}</span>
                            <span className="text-[11px] text-gray-400">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover Actions Toolbar */}
                  <AnimatePresence>
                    {hoverMsg === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-2 top-0 -translate-y-1/2 flex items-center gap-1 bg-[#1a1d27] border border-white/10 rounded-xl px-2 py-1.5 shadow-xl z-10"
                      >
                        {/* Quick react */}
                        {QUICK_REACTIONS.map(e => (
                          <button key={e} onClick={() => toggleReaction(msg.id, e)}
                            className="text-base hover:scale-125 transition-transform p-0.5" title={`React ${e}`}>{e}</button>
                        ))}
                        <div className="w-[1px] h-4 bg-white/10 mx-0.5"/>
                        <button onClick={() => setReplyTo(msg)}
                          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Reply">
                          <Reply size={14}/>
                        </button>
                        {(isOwn || user?.type === "admin") && (
                          <button onClick={() => deleteMessage(msg.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input Bar */}
        <div className="px-5 pb-5 pt-2 shrink-0">
          <div className={clsx(
            "flex items-end gap-2 rounded-2xl px-4 py-3 transition-all duration-300 border",
            "bg-[#13151f] border-white/[0.08] focus-within:border-indigo-500/40 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.08)]"
          )}>
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="text-gray-500 hover:text-yellow-400 transition-colors p-1 shrink-0">
              <Smile size={20}/>
            </button>

            <button className="text-gray-500 hover:text-indigo-400 transition-colors p-1 shrink-0">
              <Paperclip size={19}/>
            </button>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => {
                setInputText(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px"
              }}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? `Replying to @${replyTo.username}…` : "Message#channel…"}
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder-gray-600 resize-none max-h-[150px] leading-relaxed py-0.5"
            />

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={sendMessage}
              disabled={!inputText.trim() || sending}
              className={clsx(
                "p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0",
                inputText.trim()
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                  : "bg-white/[0.05] text-gray-600 cursor-not-allowed"
              )}
            >
              {sending ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>}
            </motion.button>
          </div>

          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                ref={emojiRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-[90px] left-5 z-50 w-[360px] bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Category tabs */}
                <div className="flex gap-1 px-3 pt-3 pb-2 border-b border-white/[0.06] overflow-x-auto">
                  {Object.keys(EMOJI_CATEGORIES).map(cat => (
                    <button key={cat} onClick={() => setEmojiCategory(cat)}
                      className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                        emojiCategory === cat ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
                      )}>
                      {cat}
                    </button>
                  ))}
                </div>
                {/* Emojis */}
                <div className="p-3 grid grid-cols-9 gap-1.5 max-h-[200px] overflow-y-auto">
                  {(EMOJI_CATEGORIES as any)[emojiCategory].map((emoji: string) => (
                    <button key={emoji} onClick={() => { setInputText(t => t + emoji); setShowEmoji(false) }}
                      className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10">
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── SIDE PANEL ── */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-[#0d0e14] border-l border-white/[0.06] flex flex-col overflow-hidden shrink-0"
          >

            {/* Panel header */}
            <div className="h-[56px] flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
              <span className="font-bold text-sm text-white capitalize">
                {panel === "members" ? "Members" : "Group Settings"}
              </span>
              <button onClick={() => setPanel(null)} className="text-gray-500 hover:text-white p-1 rounded-md hover:bg-white/[0.07]">
                <X size={16}/>
              </button>
            </div>

            {/* ── MEMBERS PANEL ── */}
            {panel === "members" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-1">

                {/* Add member */}
                <div className="mb-3">
                  <div className="flex gap-2 mb-1">
                    <input
                      value={addMemberEmail}
                      onChange={e => setAddMemberEmail(e.target.value)}
                      placeholder="user@email.com"
                      className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      onClick={async () => {
                        if (!addMemberEmail.trim() || !community) return
                        setAddingMember(true)
                        setAddMemberMsg("")
                        try {
                          const res = await fetch(`${API}/communities/${community.id}/join?user_id=1`, { method: "POST" })
                          setAddMemberMsg(res.ok ? "✅ Invite sent!" : "❌ Failed")
                          loadMembers()
                        } catch { setAddMemberMsg("❌ Error") }
                        setAddingMember(false)
                      }}
                      disabled={addingMember}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      {addingMember ? <Loader2 size={12} className="animate-spin"/> : <UserPlus size={12}/>}
                    </button>
                  </div>
                  {addMemberMsg && <p className="text-[11px] text-gray-400">{addMemberMsg}</p>}
                </div>

                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                  {members.length} Members
                </div>

                {members.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">No members yet. Add someone above!</p>
                ) : members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.03] group">
                    <div className={clsx("h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0",
                      AVATAR_PALETTE[m.user_id % AVATAR_PALETTE.length]
                    )}>
                      {m.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-200 font-medium truncate">{m.username}</span>
                        {m.role === "admin" && <Crown size={11} className="text-amber-400 shrink-0"/>}
                      </div>
                      <span className="text-[11px] text-gray-600 capitalize">{m.role}</span>
                    </div>
                    {m.user_id !== (community?.owner_id || 0) && (
                      <button onClick={() => removeMember(m.user_id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-red-400 transition-all">
                        <UserMinus size={13}/>
                      </button>
                    )}
                  </div>
                ))}

                {/* Leave group */}
                <div className="pt-4 border-t border-white/[0.06] mt-4">
                  <button
                    onClick={() => { if (confirm("Leave this group?")) leaveGroup() }}
                    className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 font-medium py-2 rounded-xl hover:bg-red-500/10 transition-all"
                  >
                    <LogOut size={15}/> Leave Group
                  </button>
                </div>
              </div>
            )}

            {/* ── SETTINGS PANEL ── */}
            {panel === "settings" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Group icon / avatar */}
                <div className="flex flex-col items-center gap-3 py-3">
                  <div className={clsx("h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-3xl shadow-xl",
                    AVATAR_PALETTE[(community?.id || 0) % AVATAR_PALETTE.length]
                  )}>
                    {editIcon || community?.name?.[0]?.toUpperCase() || "G"}
                  </div>
                  <input
                    value={editIcon}
                    onChange={e => setEditIcon(e.target.value)}
                    placeholder="Emoji icon (e.g. 🚀)"
                    className="text-center bg-transparent border-b border-white/10 text-sm text-white outline-none w-40 py-1 placeholder-gray-600"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block">Group Name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block">Description</label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  {savingSettings ? <Loader2 size={15} className="animate-spin"/> : <Check size={15}/>}
                  Save Changes
                </button>

                {/* AI Moderation toggle info */}
                <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-3 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-emerald-400"/>
                    <span className="text-xs font-bold text-emerald-400">AI Moderation Active</span>
                  </div>
                  <p className="text-[11px] text-gray-500">All messages are scanned by Gemini AI before delivery.</p>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <button onClick={() => { if (confirm("Leave this group?")) leaveGroup() }}
                    className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 font-medium py-2 rounded-xl hover:bg-red-500/10 transition-all">
                    <LogOut size={15}/> Leave Group
                  </button>
                </div>

              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}