"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, FileSearch, Zap, Shield, TrendingUp, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Hero() {
  const router = useRouter()

  return (
    <section className="container mx-auto px-4 pt-4 pb-20 md:pt-6 md:pb-28 lg:pt-8 lg:pb-32">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent" />
          <span className="text-xl font-semibold">DocIntel</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/auth/login")}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => router.push("/auth/signup")}>
            Get Started
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-medium text-foreground">Powered by Advanced RAG Technology</span>
          </div>
        </div>

        <h1 className="mb-6 text-balance text-center text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
          Transform Documents Into{" "}
          <span className="bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent">
            Actionable Intelligence
          </span>
        </h1>

        <p className="mx-auto mb-12 max-w-3xl text-pretty text-center text-lg leading-relaxed text-muted-foreground md:text-xl">
          Harness the power of Retrieval-Augmented Generation to extract insights, answer complex questions, and unlock
          hidden value from your documents. Process thousands of pages with enterprise-grade accuracy in seconds.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="h-12 gap-2 px-8 text-base font-semibold"
            onClick={() => router.push("/auth/signup")}
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  )
}
