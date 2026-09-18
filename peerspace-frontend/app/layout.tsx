import { ReactNode } from "react"
import ClientLayout from "./client-layout"
import FloatingLines from "@/components/ui/floating-lines"
import "./globals.css"

export const metadata = {
  title: "PEERSPACE | Next-Gen AI Moderation",
  description: "The ultimate intelligent moderation platform. Build engaged communities, automate safety, and scale your audience globally.",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased overflow-x-hidden">
        <FloatingLines />
        <div className="relative z-10 w-full">
          <ClientLayout>{children}</ClientLayout>
        </div>
      </body>
    </html>
  )
}