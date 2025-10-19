import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "DocsIntel AI – Document Intelligence Powered by RAG",
  description:
    "DocsIntel AI turns documents into actionable insights using Retrieval-Augmented Generation. Upload, chat, and extract precise answers instantly.",
  metadataBase: new URL("https://www.docsintel.ai"),
  applicationName: "DocsIntel AI",
  generator: "Next.js",
  keywords: [
    "DocsIntel",
    "RAG",
    "AI Document Analysis",
    "Semantic Search",
    "PDF Q&A",
    "LLM PDF Chatbot",
    "Document Intelligence",
  ],
  authors: [{ name: "DocsIntel Team", url: "https://www.docsintel.ai" }],
  creator: "DocsIntel",
  icons: {
    icon: "/favicon.png", // Place favicon.ico in /public
    shortcut: "/favicon.png",
  },
  themeColor: "#0ea5e9",
  category: "AI Document Search",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
