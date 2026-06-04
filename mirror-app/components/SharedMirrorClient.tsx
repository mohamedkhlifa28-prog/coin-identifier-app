'use client'

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react'
import Link from 'next/link'

const GUEST_LIMIT = 5

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface SharedMirrorClientProps {
  slug: string
  ownerName: string
}

export function SharedMirrorClient({ slug, ownerName }: SharedMirrorClientProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [msgCount, setMsgCount] = useState(0)
  const [showCTA, setShowCTA] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    if (msgCount >= GUEST_LIMIT) {
      setShowCTA(true)
      return
    }

    setInput('')
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)
    setStreamingContent('')

    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(`/api/mirror/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      if (!res.ok) return

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setStreamingContent(full)
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: full },
      ])
      setStreamingContent('')
      const newCount = msgCount + 1
      setMsgCount(newCount)
      if (newCount >= GUEST_LIMIT) {
        setTimeout(() => setShowCTA(true), 800)
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') sendMessage()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-light text-[#f0f0f0]">
            {ownerName}&apos;s Mirror
          </h1>
          <p className="text-xs text-[#888888]">AI alter ego · responds as them</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#555]">
            {GUEST_LIMIT - msgCount} message{GUEST_LIMIT - msgCount !== 1 ? 's' : ''} left
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: GUEST_LIMIT }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < msgCount ? 'bg-[#a78bfa]' : 'bg-[#1f1f1f]'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <p className="text-[#888888] text-sm">
              You&apos;re talking to {ownerName}&apos;s Mirror — an AI that thinks and speaks exactly like them.
            </p>
            <p className="text-[#555] text-xs mt-2">Ask it anything.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-bubble`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1f1f1f] text-[#f0f0f0] rounded-tr-sm'
                  : 'bg-[#111111] border border-[#1f1f1f] text-[#f0f0f0] rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streaming && streamingContent && (
          <div className="flex justify-start message-bubble">
            <div className="max-w-[80%] bg-[#111111] border border-[#1f1f1f] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-[#f0f0f0]">
              {streamingContent}
              <span className="inline-block w-0.5 h-4 bg-[#a78bfa] animate-pulse-accent ml-0.5 align-middle" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1f1f1f] p-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              msgCount >= GUEST_LIMIT ? 'Message limit reached' : `Message ${ownerName}'s Mirror…`
            }
            disabled={streaming || msgCount >= GUEST_LIMIT}
            className="flex-1 bg-[#111111] border border-[#1f1f1f] focus:border-[#a78bfa]/50 rounded-xl px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#444] outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim() || msgCount >= GUEST_LIMIT}
            className="w-10 h-10 flex items-center justify-center bg-[#a78bfa] hover:bg-[#9370f5] disabled:opacity-30 rounded-xl transition-colors shrink-0"
          >
            <span className="text-white text-sm">↑</span>
          </button>
        </div>
      </div>

      {/* Signup CTA overlay */}
      {showCTA && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-8 max-w-sm w-full text-center animate-fade-in-up">
            <div className="text-3xl mb-5">◈</div>
            <h2 className="text-xl font-light text-[#f0f0f0] mb-2">
              Want your own Mirror?
            </h2>
            <p className="text-sm text-[#888888] mb-6 leading-relaxed">
              {ownerName} built this over time. The longer you use Mirror, the more it becomes you.
              Start building yours — it&apos;s free.
            </p>
            <Link
              href="/signup"
              className="block w-full bg-[#a78bfa] hover:bg-[#9370f5] text-white font-medium rounded-xl py-3 text-sm transition-colors mb-3"
            >
              Start building your Mirror →
            </Link>
            <button
              onClick={() => setShowCTA(false)}
              className="text-xs text-[#555] hover:text-[#888] transition-colors"
            >
              Keep reading {ownerName}&apos;s Mirror
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
