import { formatDate } from '@/lib/utils'

interface MemorySnippet {
  id: string
  quote: string
  context: string | null
  created_at: string
}

interface ContradictionCardProps {
  id: string
  explanation: string
  detected_at: string
  memory_1: MemorySnippet
  memory_2: MemorySnippet
}

export function ContradictionCard({
  explanation,
  detected_at,
  memory_1,
  memory_2,
}: ContradictionCardProps) {
  return (
    <div className="bg-[#111111] border border-[#f87171]/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#f87171] text-xs">⚡</span>
        <span className="text-[10px] uppercase tracking-widest text-[#f87171]/70">
          Contradiction · {formatDate(detected_at)}
        </span>
      </div>

      <div className="space-y-3">
        <Side memory={memory_1} />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#1f1f1f]" />
          <span className="text-[10px] text-[#555] uppercase tracking-wider">vs</span>
          <div className="flex-1 h-px bg-[#1f1f1f]" />
        </div>
        <Side memory={memory_2} />
      </div>

      <p className="text-xs text-[#888888] border-t border-[#1f1f1f] pt-3 leading-relaxed">
        {explanation}
      </p>
    </div>
  )
}

function Side({ memory }: { memory: MemorySnippet }) {
  return (
    <div className="bg-[#0a0a0a] rounded-lg p-3">
      <p className="text-xs text-[#888888] mb-1.5">{formatDate(memory.created_at)}</p>
      <blockquote className="text-sm text-[#f0f0f0] font-light leading-relaxed">
        &ldquo;{memory.quote}&rdquo;
      </blockquote>
      {memory.context && (
        <p className="text-[11px] text-[#555] mt-1.5">↳ {memory.context}</p>
      )}
    </div>
  )
}
