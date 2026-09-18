"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Pencil, Trash2, Check, X } from "lucide-react"

interface Props {
  messageId: number
  content: string
  onEdit?: (id: number, newText: string) => void
  onDelete?: (id: number) => void
}

export default function MessageActions({
  messageId,
  content,
  onEdit,
  onDelete
}: Props) {

  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(content)

  function saveEdit() {

    onEdit?.(messageId, text)

    setEditing(false)
  }

  function cancelEdit() {

    setText(content)
    setEditing(false)
  }

  return (

    <div className="flex flex-col gap-2">

      {!editing ? (

        <div className="flex items-center gap-2">

          <span className="text-gray-300 text-sm">
            {content}
          </span>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setEditing(true)}
            className="text-gray-500 hover:text-white"
          >
            <Pencil size={14} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete?.(messageId)}
            className="text-gray-500 hover:text-red-400"
          >
            <Trash2 size={14} />
          </motion.button>

        </div>

      ) : (

        <div className="flex items-center gap-2">

          <input
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            className="bg-[#0b0f19] border border-[#1c2233] rounded px-2 py-1 text-sm text-white"
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={saveEdit}
            className="text-green-400"
          >
            <Check size={14} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={cancelEdit}
            className="text-gray-400"
          >
            <X size={14} />
          </motion.button>

        </div>

      )}

    </div>

  )
}