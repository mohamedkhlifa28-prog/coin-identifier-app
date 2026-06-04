'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MemoryCard } from './MemoryCard'
import { ContradictionCard } from './ContradictionCard'
import type { Memory, Plan } from '@/types'

type Tab = 'all' | 'quoted' | 'contradictions' | 'pinned'
type DateFilter = 'month' | '3months' | 'all'

interface MemorySnippet {
  id: string
  quote: string
  context: string | null
  created_at: string
}

interface Contradiction {
  id: string
  explanation: string
  detected_at: string
  memory_1: MemorySnippet
  memory_2: MemorySnippet
}

interface VaultClientProps {
  initialMemories: Memory[]
  plan: Plan
  totalCount: number
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Memories' },
  { key: 'quoted', label: 'Most Quoted' },
  { key: 'contradictions', label: 'Contradictions' },
  { key: 'pinned', label: 'Pinned' },
]

export function VaultClient({ initialMemories, plan, totalCount }: VaultClientProps) {
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [memories, setMemories] = useState<Memory[]>(initialMemories)
  const [contradictions, setContradictions] = useState<Contradiction[]>([])
  const [contradictionsLoaded, setContradictionsLoaded] = useState(false)
  const [contradictionsLoading, setContradictionsLoading] = useState(false)

  const isProOrPlat = plan === 'pro' || plan === 'platinum'

  // Extract all unique tags from memories
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    memories.forEach((m) => m.tags?.forEach((t) => tagSet.add(t)))
    return [...tagSet].sort()
  }, [memories])

  // Load contradictions when tab is clicked
  useEffect(() => {
    if (tab !== 'contradictions' || contradictionsLoaded || !isProOrPlat) return
    setContradictionsLoading(true)
    fetch('/api/contradictions')
      .then((r) => r.json())
      .then((d) => {
        setContradictions(d.contradictions ?? [])
        setContradictionsLoaded(true)
      })
      .catch(() => {})
      .finally(() => setContradictionsLoading(false))
  }, [tab, contradictionsLoaded, isProOrPlat])

  // Apply date filter
  const cutoffDate = useMemo(() => {
    if (dateFilter === 'month') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return d
    }
    if (dateFilter === '3months') {
      const d = new Date()
      d.setDate(d.getDate() - 90)
      return d
    }
    return null
  }, [dateFilter])

  // Filter + sort memories for active tab
  const displayed = useMemo(() => {
    let list = [...memories]

    if (tab === 'pinned') list = list.filter((m) => m.pinned)
    if (tab === 'quoted') list = list.sort((a, b) => b.weight - a.weight).slice(0, 20)

    if (selectedTag) list = list.filter((m) => m.tags?.includes(selectedTag))
    if (cutoffDate) list = list.filter((m) => new Date(m.created_at) >= cutoffDate)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.quote.toLowerCase().includes(q) ||
          m.context?.toLowerCase().includes(q) ||
          m.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }

    return list
  }, [memories, tab, selectedTag, cutoffDate, search])

  async function handlePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/memories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    if (res.ok) {
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, pinned, weight: pinned ? 10 : 5 } : m))
      )
    }
    return res.ok
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id))
    }
    return res.ok
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/chat" className="text-[#555] hover:text-[#888] text-sm transition-colors">
            ← Chat
          </Link>
          <h1 className="text-lg font-light text-[#f0f0f0]">Memory Vault</h1>
          <span className="text-xs text-[#555]">{totalCount} total</span>
        </div>

        {/* Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-[#111111] border border-[#1f1f1f] rounded-xl p-1">
          {TABS.map(({ key, label }) => {
            const locked = key === 'contradictions' && !isProOrPlat
            return (
              <button
                key={key}
                onClick={() => {
                  if (locked) return
                  setTab(key)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  tab === key
                    ? 'bg-[#1f1f1f] text-[#f0f0f0]'
                    : locked
                      ? 'text-[#333] cursor-not-allowed'
                      : 'text-[#888888] hover:text-[#f0f0f0]'
                }`}
              >
                {label}
                {locked && (
                  <span className="ml-1 text-[10px] text-[#555]">Pro</span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="md:hidden flex gap-1 px-4 py-3 overflow-x-auto border-b border-[#1f1f1f]">
        {TABS.map(({ key, label }) => {
          const locked = key === 'contradictions' && !isProOrPlat
          return (
            <button
              key={key}
              onClick={() => !locked && setTab(key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
                tab === key
                  ? 'bg-[#a78bfa]/20 text-[#a78bfa]'
                  : locked
                    ? 'text-[#333]'
                    : 'text-[#888888] hover:text-[#f0f0f0]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="flex h-[calc(100vh-113px)]">
        {/* Sidebar filters */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-[#1f1f1f] flex-col gap-6 p-5 overflow-y-auto">
          {/* Search */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#555] block mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Quote, tag, context…"
              className="w-full bg-[#111111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-[#f0f0f0] placeholder-[#444] focus:border-[#a78bfa]/40 outline-none transition-colors"
            />
          </div>

          {/* Date range */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#555] block mb-2">
              Date range
            </label>
            <div className="space-y-1">
              {([
                ['all', 'All time'],
                ['month', 'Last 30 days'],
                ['3months', 'Last 3 months'],
              ] as [DateFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    dateFilter === val
                      ? 'text-[#a78bfa] bg-[#a78bfa]/10'
                      : 'text-[#888888] hover:text-[#f0f0f0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#555] block mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    !selectedTag
                      ? 'border-[#a78bfa]/40 text-[#a78bfa]'
                      : 'border-[#1f1f1f] text-[#888888] hover:text-[#f0f0f0]'
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      selectedTag === tag
                        ? 'border-[#a78bfa]/40 text-[#a78bfa]'
                        : 'border-[#1f1f1f] text-[#888888] hover:text-[#f0f0f0]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5">
          {/* Free-tier paywall banner */}
          {plan === 'free' && (
            <div className="mb-5 bg-[#a78bfa]/5 border border-[#a78bfa]/20 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-xs text-[#888888]">
                Free plan shows last 30 days only.
              </p>
              <Link
                href="/pricing"
                className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
              >
                Upgrade for full history →
              </Link>
            </div>
          )}

          {/* Contradictions tab */}
          {tab === 'contradictions' && (
            <>
              {!isProOrPlat ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-3xl mb-4">⚡</div>
                  <h3 className="text-lg font-light text-[#f0f0f0] mb-2">Contradiction Detector</h3>
                  <p className="text-sm text-[#888888] max-w-sm mb-6">
                    Mirror has been listening. Upgrade to see where you&apos;ve contradicted yourself.
                  </p>
                  <Link
                    href="/pricing"
                    className="bg-[#a78bfa] hover:bg-[#9370f5] text-white text-sm font-medium rounded-full px-6 py-2.5 transition-colors"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              ) : contradictionsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-sm text-[#888888] animate-pulse-accent">Scanning for contradictions…</div>
                </div>
              ) : contradictions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-[#888888] text-sm">No contradictions detected yet.</p>
                  <p className="text-[#555] text-xs mt-1">Keep chatting — Mirror is building your pattern.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {contradictions.map((c) => (
                    <ContradictionCard key={c.id} {...c} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Memory grid for all other tabs */}
          {tab !== 'contradictions' && (
            <>
              {displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-3xl mb-4 opacity-20">◉</div>
                  <p className="text-[#888888] text-sm">
                    {tab === 'pinned'
                      ? 'No pinned memories yet. Star a memory to pin it.'
                      : search || selectedTag
                        ? 'No memories match your filters.'
                        : 'No memories yet. Start chatting to build your vault.'}
                  </p>
                </div>
              ) : (
                <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 [&>*]:break-inside-avoid [&>*]:mb-4">
                  {displayed.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      onPin={handlePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
