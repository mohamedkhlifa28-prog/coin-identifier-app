import { useState, useEffect } from 'react'
import { LogOut, Crown, Bell, X, Flame, MessageCircle, CircleDollarSign, Shield, FileText, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import apiClient, { userAPI, subscribeAPI, leaderboardAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, getInitials, calculateProgress } from '../../utils/helpers'
import { isNative, purchaseTier, restorePurchases } from '../../services/purchases'

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
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [badges, setBadges] = useState([])
  const [earnedBadgeIds, setEarnedBadgeIds] = useState([])
  const [subStatus, setSubStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    // Handle Stripe return
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
      subscribeAPI.getStatus().then((res) => {
        setSubStatus(res.data)
        updateUser({ subscription_tier: res.data.tier })
      }).catch(() => {})
    }
  }, [updateUser])

  useEffect(() => {
    userAPI.getNotifications()
      .then((res) => {
        setNotifications(res.data.notifications || [])
        setUnreadNotifs(res.data.unread || 0)
      }).catch(() => {})

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
      if (isNative()) {
        const customerInfo = await purchaseTier(tier)
        const active = customerInfo?.entitlements?.active || {}
        const activeTier = 'expert' in active ? 'expert' : 'pro' in active ? 'pro' : tier
        updateUser({ subscription_tier: activeTier })
        setSubStatus({ tier: activeTier })
      } else {
        const res = await subscribeAPI.subscribe(tier, {
          successUrl: `${window.location.origin}/profile?subscribed=true`,
          cancelUrl: `${window.location.origin}/profile`,
        })
        if (res.data.url) {
          window.location.href = res.data.url
        } else if (res.data.success) {
          updateUser({ subscription_tier: tier })
          setSubStatus({ tier })
        }
      }
    } catch (err) {
      if (err?.code !== 'PURCHASE_CANCELLED') {
        alert(err?.message || err?.response?.data?.error || 'Failed to start subscription')
      }
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleRestorePurchases = async () => {
    setIsRestoring(true)
    try {
      const customerInfo = await restorePurchases()
      if (customerInfo) {
        const active = customerInfo?.entitlements?.active || {}
        const activeTier = 'expert' in active ? 'expert' : 'pro' in active ? 'pro' : 'free'
        updateUser({ subscription_tier: activeTier })
        setSubStatus({ tier: activeTier })
        alert(activeTier !== 'free' ? `${activeTier.charAt(0).toUpperCase() + activeTier.slice(1)} subscription restored!` : 'No active subscriptions found.')
      }
    } catch {
      alert('Failed to restore purchases')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await apiClient.delete('/user/account')
      logout()
    } catch {
      alert('Failed to delete account. Please try again.')
      setIsDeleting(false)
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/messages')}
            className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
            aria-label="Messages"
          >
            <MessageCircle size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
          >
            <Bell size={16} className="text-gray-400" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
          >
            <LogOut size={16} className="text-gray-400" />
          </button>
        </div>
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
          { key: 'settings', label: 'Settings' },
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
                  <button
                    onClick={() => navigate('/crh')}
                    className="mt-3 flex items-center gap-2 w-full bg-[#2A2A2A] rounded-xl px-3 py-2.5 text-left active:opacity-80"
                  >
                    <CircleDollarSign size={14} className="text-[#D4A017]" />
                    <span className="text-white text-xs font-body font-semibold">CRH Tracker</span>
                    <span className="ml-auto text-gray-500 text-xs font-body">→</span>
                  </button>
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

            {/* Restore Purchases (native only) */}
            {isNative() && (
              <button
                onClick={handleRestorePurchases}
                disabled={isRestoring}
                className="w-full text-center text-[#D4A017] text-sm font-body py-2 disabled:opacity-60"
              >
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </button>
            )}
          </div>
        )}

        {/* Leaderboard tab */}
        {activeTab === 'leaderboard' && <LeaderboardTab currentUserId={user?.id} />}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/privacy')}
              className="w-full flex items-center gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 active:opacity-80"
            >
              <Shield size={16} className="text-[#D4A017]" />
              <span className="text-white text-sm font-body font-medium flex-1 text-left">Privacy Policy</span>
              <span className="text-gray-600 text-sm">→</span>
            </button>

            <button
              onClick={() => navigate('/terms')}
              className="w-full flex items-center gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 active:opacity-80"
            >
              <FileText size={16} className="text-[#D4A017]" />
              <span className="text-white text-sm font-body font-medium flex-1 text-left">Terms of Service</span>
              <span className="text-gray-600 text-sm">→</span>
            </button>

            <div className="pt-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 active:opacity-80"
                >
                  <Trash2 size={16} className="text-red-400" />
                  <span className="text-red-400 text-sm font-body font-medium">Delete Account</span>
                </button>
              ) : (
                <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-4">
                  <p className="text-white font-body font-semibold text-sm mb-1">Delete your account?</p>
                  <p className="text-gray-400 text-xs font-body mb-4 leading-relaxed">
                    This will permanently delete your account, collection, scan history, and all data. This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[#2A2A2A] text-white text-sm font-body"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-bold font-body disabled:opacity-60"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications sheet */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-t-2xl w-full max-w-[430px] mx-auto flex flex-col" style={{ maxHeight: '70vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
              <h3 className="text-white font-display font-bold text-base">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadNotifs > 0 && (
                  <button
                    onClick={() => {
                      apiClient.put('/user/notifications/read-all').catch(() => {})
                      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                      setUnreadNotifs(0)
                    }}
                    className="text-[#D4A017] text-xs font-body"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none divide-y divide-[#2A2A2A]">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-sm font-body text-center py-10">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${!n.read ? 'bg-[#D4A017]/5' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-[#D4A017]' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-body font-semibold">{n.title}</p>
                      <p className="text-gray-400 text-xs font-body leading-snug mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
