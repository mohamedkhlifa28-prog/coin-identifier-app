import { useState, useEffect } from 'react'
import { LogOut, Crown, Trophy, Flame, Star, Award, ChevronRight, Settings } from 'lucide-react'
import { userAPI, subscribeAPI, leaderboardAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, getInitials, calculateProgress } from '../../utils/helpers'

const BADGE_ICONS = {
  'First Step': '👣',
  'First Scan': '📷',
  'Silver Hunter': '🥈',
  'Error Spotter': '🔍',
  'Top Seller': '💰',
  'Complete Lincoln Set': '🎯',
  'Streak Master': '🔥',
  'Community Star': '⭐',
}

const TIER_COLORS = {
  free: 'text-gray-400',
  pro: 'text-[#D4A017]',
  expert: 'text-purple-400',
}

const TIER_LABELS = { free: 'Free', pro: 'Pro', expert: 'Expert' }

function BadgeGrid({ badges, earnedIds }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {badges.map((badge) => {
        const earned = earnedIds.includes(badge.id)
        return (
          <div key={badge.id} className="flex flex-col items-center">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl border transition-colors ${
              earned
                ? 'bg-[#D4A017]/15 border-[#D4A017]/40'
                : 'bg-[#1A1A1A] border-[#2A2A2A] opacity-40'
            }`}>
              {BADGE_ICONS[badge.name] || '🏅'}
            </div>
            <p className={`text-center text-xs font-body mt-1.5 leading-tight ${earned ? 'text-gray-300' : 'text-gray-600'}`}>
              {badge.name}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function LeaderboardTab({ currentUserId }) {
  const [leaders, setLeaders] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    leaderboardAPI.getLeaderboard()
      .then((res) => setLeaders(res.data.leaderboard || res.data.users || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="py-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-[#D4A017] border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-2">
      {leaders.map((u, idx) => (
        <div
          key={u.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
            u.id === currentUserId
              ? 'bg-[#D4A017]/10 border border-[#D4A017]/30'
              : 'bg-[#1A1A1A] border border-[#2A2A2A]'
          }`}
        >
          <span className={`text-sm font-body font-bold w-6 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#D4A017]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#D4A017] text-xs font-bold font-body">{getInitials(u.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-body font-semibold truncate ${u.id === currentUserId ? 'text-[#D4A017]' : 'text-white'}`}>{u.name}</p>
            <p className="text-gray-500 text-xs font-body">{u.level}</p>
          </div>
          <span className="text-[#D4A017] text-sm font-body font-bold">{(u.xp || 0).toLocaleString()} XP</span>
        </div>
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()

  const [stats, setStats] = useState(null)
  const [badges, setBadges] = useState([])
  const [earnedBadgeIds, setEarnedBadgeIds] = useState([])
  const [subStatus, setSubStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    userAPI.getStats()
      .then((res) => setStats(res.data.stats || res.data))
      .catch(() => {})

    userAPI.getBadges()
      .then((res) => {
        const earned = res.data.earned || []
        const available = res.data.available || []
        setBadges([...earned, ...available])
        setEarnedBadgeIds(earned.map((b) => b.id))
      })
      .catch(() => {})

    subscribeAPI.getStatus()
      .then((res) => setSubStatus(res.data))
      .catch(() => {})
  }, [])

  const handleUpgrade = async (tier) => {
    setIsUpgrading(true)
    try {
      const res = await subscribeAPI.subscribe(tier)
      if (res.data.url) {
        window.location.href = res.data.url
      } else if (res.data.success) {
        updateUser({ subscription_tier: tier })
        setSubStatus({ tier })
        alert('Subscription activated!')
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to start subscription')
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await subscribeAPI.cancel()
      updateUser({ subscription_tier: 'free' })
      setSubStatus({ tier: 'free' })
      setShowCancelConfirm(false)
    } catch (err) {
      alert('Failed to cancel subscription')
    } finally {
      setIsCancelling(false)
    }
  }

  const tier = subStatus?.tier || user?.subscription_tier || 'free'
  const xp = user?.xp || 0
  const progress = calculateProgress(xp)

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-24 overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-[#2A2A2A] px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold font-display text-white">Profile</h1>
        <button
          onClick={logout}
          className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
        >
          <LogOut size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Profile hero */}
      <div className="flex flex-col items-center py-8 px-4">
        <div className="w-20 h-20 rounded-full bg-[#D4A017]/20 border-2 border-[#D4A017]/40 flex items-center justify-center">
          <span className="text-[#D4A017] font-bold text-2xl font-body">{getInitials(user?.name || 'U')}</span>
        </div>
        <h2 className="text-xl font-bold font-display text-white mt-3">{user?.name}</h2>
        <p className="text-gray-500 text-sm font-body">{user?.email}</p>

        {/* Level + subscription */}
        <div className="flex items-center gap-2 mt-2">
          <span className="bg-[#D4A017]/20 text-[#D4A017] text-xs font-body font-semibold px-3 py-1 rounded-full">
            {user?.level || 'Novice'}
          </span>
          {tier !== 'free' && (
            <span className={`text-xs font-body font-semibold px-3 py-1 rounded-full ${tier === 'expert' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#D4A017]/20 text-[#D4A017]'}`}>
              <Crown size={10} className="inline mr-1" />
              {TIER_LABELS[tier]}
            </span>
          )}
        </div>

        {/* XP progress bar */}
        <div className="w-full max-w-xs mt-4">
          <div className="flex justify-between text-xs text-gray-500 font-body mb-1.5">
            <span>{xp.toLocaleString()} XP</span>
            <span>{progress.nextLevel} → {progress.xpNeeded.toLocaleString()} XP to go</span>
          </div>
          <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D4A017] rounded-full transition-all duration-1000"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-6">
        {[
          { label: 'Coins', value: stats?.totalCoins || 0 },
          { label: 'Scans', value: stats?.totalScans || user?.scan_count_month || 0 },
          { label: 'Posts', value: stats?.totalPosts || 0 },
          { label: 'Streak', value: (user?.streak || 0), icon: <Flame size={12} className="text-orange-400 inline" /> },
        ].map((s) => (
          <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-center">
            <p className="text-white font-body font-bold text-lg">{s.value}{s.icon}</p>
            <p className="text-gray-500 text-xs font-body mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2A2A] px-2 mb-4">
        {[
          { key: 'profile', label: 'Badges' },
          { key: 'subscription', label: 'Plan' },
          { key: 'leaderboard', label: 'Leaderboard' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-body font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#D4A017] border-b-2 border-[#D4A017]'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {/* Badges tab */}
        {activeTab === 'profile' && (
          <BadgeGrid badges={badges} earnedIds={earnedBadgeIds} />
        )}

        {/* Subscription tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-4">
            {/* Current plan */}
            <div className={`p-4 rounded-2xl border ${tier === 'free' ? 'bg-[#1A1A1A] border-[#2A2A2A]' : 'bg-[#D4A017]/10 border-[#D4A017]/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-body font-semibold">Current Plan</span>
                <span className={`font-bold text-sm font-body ${TIER_COLORS[tier]}`}>{TIER_LABELS[tier]}</span>
              </div>
              {tier === 'free' && (
                <p className="text-gray-500 text-xs font-body">{10 - (user?.scan_count_month || 0)} scans remaining this month</p>
              )}
              {tier !== 'free' && (
                <>
                  <p className="text-gray-400 text-xs font-body">Unlimited scans · AI Grading · Error Detection</p>
                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="mt-3 text-red-400 text-xs font-body"
                    >
                      Cancel subscription
                    </button>
                  ) : (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded-xl">
                      <p className="text-white text-xs font-body mb-2">Cancel your {TIER_LABELS[tier]} subscription?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2 rounded-lg bg-[#2A2A2A] text-white text-xs font-body">Keep</button>
                        <button onClick={handleCancel} disabled={isCancelling} className="flex-1 py-2 rounded-lg bg-red-700 text-white text-xs font-bold font-body">{isCancelling ? 'Cancelling...' : 'Cancel'}</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pro plan card */}
            {tier === 'free' && (
              <div className="bg-[#1A1A1A] border border-[#D4A017]/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-bold font-display text-lg">Pro</p>
                    <p className="text-[#D4A017] text-2xl font-bold font-display mt-0.5">$3.99<span className="text-sm text-gray-500">/mo</span></p>
                  </div>
                  <div className="bg-[#D4A017]/20 px-3 py-1 rounded-full">
                    <p className="text-[#D4A017] text-xs font-body font-semibold">7 days free</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  {['Unlimited scans', 'AI Grading Assistant', 'Error Coin Detection', 'CRH Tools', 'Unlimited collection'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm font-body text-gray-300">
                      <span className="text-green-400">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={isUpgrading}
                  className="w-full bg-[#D4A017] text-black font-bold py-3.5 rounded-xl font-body disabled:opacity-60"
                >
                  {isUpgrading ? 'Starting...' : 'Start Free Trial'}
                </button>
              </div>
            )}

            {/* Expert plan card */}
            {tier !== 'expert' && (
              <div className="bg-[#1A1A1A] border border-purple-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-bold font-display text-lg">Expert</p>
                    <p className="text-purple-400 text-2xl font-bold font-display mt-0.5">$9.99<span className="text-sm text-gray-500">/mo</span></p>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  {['Everything in Pro', 'Auction history data', 'Bulk coin scanning', 'Expert Q&A requests', 'Priority support'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm font-body text-gray-300">
                      <span className="text-purple-400">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade('expert')}
                  disabled={isUpgrading}
                  className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl font-body disabled:opacity-60"
                >
                  {isUpgrading ? 'Starting...' : 'Upgrade to Expert'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard tab */}
        {activeTab === 'leaderboard' && <LeaderboardTab currentUserId={user?.id} />}
      </div>
    </div>
  )
}
