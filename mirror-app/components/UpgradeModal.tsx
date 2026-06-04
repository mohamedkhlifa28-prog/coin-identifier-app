'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface UpgradeModalProps {
  onClose: () => void
  reason?: string
}

export function UpgradeModal({ onClose, reason }: UpgradeModalProps) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111111] border border-[#1f1f1f] rounded-2xl p-8 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-3xl mb-4">✦</div>
          <h2 className="text-xl font-light text-[#f0f0f0] mb-2">Upgrade your Mirror</h2>
          {reason && (
            <p className="text-sm text-[#888888]">{reason}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-[#0a0a0a] border border-[#a78bfa]/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-[#a78bfa]">Pro</span>
              <span className="text-[#f0f0f0] font-light">$9.99/mo</span>
            </div>
            <ul className="text-xs text-[#888888] space-y-1">
              <li>✓ Unlimited messages</li>
              <li>✓ Full Memory Vault</li>
              <li>✓ Content Generator</li>
              <li>✓ Share your Mirror</li>
            </ul>
          </div>

          <div className="bg-[#0a0a0a] border border-[#fbbf24]/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-[#fbbf24]">Platinum</span>
              <span className="text-[#f0f0f0] font-light">$24.99/mo</span>
            </div>
            <ul className="text-xs text-[#888888] space-y-1">
              <li>✓ Everything in Pro</li>
              <li>✓ Voice cloning</li>
              <li>✓ Memory export</li>
              <li>✓ Mirror API access</li>
            </ul>
          </div>
        </div>

        <Link
          href="/pricing"
          className="block w-full text-center bg-[#a78bfa] hover:bg-[#9370f5] text-white font-medium rounded-lg px-4 py-3 text-sm transition-colors"
          onClick={onClose}
        >
          See all plans
        </Link>

        <button
          onClick={onClose}
          className="w-full mt-3 text-center text-xs text-[#888888] hover:text-[#f0f0f0] transition-colors py-2"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
