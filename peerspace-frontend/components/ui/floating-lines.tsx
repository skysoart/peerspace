"use client"

import { useEffect, useRef } from "react"

export default function FloatingLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let lines: Line[] = []

    class Line {
      x: number
      y: number
      length: number
      speed: number
      opacity: number
      thickness: number

      constructor() {
        this.x = Math.random() * canvas!.width
        this.y = Math.random() * canvas!.height
        this.length = Math.random() * 150 + 50
        this.speed = Math.random() * 0.5 + 0.1
        this.opacity = Math.random() * 0.15 + 0.02
        this.thickness = Math.random() * 1.5 + 0.5
      }

      update() {
        // Move diagonally
        this.x += this.speed
        this.y -= this.speed

        // Reset if out of bounds
        if (this.x > canvas!.width || this.y < -this.length) {
          this.x = Math.random() * canvas!.width * 0.5 - 100
          this.y = canvas!.height + this.length
        }
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.x + this.length, this.y - this.length)
        ctx.strokeStyle = `rgba(167, 139, 250, ${this.opacity})` // subtle purple glow
        ctx.lineWidth = this.thickness
        ctx.stroke()
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      lines = Array.from({ length: 40 }, () => new Line())
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      lines.forEach((line) => {
        line.update()
        line.draw()
      })
      animationFrameId = requestAnimationFrame(render)
    }

    window.addEventListener("resize", resize)
    resize()
    render()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1]"
      style={{ opacity: 0.7 }}
    />
  )
}
