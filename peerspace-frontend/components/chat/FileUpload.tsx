"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Paperclip, X } from "lucide-react"

interface Props {
  onFileSelect?: (file: File) => void
}

export default function FileUpload({ onFileSelect }: Props) {

  const [file, setFile] = useState<File | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {

    const selected = e.target.files?.[0]

    if (!selected) return

    setFile(selected)

    onFileSelect?.(selected)
  }

  function removeFile() {

    setFile(null)

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (

    <div className="flex flex-col gap-2">

      {/* FILE BUTTON */}

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => inputRef.current?.click()}
        className="text-gray-400 hover:text-white"
      >

        <Paperclip size={20} />

      </motion.button>

      <input
        type="file"
        hidden
        ref={inputRef}
        onChange={handleFile}
      />

      {/* FILE PREVIEW */}

      {file && (

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-[#1c2233] rounded-lg px-3 py-2"
        >

          <div className="text-sm text-gray-300 flex-1">

            {file.name}

            <div className="text-xs text-gray-500">

              {(file.size / 1024).toFixed(1)} KB

            </div>

          </div>

          <button
            onClick={removeFile}
            className="text-gray-400 hover:text-white"
          >

            <X size={16} />

          </button>

        </motion.div>

      )}

    </div>

  )
}