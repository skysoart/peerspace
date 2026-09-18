"use client"

import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/useAppStore"
import { motion } from "framer-motion"
import { Hash } from "lucide-react"

interface Channel {
  id: number
  name: string
  unread?: number
}

export default function ChannelNavigator({
  channels
}: {
  channels: Channel[]
}) {

  const router = useRouter()

  const activeChannel = useAppStore(
    (state) => state.activeChannel
  )

  const setActiveChannel = useAppStore(
    (state) => state.setActiveChannel
  )

  function openChannel(channel: Channel) {

    setActiveChannel(channel.id)

    router.push(`/channel/${channel.id}`)
  }

  return (

    <div className="flex flex-col gap-1 px-2">

      {channels.map((channel) => {

        const active = activeChannel === channel.id

        return (

          <motion.div
            key={channel.id}
            whileHover={{ x: 4 }}
            onClick={() => openChannel(channel)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition
            ${
              active
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-[#1c2233]"
            }`}
          >

            <Hash size={16} />

            <span className="flex-1 text-sm">
              {channel.name}
            </span>

            {channel.unread && channel.unread > 0 && (

              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                {channel.unread}
              </span>

            )}

          </motion.div>

        )
      })}

    </div>

  )
}