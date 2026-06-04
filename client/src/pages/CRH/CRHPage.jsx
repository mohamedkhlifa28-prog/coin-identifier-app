import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { crhAPI } from '../../api/client'
import { formatCurrency } from '../../utils/helpers'

const DENOMINATIONS = ['Pennies', 'Nickels', 'Dimes', 'Quarters', 'Half Dollars', 'Dollars', 'Mixed']

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  bank: '',
  denomination: 'Half Dollars',
  rolls_searched: '',
  coins_found: '',
  total_face_value: '',
  melt_value: '',
  notes: '',
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-center">
      <p className="text-[#D4A017] font-bold font-display text-lg">{value}</p>
      <p className="text-gray-500 text-xs font-body mt-0.5">{label}</p>
    </div>
  )
}

function SessionCard({ session, onDelete }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm('Delete this session?')) return
    setDeleting(true)
    try {
      await crhAPI.deleteSession(session.id)
      onDelete(session.id)
    } catch {
      alert('Failed to delete session')
      setDeleting(false)
    }
  }

  const finds = Array.isArray(session.coins_found)
    ? session.coins_found
    : (session.coins_found ? [session.coins_found] : [])

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white text-sm font-body font-semibold">{session.denomination}</span>
            {session.bank && (
              <span className="text-gray-500 text-xs font-body">· {session.bank}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-body text-gray-500">
            <span>{session.date}</span>
            <span>{session.rolls_searched} roll{session.rolls_searched !== 1 ? 's' : ''}</span>
            {session.melt_value > 0 && (
              <span className="text-[#D4A017]">{formatCurrency(session.melt_value)} melt</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-8 h-8 rounded-lg bg-red-900/20 flex items-center justify-center"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
          {open ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 space-y-2 text-sm font-body">
          {finds.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Finds</p>
              {finds.map((f, i) => (
                <p key={i} className="text-gray-300">• {f}</p>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {session.total_face_value > 0 && (
              <div>
                <p className="text-gray-500 text-xs">Face Value</p>
                <p className="text-white">{formatCurrency(session.total_face_value)}</p>
              </div>
            )}
            {session.melt_value > 0 && (
              <div>
                <p className="text-gray-500 text-xs">Melt Value</p>
                <p className="text-[#D4A017] font-semibold">{formatCurrency(session.melt_value)}</p>
              </div>
            )}
          </div>
          {session.notes && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Notes</p>
              <p className="text-gray-400 leading-relaxed">{session.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddSessionModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.denomination || !form.rolls_searched) {
      alert('Denomination and rolls searched are required')
      return
    }
    setIsSaving(true)
    try {
      const finds = form.coins_found
        ? form.coins_found.split('\n').map((s) => s.trim()).filter(Boolean)
        : []
      const res = await crhAPI.createSession({
        ...form,
        rolls_searched: parseInt(form.rolls_searched, 10) || 0,
        coins_found: finds,
        total_face_value: parseFloat(form.total_face_value) || 0,
        melt_value: parseFloat(form.melt_value) || 0,
      })
      onSave(res.data.session)
      onClose()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save session')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div
        className="bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-t-2xl w-full max-w-[430px] mx-auto overflow-y-auto scrollbar-none"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
          <h3 className="text-white font-display font-bold text-base">Log CRH Session</h3>
          <button onClick={onClose} className="text-gray-500 text-sm font-body">Cancel</button>
        </div>

        <div className="px-4 py-4 space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Rolls Searched *</label>
              <input
                type="number"
                min="1"
                value={form.rolls_searched}
                onChange={(e) => set('rolls_searched', e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Denomination *</label>
            <select
              value={form.denomination}
              onChange={(e) => set('denomination', e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
            >
              {DENOMINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Bank / Source</label>
            <input
              type="text"
              value={form.bank}
              onChange={(e) => set('bank', e.target.value)}
              placeholder="e.g. Chase Bank, credit union..."
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">
              Notable Finds <span className="text-gray-600">(one per line)</span>
            </label>
            <textarea
              value={form.coins_found}
              onChange={(e) => set('coins_found', e.target.value)}
              placeholder={`1964 Roosevelt Dime (silver)\n1966 Kennedy Half (40% silver)\n1943 Steel Penny`}
              rows={3}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Face Value ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_face_value}
                onChange={(e) => set('total_face_value', e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Melt Value ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.melt_value}
                onChange={(e) => set('melt_value', e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any observations about this session..."
              rows={2}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#D4A017] text-black font-bold py-4 rounded-xl font-body text-base disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Session'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CRHPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    Promise.all([crhAPI.getSessions(), crhAPI.getStats()])
      .then(([sessRes, statRes]) => {
        setSessions(sessRes.data.sessions || [])
        setStats(statRes.data.stats || null)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleSave = useCallback((session) => {
    setSessions((prev) => [session, ...prev])
    crhAPI.getStats().then((r) => setStats(r.data.stats)).catch(() => {})
  }, [])

  const handleDelete = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    crhAPI.getStats().then((r) => setStats(r.data.stats)).catch(() => {})
  }, [])

  const totalMelt = stats?.total_melt_value || 0
  const totalRolls = stats?.total_rolls || 0
  const totalSessions = stats?.total_sessions || 0

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-[#2A2A2A] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-display font-bold text-lg leading-tight">CRH Tracker</h1>
          <p className="text-gray-500 text-xs font-body">Coin Roll Hunting</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-[#D4A017] text-black font-bold px-3 py-2 rounded-xl text-sm font-body"
        >
          <Plus size={16} />
          Log Session
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          {totalSessions > 0 && (
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-[#D4A017]" />
                <p className="text-white text-sm font-body font-semibold">All-Time Stats</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Sessions" value={totalSessions} />
                <StatCard label="Rolls" value={(totalRolls || 0).toLocaleString()} />
                <StatCard label="Melt Value" value={formatCurrency(totalMelt)} />
              </div>
            </div>
          )}

          {/* Sessions list */}
          <div className="px-4 space-y-3">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">🎰</span>
                <p className="text-white font-body font-semibold mb-1">No sessions logged yet</p>
                <p className="text-gray-500 text-sm font-body mb-6">Track your coin roll hunting finds</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#D4A017] text-black font-bold px-6 py-3 rounded-xl font-body text-sm"
                >
                  Log First Session
                </button>
              </div>
            ) : (
              sessions.map((session) => (
                <SessionCard key={session.id} session={session} onDelete={handleDelete} />
              ))
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <AddSessionModal onClose={() => setShowAddModal(false)} onSave={handleSave} />
      )}
    </div>
  )
}
