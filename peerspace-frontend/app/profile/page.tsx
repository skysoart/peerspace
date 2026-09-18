"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { apiClient } from "@/services/apiClient"
import { User, Loader2 } from "lucide-react"

interface Profile {
  id: number
  username: string
  bio?: string
}

export default function ProfilePage() {

  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const userId = 1

  useEffect(() => {

    async function loadProfile() {

      const res = await apiClient.getUser(userId)

      const data = res.data || res

      setProfile(data)
      setUsername(data.username)
      setBio(data.bio || "")
      setLoading(false)
    }

    loadProfile()

  }, [])

  async function saveProfile() {

    setSaving(true)

    await apiClient.updateUser(userId, {
      username,
      bio
    })

    setProfile({
      id: userId,
      username,
      bio
    })

    setEditing(false)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading profile...
      </div>
    )
  }

  return (

    <div className="flex justify-center py-12">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-[500px] bg-[#0f1422] border border-[#1c2233] rounded-xl p-8"
      >

        {/* AVATAR */}

        <div className="flex justify-center mb-6">

          <div className="h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold">

            {profile?.username[0]}

          </div>

        </div>

        {/* USERNAME */}

        <div className="mb-4">

          <label className="text-sm text-gray-400">
            Username
          </label>

          {editing ? (

            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              className="w-full mt-1 bg-[#0b0f19] border border-[#1c2233] rounded-lg px-3 py-2 text-white"
            />

          ) : (

            <div className="mt-1 text-white text-lg">
              {profile?.username}
            </div>

          )}

        </div>

        {/* BIO */}

        <div className="mb-6">

          <label className="text-sm text-gray-400">
            Bio
          </label>

          {editing ? (

            <textarea
              value={bio}
              onChange={(e) =>
                setBio(e.target.value)
              }
              className="w-full mt-1 bg-[#0b0f19] border border-[#1c2233] rounded-lg px-3 py-2 text-white"
            />

          ) : (

            <div className="mt-1 text-gray-300">
              {profile?.bio || "No bio yet"}
            </div>

          )}

        </div>

        {/* ACTION BUTTONS */}

        {!editing ? (

          <button
            onClick={() => setEditing(true)}
            className="w-full bg-indigo-600 py-2 rounded-lg text-white"
          >
            Edit Profile
          </button>

        ) : (

          <button
            onClick={saveProfile}
            className="w-full bg-indigo-600 py-2 rounded-lg text-white flex items-center justify-center gap-2"
          >

            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}

          </button>

        )}

      </motion.div>

    </div>
  )
}