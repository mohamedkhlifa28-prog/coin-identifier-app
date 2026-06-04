'use client'

import { useState } from 'react'
import { formatRelativeDate } from '@/lib/utils'
import type { Memory } from '@/types'

interface MemoryCardProps {
  memory: Memory
  onPin: (id: string, pinned: boolean) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function MemoryCard({ memory, onPin, onDelete }: MemoryCardProps) {
  const [pinning, setPinning] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handlePin() {
    setPinning(true)
    await onPin(memory.id, !memory.pinned)
    setPinning(false)
  }

  async function handleDelete() {
    if (!confirm('Remove this memory from your Mirror?')) return
    setDeleting(true)
    await onDelete(memory.id)
    setDeleting(false)
  }

  return (
    <div
      className={`bg-[#111111] border rounded-xl p-5 transition-all ${
        memory.pinned ? 'border-[#a78bfa]/40' : 'border-[#1f1f1f]'
      } ${deleting ? 'opacity-0 scale-95' : 'opacity-100'}`}
    >
      <blockquote className="text-[#f0f0f0] font-light leading-relaxed text-sm mb-4 line-clamp-4">
        &ldquo;{memory.quote}&rdquo;
      </blockquote>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#888888]">
            {formatRelativeDate(memory.created_at)}
            {memory.context && (
              <span className="ml-1">· {memory.context}</span>
            )}
          </p>
          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {memory.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#888888]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4 shrink-0">
          <button
            onClick={handlePin}
            disabled={pinning}
            title={memory.pinned ? 'Unpin' : 'Pin'}
            className={`text-xs p-1.5 rounded-lg transition-colors ${
              memory.pinned
                ? 'text-[#a78bfa] bg-[#a78bfa]/10'
                : 'text-[#888888] hover:text-[#f0f0f0] hover:bg-[#1f1f1f]'
            }`}
          >
            ★
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete memory"
            className="text-xs p-1.5 rounded-lg text-[#888888] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
