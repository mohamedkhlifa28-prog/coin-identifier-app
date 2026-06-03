function SkeletonBase({ className = '' }) {
  return (
    <div className={`bg-[#2A2A2A] rounded-lg overflow-hidden animate-pulse ${className}`}>
      <div className="bg-[#3A3A3A] w-full h-full" />
    </div>
  )
}

function CoinCardSkeleton() {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#2A2A2A]" />
      <div className="p-2 space-y-1.5">
        <div className="h-3 bg-[#3A3A3A] rounded w-3/4" />
        <div className="h-3 bg-[#3A3A3A] rounded w-1/2" />
        <div className="h-4 bg-[#3A3A3A] rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}

function ListItemSkeleton() {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex gap-3 animate-pulse">
      <div className="w-14 h-14 bg-[#2A2A2A] rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#3A3A3A] rounded w-3/4" />
        <div className="h-3 bg-[#3A3A3A] rounded w-1/2" />
        <div className="h-3 bg-[#3A3A3A] rounded w-1/4" />
      </div>
    </div>
  )
}

function PostSkeleton() {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 bg-[#2A2A2A] rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#3A3A3A] rounded w-1/3" />
          <div className="h-3 bg-[#3A3A3A] rounded w-1/4" />
        </div>
      </div>
      {/* Image */}
      <div className="w-full aspect-[4/3] bg-[#2A2A2A]" />
      {/* Actions */}
      <div className="p-4 space-y-2">
        <div className="h-3 bg-[#3A3A3A] rounded w-full" />
        <div className="h-3 bg-[#3A3A3A] rounded w-2/3" />
        <div className="flex gap-4 mt-3">
          <div className="h-4 bg-[#3A3A3A] rounded w-12" />
          <div className="h-4 bg-[#3A3A3A] rounded w-12" />
        </div>
      </div>
    </div>
  )
}

export default function SkeletonCard({ variant = 'coin-card', count = 1 }) {
  const Component =
    variant === 'list-item'
      ? ListItemSkeleton
      : variant === 'post'
      ? PostSkeleton
      : CoinCardSkeleton

  if (count === 1) return <Component />

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Component key={i} />
      ))}
    </>
  )
}
