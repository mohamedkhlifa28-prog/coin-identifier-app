import { useEffect } from 'react'

export default function XPPopup({ amount, reason, onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete && onComplete()
    }, 2000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-xp-pop flex flex-col items-center">
        <div className="bg-[#1A1A1A] border border-[#D4A017] rounded-2xl px-5 py-3 shadow-lg shadow-yellow-900/40">
          <p className="text-[#D4A017] text-2xl font-bold font-display text-center">
            +{amount} XP
          </p>
          {reason && (
            <p className="text-gray-300 text-xs text-center mt-0.5 font-body">{reason}</p>
          )}
        </div>
      </div>
    </div>
  )
}
