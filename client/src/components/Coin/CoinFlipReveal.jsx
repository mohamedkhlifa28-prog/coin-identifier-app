import { useState, useEffect } from 'react'

export default function CoinFlipReveal({ imageUrl, onFlipComplete, isFlipping }) {
  const [flipped, setFlipped] = useState(false)
  const [showImage, setShowImage] = useState(false)

  useEffect(() => {
    if (isFlipping) {
      setFlipped(false)
      setShowImage(false)
      const t1 = setTimeout(() => {
        setFlipped(true)
      }, 100)
      const t2 = setTimeout(() => {
        setShowImage(true)
        onFlipComplete && onFlipComplete()
      }, 900)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [isFlipping, onFlipComplete])

  return (
    <div className="coin-flip-container flex items-center justify-center">
      <div className={`coin-flip-inner w-48 h-48 relative ${flipped ? 'flipped' : ''}`}>
        {/* Gold circular frame */}
        <div className="w-48 h-48 rounded-full border-4 border-[#D4A017] bg-[#1A1A1A] overflow-hidden flex items-center justify-center shadow-2xl shadow-[#D4A017]/20">
          {showImage && imageUrl ? (
            <img
              src={imageUrl}
              alt="Identified coin"
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : showImage ? (
            <span className="text-8xl animate-fade-in">🪙</span>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#D4A017] border-t-transparent animate-spin" />
              <span className="text-[#D4A017] text-xs font-body">Analyzing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
