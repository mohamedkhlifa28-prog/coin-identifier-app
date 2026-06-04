import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, ChevronDown, ChevronUp, Save, Lightbulb, Tag } from 'lucide-react'
import { collectionAPI } from '../../api/client'
import { formatCurrency, getCountryFlag, getRarityHexColor } from '../../utils/helpers'
import RarityBadge from '../../components/UI/RarityBadge'

const GRADE_OPTIONS = [
  'PO-1', 'FR-2', 'AG-3', 'G-4', 'VG-8', 'F-12', 'VF-20', 'EF-40',
  'AU-50', 'AU-55', 'MS-60', 'MS-63', 'MS-65', 'MS-67', 'MS-70',
  'PF-60', 'PF-65', 'PF-70',
]

function AccordionSection({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-white font-medium font-body text-sm">{title}</span>
        {open ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>
      {open && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

export default function CoinDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [coin, setCoin] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [userGrade, setUserGrade] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const fetchCoin = async () => {
      try {
        const res = await collectionAPI.getCoin(id)
        const data = res.data.coin || res.data
        setCoin(data)
        setUserGrade(data.userGrade || data.user_grade || '')
        setPurchasePrice(data.purchasePrice ?? data.purchase_price ?? '')
        setPurchaseDate(data.purchaseDate || data.purchase_date || '')
        setNotes(data.notes || '')
      } catch (err) {
        setError('Failed to load coin details.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCoin()
  }, [id])

  const handleSave = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await collectionAPI.updateCoin(id, {
        userGrade: userGrade,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        purchaseDate: purchaseDate || null,
        notes,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      alert('Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }, [id, userGrade, purchasePrice, purchaseDate, notes, isSaving])

  const handleDelete = useCallback(async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await collectionAPI.deleteCoin(id)
      navigate('/collection', { replace: true })
    } catch (err) {
      alert('Failed to delete coin.')
      setIsDeleting(false)
    }
  }, [id, navigate, isDeleting])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !coin) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center text-center px-8">
        <p className="text-red-400 font-body mb-4">{error || 'Coin not found'}</p>
        <button onClick={() => navigate(-1)} className="text-[#D4A017] font-body">Go Back</button>
      </div>
    )
  }

  const photos = coin.photos || (coin.imageUrl ? [coin.imageUrl] : [])
  const flag = getCountryFlag(coin.country)
  const estimatedValue = coin.estimatedValue || coin.estimated_value || 0
  const rarityTier = coin.rarityTier || coin.rarity_tier || 'Common'

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/marketplace/create', { state: { coinId: id } })}
            className="h-10 px-3 rounded-xl bg-[#1A1A1A] border border-[#D4A017]/40 flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Tag size={14} className="text-[#D4A017]" />
            <span className="text-[#D4A017] text-xs font-body font-semibold">Sell</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-red-900/50 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Delete coin"
          >
            <Trash2 size={18} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Photo gallery */}
      <div className="relative mb-4">
        <div className="w-full aspect-square bg-[#1A1A1A] overflow-hidden">
          {photos.length > 0 ? (
            <img
              src={photos[selectedPhoto]}
              alt={coin.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">🪙</span>
            </div>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 justify-center mt-2 px-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPhoto(i)}
                  className={[
                    'w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-colors',
                    i === selectedPhoto ? 'border-[#D4A017]' : 'border-transparent',
                  ].join(' ')}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 space-y-4">
        {/* Identity */}
        <div>
          <h1 className="text-white text-2xl font-bold font-display leading-tight mb-2">
            {coin.name}
          </h1>
          <div className="flex items-center gap-2 mb-3">
            <RarityBadge tier={rarityTier} size="sm" />
            <span className="text-gray-400 text-sm font-body">{flag} {coin.country}</span>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Year', coin.year],
              ['Denomination', coin.denomination],
              ['Grade', coin.userGrade || coin.user_grade || coin.grade || '—'],
              ['Composition', coin.composition],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2">
                  <p className="text-gray-500 text-xs font-body">{label}</p>
                  <p className="text-white font-medium font-body text-sm mt-0.5">{value}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Estimated value */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
          <p className="text-gray-500 text-xs font-body mb-1">Estimated Value</p>
          <p className="text-[#D4A017] text-3xl font-bold font-display">{formatCurrency(estimatedValue)}</p>
          {coin.valuesByGrade?.length > 0 && (
            <p className="text-gray-500 text-xs font-body mt-1">
              Range: {formatCurrency(coin.valuesByGrade[0]?.value)} – {formatCurrency(coin.valuesByGrade[coin.valuesByGrade.length - 1]?.value)}
            </p>
          )}
        </div>

        {/* User data section */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-bold font-body text-sm">My Details</h2>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Grade</label>
            <select
              value={userGrade}
              onChange={(e) => setUserGrade(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
            >
              <option value="">— Select Grade —</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl pl-7 pr-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Personal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this coin..."
              rows={3}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={[
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold font-body text-sm transition-colors',
              saveSuccess
                ? 'bg-green-600 text-white'
                : 'bg-[#D4A017] text-black',
            ].join(' ')}
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              'Saved!'
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* AI data accordions */}
        {coin.composition && (
          <AccordionSection title="Composition & Specs">
            <div className="space-y-2 text-sm font-body">
              {[
                ['Composition', coin.composition],
                ['Diameter', coin.diameter ? `${coin.diameter}mm` : null],
                ['Weight', coin.weight ? `${coin.weight}g` : null],
                ['Thickness', coin.thickness ? `${coin.thickness}mm` : null],
                ['Edge', coin.edge],
                ['Mintage', coin.mintage ? Number(coin.mintage).toLocaleString() : null],
                ['Mint Mark', coin.mintMark || coin.mint_mark],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
            </div>
          </AccordionSection>
        )}

        {coin.historicalContext && (
          <AccordionSection title="Historical Context">
            <p className="text-gray-400 text-sm font-body leading-relaxed">
              {coin.historicalContext}
            </p>
          </AccordionSection>
        )}

        {coin.funFact && (
          <AccordionSection title="Fun Fact">
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-[#D4A017] shrink-0 mt-0.5" />
              <p className="text-gray-400 text-sm font-body leading-relaxed">{coin.funFact}</p>
            </div>
          </AccordionSection>
        )}

        {coin.errorVarieties?.length > 0 && (
          <AccordionSection title="Error Varieties">
            <ul className="space-y-1.5">
              {coin.errorVarieties.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-body text-gray-400">
                  <span className="text-[#D4A017] mt-0.5">•</span>
                  {e}
                </li>
              ))}
            </ul>
          </AccordionSection>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold font-display text-lg mb-2">Delete Coin?</h3>
            <p className="text-gray-400 font-body text-sm mb-5">
              This will permanently remove <strong className="text-white">{coin.name}</strong> from your collection. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-[#2A2A2A] text-white font-medium py-3 rounded-xl font-body text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl font-body text-sm disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
