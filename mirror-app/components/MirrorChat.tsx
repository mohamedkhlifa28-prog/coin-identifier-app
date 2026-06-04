'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
  KeyboardEvent,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AccuracyBadge } from './AccuracyBadge'
import { StreakCounter } from './StreakCounter'
import { MirrorAge } from './MirrorAge'
import { PlanBadge } from './PlanBadge'
import { UpgradeModal } from './UpgradeModal'
import type { User, VoiceProfile, Plan } from '@/types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MirrorChatProps {
  user: User
  voiceProfile: VoiceProfile
}

const NAV_LINKS = [
  { label: 'Chat', href: '/chat', icon: '◈' },
  { label: 'Memory Vault', href: '/vault', icon: '◉' },
  { label: 'Generate', href: '/generate', icon: '✦' },
  { label: 'Settings', href: '/settings', icon: '⊙' },
]

export function MirrorChat({ user, voiceProfile }: MirrorChatProps) {
  const router = useRouter()
  const sessionId = useRef(crypto.randomUUID())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [accuracy, setAccuracy] = useState(voiceProfile.accuracy_score ?? 40)
  const [error, setError] = useState<string | null>(null)
  const [upgradeModal, setUpgradeModal] = useState<string | false>(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const plan = user.plan as Plan

  const inactiveDays = user.last_active
    ? Math.floor((Date.now() - new Date(user.last_active).getTime()) / 86_400_000)
    : 0

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runBackgroundJobs = useCallback(
    async (userMsg: string, assistantMsg: string) => {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }))

      try {
        const res = await fetch('/api/memories/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userMessage: userMsg,
            assistantMessage: assistantMsg,
            sessionId: sessionId.current,
            conversationHistory: history,
          }),
        })

        if (res.ok) {
          // Refresh accuracy score from updated profile
          const { data } = await supabase
            .from('voice_profiles')
            .select('accuracy_score')
            .eq('user_id', user.id)
            .single()
          if (data) setAccuracy(data.accuracy_score ?? accuracy)
        }
      } catch {
        // Background job — swallow errors silently
      }
    },
    [messages, user.id, accuracy]
  )

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    setError(null)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setStreaming(true)
    setStreamingContent('')

    const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          sessionId: sessionId.current,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429 || data.error === 'LIMIT_EXCEEDED') {
          setUpgradeModal("You've hit your 10 message/day limit on the free plan.")
        } else {
          setError(data.message ?? data.error ?? 'Something went wrong.')
        }
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        return
      }

      // Stream the response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
        setStreamingContent(fullContent)
      }

      // Commit streamed message to messages array
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStreamingContent('')

      // Background jobs (non-blocking)
      runBackgroundJobs(text, fullContent)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection error.'
      setError(msg)
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="h-screen flex bg-[#0a0a0a] overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 lg:z-auto h-full w-64 bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-[#1f1f1f]">
          <h1 className="text-lg font-light tracking-wider text-[#f0f0f0]">Mirror</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#888888] truncate max-w-[120px]">
              {user.name ?? user.email}
            </span>
            <PlanBadge plan={plan} />
          </div>
        </div>

        {/* Mirror stats */}
        <div className="px-5 py-4 space-y-3 border-b border-[#1f1f1f]">
          <AccuracyBadge score={accuracy} size="sm" />
          <StreakCounter days={user.streak_days ?? 0} />
          <MirrorAge ageDays={user.mirror_age_days ?? 0} />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#888888]" />
            <span className="text-xs text-[#888888]">
              <span className="text-[#f0f0f0]">{voiceProfile.total_sessions}</span> sessions
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/chat'
            const isLocked =
              link.href === '/generate' && plan === 'free'
            return (
              <Link
                key={link.href}
                href={isLocked ? '#' : link.href}
                onClick={
                  isLocked
                    ? (e) => {
                        e.preventDefault()
                        setUpgradeModal('Content Generator is a Pro feature.')
                      }
                    : undefined
                }
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#a78bfa]/10 text-[#a78bfa]'
                    : 'text-[#888888] hover:text-[#f0f0f0] hover:bg-[#1f1f1f]'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
                {isLocked && (
                  <span className="ml-auto text-[10px] text-[#555] uppercase tracking-wide">
                    Pro
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Upgrade CTA for free users */}
        {plan === 'free' && (
          <div className="mx-3 mb-3 p-3 bg-[#a78bfa]/5 border border-[#a78bfa]/20 rounded-xl">
            <p className="text-xs text-[#888888] mb-2">
              Free plan · {10} msg/day
            </p>
            <Link
              href="/pricing"
              className="block text-center text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
            >
              Upgrade for unlimited →
            </Link>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="mx-3 mb-4 px-3 py-2 text-xs text-[#555] hover:text-[#888] transition-colors text-left rounded-lg hover:bg-[#1f1f1f]"
        >
          Sign out
        </button>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Inactivity banner */}
        {inactiveDays >= 1 && (
          <div className="bg-[#a78bfa]/10 border-b border-[#a78bfa]/20 px-4 py-2 text-center text-xs text-[#a78bfa]">
            Your Mirror hasn&apos;t heard from you in {inactiveDays} day{inactiveDays !== 1 ? 's' : ''}. Welcome back.
          </div>
        )}

        {/* Header */}
        <header className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className="lg:hidden text-[#888888] hover:text-[#f0f0f0] transition-colors p-1"
            >
              ☰
            </button>
            <span className="text-sm text-[#888888]">
              Talking to your Mirror
            </span>
          </div>
          <AccuracyBadge score={accuracy} size="sm" showLabel={false} />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
              <div className="text-3xl mb-4 opacity-20">◈</div>
              <p className="text-[#888888] font-light text-sm max-w-xs">
                Your Mirror is ready. Say anything — it&apos;ll respond as you.
              </p>
              {messages.length === 0 && (
                <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-md">
                  {[
                    "What do I actually think about my job?",
                    "How would I handle a conflict with a friend?",
                    "What's my opinion on social media?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInput(prompt)
                        inputRef.current?.focus()
                      }}
                      className="text-xs text-[#555] hover:text-[#888] border border-[#1f1f1f] hover:border-[#333] rounded-full px-3 py-1.5 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} userName={user.name ?? 'You'} />
          ))}

          {streaming && (
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent,
                timestamp: new Date(),
              }}
              userName={user.name ?? 'You'}
              isStreaming
            />
          )}

          {error && (
            <div className="flex justify-center">
              <div className="text-xs text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 rounded-xl px-4 py-2.5 max-w-sm text-center">
                {error}
                <button onClick={() => setError(null)} className="ml-2 opacity-60">✕</button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#1f1f1f] p-4">
          <form
            onSubmit={(e: FormEvent) => { e.preventDefault(); sendMessage() }}
            className="flex items-end gap-3 max-w-3xl mx-auto"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Say something…"
              rows={1}
              disabled={streaming}
              className="flex-1 bg-[#111111] border border-[#1f1f1f] focus:border-[#a78bfa]/50 rounded-2xl px-4 py-3 text-[#f0f0f0] placeholder-[#444] text-sm resize-none outline-none transition-colors disabled:opacity-50 leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '160px' }}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#a78bfa] hover:bg-[#9370f5] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              {streaming ? (
                <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="text-white text-sm">↑</span>
              )}
            </button>
          </form>
          <p className="text-center text-[#333] text-xs mt-2">
            Shift+Enter for new line · Enter to send
          </p>
        </div>
      </div>

      {upgradeModal && (
        <UpgradeModal reason={typeof upgradeModal === 'string' ? upgradeModal : undefined} onClose={() => setUpgradeModal(false)} />
      )}
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  userName,
  isStreaming = false,
}: {
  message: ChatMessage
  userName: string
  isStreaming?: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-bubble`}>
      <div className={`max-w-[75%] ${isUser ? 'order-1' : 'order-2'}`}>
        <p className={`text-[10px] uppercase tracking-widest mb-1.5 ${isUser ? 'text-right text-[#555]' : 'text-[#a78bfa]/70'}`}>
          {isUser ? 'You' : `Mirror (${userName})`}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-[#1f1f1f] text-[#f0f0f0] rounded-tr-sm'
              : 'bg-[#111111] border border-[#1f1f1f] text-[#f0f0f0] rounded-tl-sm'
          }`}
        >
          {message.content}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-[#a78bfa] animate-pulse-accent ml-0.5 align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}
