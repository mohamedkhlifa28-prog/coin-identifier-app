'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PlanBadge } from './PlanBadge'
import { AccuracyBadge } from './AccuracyBadge'
import type { Plan } from '@/types'

interface SharedMirror { id: string; slug: string; is_active: boolean; views: number; created_at: string }
interface VoiceProfileSnippet { profile_json: unknown; accuracy_score: number }

interface SettingsClientProps {
  user: { id: string; email: string; name: string | null; plan: string }
  voiceProfile: VoiceProfileSnippet | null
  shares: SharedMirror[]
  hasVoiceClone: boolean
  plan: Plan
}

const SECTION_IDS = ['profile', 'mirror', 'voice', 'sharing', 'subscription', 'notifications', 'danger']

export function SettingsClient({ user, voiceProfile, shares: initialShares, hasVoiceClone, plan: initialPlan }: SettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState(user.name ?? '')
  const [saving, setSaving] = useState(false)
  const [shares, setShares] = useState<SharedMirror[]>(initialShares)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [voiceCloned, setVoiceCloned] = useState(hasVoiceClone)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [plan, setPlan] = useState<Plan>(initialPlan)
  const [upgradePolling, setUpgradePolling] = useState(false)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Detect post-Stripe-checkout redirect and poll until plan is updated
  useEffect(() => {
    const upgraded = searchParams.get('upgraded') as Plan | null
    if (!upgraded || upgraded === plan) return

    setUpgradePolling(true)
    showMsg(`Verifying your ${upgraded} upgrade…`)

    let attempts = 0
    const MAX = 8
    const interval = setInterval(async () => {
      attempts++
      const { data } = await supabase.from('users').select('plan').eq('id', user.id).single()
      if (data?.plan && data.plan !== 'free' && data.plan !== plan) {
        clearInterval(interval)
        setUpgradePolling(false)
        setPlan(data.plan as Plan)
        showMsg(`You're now on the ${data.plan} plan!`)
        // Clean up the URL param without a full navigation
        const url = new URL(window.location.href)
        url.searchParams.delete('upgraded')
        window.history.replaceState({}, '', url.toString())
      } else if (attempts >= MAX) {
        clearInterval(interval)
        setUpgradePolling(false)
        showMsg('Plan update pending — refresh in a moment if it doesn\'t appear.')
      }
    }, 2000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushSupported(true)
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
    )
  }, [])

  async function subscribePush() {
    if (!('serviceWorker' in navigator)) return
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { showMsg('Push not configured (no VAPID key).', 'error'); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      if (res.ok) { setPushEnabled(true); showMsg('Push notifications enabled.') }
      else showMsg('Failed to enable notifications.', 'error')
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Failed to subscribe.', 'error')
    } finally {
      setPushLoading(false)
    }
  }

  async function unsubscribePush() {
    if (!('serviceWorker' in navigator)) return
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setPushEnabled(false)
      showMsg('Push notifications disabled.')
    } catch {
      showMsg('Failed to disable notifications.', 'error')
    } finally {
      setPushLoading(false)
    }
  }

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  async function saveName(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('users').update({ name }).eq('id', user.id)
    setSaving(false)
    if (error) showMsg(error.message, 'error')
    else showMsg('Name updated.')
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const newPass = fd.get('password') as string
    if (newPass.length < 8) { showMsg('Password must be 8+ characters.', 'error'); return }
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) showMsg(error.message, 'error')
    else showMsg('Password updated.')
  }

  async function resetAccuracy() {
    if (!confirm('Reset your Mirror accuracy to 40%? This cannot be undone.')) return
    await supabase.from('voice_profiles').update({ accuracy_score: 40 }).eq('user_id', user.id)
    showMsg('Accuracy reset to 40%.')
    router.refresh()
  }

  function downloadProfile() {
    if (!voiceProfile?.profile_json) return
    const blob = new Blob([JSON.stringify(voiceProfile.profile_json, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mirror-voice-profile.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uploadVoice(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVoice(true)
    const fd = new FormData()
    fd.append('audio', file)
    const res = await fetch('/api/voice/clone', { method: 'POST', body: fd })
    setUploadingVoice(false)
    if (res.ok) { setVoiceCloned(true); showMsg('Voice cloned successfully!') }
    else { const d = await res.json(); showMsg(d.error ?? 'Voice cloning failed', 'error') }
  }

  async function createShare() {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    })
    const d = await res.json()
    if (!res.ok) { showMsg(d.message ?? d.error ?? 'Failed to create link', 'error'); return }
    setShares((prev) => [d.share, ...prev])
    showMsg('Share link created!')
  }

  async function toggleShare(id: string) {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', shareId: id }),
    })
    const d = await res.json()
    if (res.ok) setShares((prev) => prev.map((s) => (s.id === id ? d.share : s)))
  }

  async function deleteShare(id: string) {
    if (!confirm('Delete this share link?')) return
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', shareId: id }),
    })
    if (res.ok) setShares((prev) => prev.filter((s) => s.id !== id))
  }

  async function openPortal() {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const d = await res.json()
    setPortalLoading(false)
    if (!res.ok) { showMsg(d.error ?? 'Could not open billing portal', 'error'); return }
    window.location.href = d.url
  }

  async function deleteAllMemories() {
    if (!confirm('Delete ALL your memories? Mirror will forget everything about you. This cannot be undone.')) return
    await supabase.from('memories').delete().eq('user_id', user.id)
    showMsg('All memories deleted.')
  }

  async function deleteAccount() {
    if (!confirm('Delete your Mirror account permanently? All data will be lost.')) return
    if (!confirm('Are you absolutely sure? This is irreversible.')) return
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showMsg(d.error ?? 'Failed to delete account.', 'error')
      return
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1f1f1f] px-6 py-4 flex items-center gap-4">
        <Link href="/chat" className="text-[#555] hover:text-[#888] text-sm transition-colors">← Chat</Link>
        <h1 className="text-lg font-light text-[#f0f0f0]">Settings</h1>
      </header>

      {/* Toast */}
      {message && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm border animate-fade-in-up ${
          message.type === 'success'
            ? 'bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]'
            : 'bg-[#f87171]/10 border-[#f87171]/30 text-[#f87171]'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-12">

        {/* Profile */}
        <Section id="profile" title="Profile">
          <form onSubmit={saveName} className="space-y-4">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="input-base w-full" placeholder="Your name" />
            </Field>
            <Field label="Email">
              <input value={user.email} disabled className="input-base w-full opacity-50 cursor-not-allowed" />
            </Field>
            <button type="submit" disabled={saving} className="btn-primary text-sm px-5 py-2">
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </form>

          <form onSubmit={changePassword} className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
            <p className="text-xs text-[#888888]">Change password</p>
            <Field label="New password">
              <input name="password" type="password" placeholder="Min. 8 characters"
                className="input-base w-full" />
            </Field>
            <button type="submit" className="btn-secondary text-sm px-5 py-2">Update password</button>
          </form>
        </Section>

        {/* My Mirror */}
        <Section id="mirror" title="My Mirror">
          {voiceProfile && (
            <div className="flex items-center gap-3 mb-4">
              <AccuracyBadge score={voiceProfile.accuracy_score} size="md" />
            </div>
          )}
          <div className="space-y-3">
            <ActionRow
              label="Reset accuracy to 40%"
              description="Wipes your accuracy score. The profile stays, but Mirror acts like it barely knows you."
              action={<button onClick={resetAccuracy} className="btn-secondary text-xs px-4 py-1.5">Reset</button>}
            />
            <ActionRow
              label="Re-do onboarding"
              description="Answer the 20 questions again. Overwrites your current voice profile."
              action={<Link href="/onboard" className="btn-secondary text-xs px-4 py-1.5">Re-do</Link>}
            />
            <ActionRow
              label="Download voice profile"
              description="Get your profile_json as a .json file."
              action={
                <button onClick={downloadProfile} disabled={!voiceProfile}
                  className="btn-secondary text-xs px-4 py-1.5 disabled:opacity-40">
                  Download
                </button>
              }
            />
          </div>
        </Section>

        {/* Voice */}
        <Section id="voice" title="Voice Clone" badge={plan !== 'platinum' ? 'Platinum' : undefined}>
          {plan !== 'platinum' ? (
            <div className="text-sm text-[#888888] space-y-3">
              <p>Record 2 minutes of your voice and Mirror will speak in your cloned voice.</p>
              <Link href="/pricing" className="text-[#fbbf24] hover:text-[#fde68a] text-sm transition-colors">
                Upgrade to Platinum →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {voiceCloned && (
                <p className="text-xs text-[#34d399]">✓ Voice clone active</p>
              )}
              <p className="text-sm text-[#888888]">
                Upload a 2+ minute audio recording of you speaking naturally.
                ElevenLabs will clone your voice.
              </p>
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={uploadVoice} />
              <button
                onClick={() => audioInputRef.current?.click()}
                disabled={uploadingVoice}
                className="btn-primary text-sm px-5 py-2"
              >
                {uploadingVoice ? 'Cloning…' : voiceCloned ? 'Replace voice sample' : 'Upload voice sample'}
              </button>
            </div>
          )}
        </Section>

        {/* Sharing */}
        <Section id="sharing" title="Shared Mirrors" badge={plan === 'free' ? 'Pro' : undefined}>
          {plan === 'free' ? (
            <p className="text-sm text-[#888888]">
              Share your Mirror publicly with a unique link.{' '}
              <Link href="/pricing" className="text-[#a78bfa]">Upgrade to Pro →</Link>
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {shares.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm text-[#f0f0f0] font-mono">{appUrl}/mirror/{s.slug}</p>
                      <p className="text-xs text-[#555] mt-0.5">{s.views} views</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleShare(s.id)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          s.is_active
                            ? 'border-[#34d399]/40 text-[#34d399]'
                            : 'border-[#555] text-[#555]'
                        }`}
                      >
                        {s.is_active ? 'Live' : 'Off'}
                      </button>
                      <button onClick={() => deleteShare(s.id)}
                        className="text-[#f87171] text-xs hover:opacity-70 transition-opacity">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={createShare} className="btn-primary text-sm px-5 py-2">
                + Create share link
              </button>
            </div>
          )}
        </Section>

        {/* Subscription */}
        <Section id="subscription" title="Subscription">
          <div className="flex items-center gap-3 mb-4">
            <PlanBadge plan={plan} />
            <span className="text-sm text-[#888888]">
              {plan === 'free' ? 'Free plan' : plan === 'pro' ? '$9.99/month' : '$24.99/month'}
            </span>
            {upgradePolling && (
              <span className="text-xs text-[#a78bfa] animate-pulse">Verifying upgrade…</span>
            )}
          </div>
          {plan === 'free' ? (
            <Link href="/pricing" className="btn-primary text-sm px-5 py-2 inline-block">
              Upgrade plan
            </Link>
          ) : (
            <button onClick={openPortal} disabled={portalLoading} className="btn-secondary text-sm px-5 py-2">
              {portalLoading ? 'Opening…' : 'Manage billing →'}
            </button>
          )}
        </Section>

        {/* Notifications */}
        <Section id="notifications" title="Notifications">
          {!pushSupported ? (
            <p className="text-sm text-[#888888]">
              Push notifications are not supported in this browser.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#888888]">
                Get notified when you hit memory milestones (100, 500, 1000 memories).
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${pushEnabled ? 'bg-[#34d399]' : 'bg-[#555]'}`} />
                <span className="text-sm text-[#f0f0f0]">
                  {pushEnabled ? 'Notifications on' : 'Notifications off'}
                </span>
              </div>
              {pushEnabled ? (
                <button
                  onClick={unsubscribePush}
                  disabled={pushLoading}
                  className="btn-secondary text-sm px-5 py-2"
                >
                  {pushLoading ? 'Updating…' : 'Turn off'}
                </button>
              ) : (
                <button
                  onClick={subscribePush}
                  disabled={pushLoading}
                  className="btn-primary text-sm px-5 py-2"
                >
                  {pushLoading ? 'Enabling…' : 'Enable notifications'}
                </button>
              )}
            </div>
          )}
        </Section>

        {/* Danger Zone */}
        <Section id="danger" title="Danger Zone">
          <div className="border border-[#f87171]/20 rounded-xl p-5 space-y-4">
            <ActionRow
              label="Delete all memories"
              description="Mirror forgets everything you said. Your voice profile stays."
              action={
                <button onClick={deleteAllMemories}
                  className="text-xs px-4 py-1.5 border border-[#f87171]/40 text-[#f87171] rounded-lg hover:bg-[#f87171]/10 transition-colors">
                  Delete memories
                </button>
              }
            />
            <ActionRow
              label="Delete account"
              description="Permanently deletes your account and all data. No recovery."
              action={
                <button onClick={deleteAccount}
                  className="text-xs px-4 py-1.5 bg-[#f87171]/10 border border-[#f87171]/40 text-[#f87171] rounded-lg hover:bg-[#f87171]/20 transition-colors">
                  Delete account
                </button>
              }
            />
          </div>
        </Section>
      </div>

      <style>{`
        .input-base {
          background: #111111;
          border: 1px solid #1f1f1f;
          border-radius: 8px;
          padding: 10px 14px;
          color: #f0f0f0;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-base:focus { border-color: rgba(167,139,250,0.4); }
        .btn-primary {
          background: #a78bfa;
          color: white;
          border-radius: 8px;
          font-size: 14px;
          transition: background 0.15s;
          display: inline-block;
        }
        .btn-primary:hover { background: #9370f5; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-secondary {
          background: transparent;
          border: 1px solid #1f1f1f;
          color: #888888;
          border-radius: 8px;
          transition: all 0.15s;
          display: inline-block;
        }
        .btn-secondary:hover { border-color: #333; color: #f0f0f0; }
      `}</style>
    </div>
  )
}

function Section({ id, title, badge, children }: {
  id: string; title: string; badge?: string; children: React.ReactNode
}) {
  return (
    <section id={id}>
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-base font-light text-[#f0f0f0]">{title}</h2>
        {badge && (
          <span className="text-[10px] text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded px-1.5 py-0.5 uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-[#555] block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ActionRow({ label, description, action }: { label: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#1f1f1f] last:border-0">
      <div>
        <p className="text-sm text-[#f0f0f0]">{label}</p>
        <p className="text-xs text-[#555] mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
