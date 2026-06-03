import { useEffect } from 'react'
import { X, Check, Zap, Star } from 'lucide-react'
import { subscribeAPI } from '../../api/client'

const PRO_FEATURES = [
  'Unlimited coin scans',
  'AI-powered grading',
  'Error coin detection',
  'Full market analytics',
  'Portfolio value tracking',
  'Priority support',
]

const EXPERT_FEATURES = [
  'Everything in Pro',
  'Expert community access',
  'Price alert notifications',
  'Bulk collection import',
  'API access',
  'Custom reports',
]

export default function PaywallModal({ isOpen, onClose, feature, scanCount = 0 }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const showTrial = scanCount >= 3

  const handleSubscribe = async (tier) => {
    try {
      const res = await subscribeAPI.subscribe(tier)
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl
      }
    } catch (err) {
      console.error('Subscribe error:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-[430px] bg-[#1A1A1A] border border-[#2A2A2A] rounded-t-3xl sm:rounded-3xl z-10 animate-slide-up max-h-[92vh] overflow-y-auto scrollbar-none">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="pt-8 pb-4 px-6 text-center">
          <div className="w-16 h-16 bg-[#D4A017]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star size={28} className="text-[#D4A017]" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">
            Upgrade to Pro
          </h2>
          {feature && (
            <p className="text-gray-400 text-sm font-body">
              <span className="text-[#D4A017] font-medium">{feature}</span>{' '}
              requires a Pro subscription.
            </p>
          )}
        </div>

        <div className="px-4 pb-6 space-y-3">
          {/* Pro Tier */}
          <div className="bg-[#222222] border-2 border-[#D4A017] rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-[#D4A017] text-black text-xs font-bold px-2 py-0.5 rounded-full">
              POPULAR
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-[#D4A017]" />
              <h3 className="text-white font-bold font-body text-lg">Pro</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-bold text-white">$3.99</span>
              <span className="text-gray-400 text-sm">/mo</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300 font-body">
                  <Check size={14} className="text-[#D4A017] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              className="w-full bg-[#D4A017] text-black font-bold py-3 rounded-xl font-body text-sm active:scale-[0.98] transition-transform"
            >
              {showTrial ? 'Start 7-Day Free Trial' : 'Subscribe to Pro'}
            </button>
            {showTrial && (
              <p className="text-center text-xs text-gray-500 mt-2 font-body">
                Then $3.99/mo. Cancel anytime.
              </p>
            )}
          </div>

          {/* Expert Tier */}
          <div className="bg-[#1E1A2E] border border-purple-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star size={18} className="text-purple-400" />
              <h3 className="text-white font-bold font-body text-lg">Expert</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-bold text-white">$9.99</span>
              <span className="text-gray-400 text-sm">/mo</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {EXPERT_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300 font-body">
                  <Check size={14} className="text-purple-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('expert')}
              className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 rounded-xl font-body text-sm active:scale-[0.98] transition-all"
            >
              Subscribe to Expert
            </button>
          </div>

          {/* Dismiss */}
          <button
            onClick={onClose}
            className="w-full text-center text-gray-500 text-sm py-2 font-body hover:text-gray-300 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
