import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, Plus, Star, Search, X, Upload, Check, AlertCircle } from 'lucide-react'
import { collectionAPI, scanAPI } from '../../api/client'
import apiClient from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import RarityBadge from '../../components/UI/RarityBadge'
import CoinFlipReveal from '../../components/Coin/CoinFlipReveal'
import PaywallModal from '../../components/UI/PaywallModal'
import { formatCurrency, getCountryFlag } from '../../utils/helpers'

const TABS = ['Details', 'Values', 'History', 'Alternatives']

async function uploadImage(base64DataUrl) {
  try {
    const blob = await fetch(base64DataUrl).then((r) => r.blob())
    const formData = new FormData()
    formData.append('image', blob, 'coin.jpg')
    const res = await apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.url || null
  } catch {
    return null
  }
}

export default function ResultSheet() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, showXP } = useAuth()

  const { result, imageBase64 } = location.state || {}

  const [activeTab, setActiveTab] = useState('Details')
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDone, setFlipDone] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)

  // Grading state
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [reverseImageData, setReverseImageData] = useState(null)
  const [isGrading, setIsGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState(null)
  const reverseFileRef = useRef(null)

  // Error detection state
  const [isDetectingErrors, setIsDetectingErrors] = useState(false)
  const [errorResult, setErrorResult] = useState(null)

  const isPro = (user?.subscription_tier || 'free') !== 'free'

  useEffect(() => {
    if (!result) {
      navigate('/scan', { replace: true })
      return
    }
    const t = setTimeout(() => setIsFlipping(true), 400)
    return () => clearTimeout(t)
  }, [result, navigate])

  const handleFlipComplete = useCallback(() => {
    setIsFlipping(false)
    setFlipDone(true)
  }, [])

  const handleAddToCollection = useCallback(async () => {
    if (isAdding) return
    setIsAdding(true)
    try {
      let image_url = null
      if (imageBase64?.startsWith('data:')) {
        image_url = await uploadImage(imageBase64)
      }
      const ev = result.estimatedValues || {}
      const estimated_value =
        ev.veryFine ?? ev.fine ?? ev.good ?? ev.poor ?? 0

      await collectionAPI.addCoin({
        name: result.name,
        country: result.country,
        year: result.year,
        denomination: result.denomination,
        composition: result.composition,
        estimated_value,
        rarity_tier: result.rarityTier || result.rarity_tier || 'Common',
        image_url,
        ai_data: result,
      })
      showXP(5, 'Added to collection!')
      navigate('/collection', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not add to collection.'
      alert(msg)
    } finally {
      setIsAdding(false)
    }
  }, [isAdding, result, imageBase64, showXP, navigate])

  const handleDetectErrors = useCallback(async () => {
    if (!isPro) { setPaywallOpen(true); return }
    if (!imageBase64) return
    setIsDetectingErrors(true)
    setErrorResult(null)
    try {
      const [header, rawBase64] = imageBase64.split(',')
      const mimeType = header?.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
      const res = await scanAPI.detectErrors(rawBase64, mimeType)
      setErrorResult(res.data.result || res.data)
    } catch {
      alert('Error detection failed. Please try again.')
    } finally {
      setIsDetectingErrors(false)
    }
  }, [isPro, imageBase64])

  const handleGrade = useCallback(() => {
    if (!isPro) { setPaywallOpen(true); return }
    setShowGradeModal(true)
  }, [isPro])

  const handleReverseUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setReverseImageData(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const handleGradeSubmit = useCallback(async () => {
    if (!reverseImageData || !imageBase64) return
    setIsGrading(true)
    try {
      const [header, obverseRaw] = imageBase64.split(',')
      const mimeType = header?.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
      const [, reverseRaw] = reverseImageData.split(',')
      const res = await scanAPI.gradeCoin(obverseRaw, reverseRaw, mimeType)
      setGradeResult(res.data.result || res.data)
      setShowGradeModal(false)
    } catch {
      alert('Grading failed. Please try again.')
    } finally {
      setIsGrading(false)
    }
  }, [reverseImageData, imageBase64])

  if (!result) return null

  const confidenceScore = result.confidenceScore || result.confidence_score || 0
  const rarityTier = result.rarityTier || result.rarity_tier || 'Common'
  const flag = getCountryFlag(result.country)

  // Build values array from estimatedValues object
  const ev = result.estimatedValues || {}
  const estimatedValueEntries = [
    { label: 'Poor (PO-1)', value: ev.poor },
    { label: 'Good (G-4)', value: ev.good },
    { label: 'Fine (F-12)', value: ev.fine },
    { label: 'Very Fine (VF-20)', value: ev.veryFine },
    { label: 'Ext. Fine (EF-40)', value: ev.extremelyFine },
    { label: 'About Unc.', value: ev.aboutUncirculated },
    { label: 'MS-60', value: ev.ms60 },
    { label: 'MS-63', value: ev.ms63 },
    { label: 'MS-65', value: ev.ms65 },
  ].filter((e) => e.value != null && e.value > 0)

  const showAlternatives = confidenceScore < 85 && result.alternativeMatches?.length > 0
  const visibleTabs = showAlternatives ? TABS : TABS.filter((t) => t !== 'Alternatives')

  const severityColor = (s) =>
    s === 'Dramatic' ? 'text-red-400' :
    s === 'Major' ? 'text-orange-400' :
    s === 'Moderate' ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-36">
      <input
        ref={reverseFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReverseUpload}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate('/scan', { replace: true })}
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="text-white font-display font-bold text-lg">Scan Result</h1>
      </div>

      {/* Coin flip reveal */}
      <div className="flex justify-center py-6">
        <CoinFlipReveal
          imageUrl={imageBase64}
          isFlipping={isFlipping}
          onFlipComplete={handleFlipComplete}
        />
      </div>

      {/* Error banner */}
      {result.error && (
        <div className="mx-5 mb-3 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm font-body leading-snug">
            {result.message || 'Could not fully identify this coin. Try a clearer photo.'}
          </p>
        </div>
      )}

      {/* Coin identity */}
      <div className="px-5 text-center mb-5">
        <h2 className="text-[#D4A017] text-2xl font-bold font-display mb-2 leading-tight">
          {result.name || 'Unknown Coin'}
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-300 text-sm font-body mb-3">
          {flag && <span className="text-xl">{flag}</span>}
          <span>{result.country}</span>
          {result.year && <span>· {result.year}</span>}
        </div>
        <div className="flex items-center justify-center gap-3">
          <RarityBadge tier={rarityTier} size="md" />
        </div>
      </div>

      {/* Confidence meter */}
      <div className="mx-5 mb-4">
        <div className="flex justify-between text-xs font-body mb-1.5">
          <span className="text-gray-400">AI Confidence</span>
          <span className="text-[#D4A017] font-bold">{confidenceScore}%</span>
        </div>
        <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D4A017] rounded-full transition-all duration-700"
            style={{ width: `${confidenceScore}%` }}
          />
        </div>
      </div>

      {/* Pro action buttons */}
      <div className="flex gap-3 mx-5 mb-5">
        <button
          onClick={handleGrade}
          disabled={isGrading}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] border border-[#D4A017]/40 rounded-xl py-3 text-sm font-body font-semibold text-[#D4A017] active:scale-95 transition-transform disabled:opacity-60"
        >
          <Star size={15} />
          {isGrading ? 'Grading…' : isPro ? 'AI Grade' : '🔒 AI Grade'}
        </button>
        <button
          onClick={handleDetectErrors}
          disabled={isDetectingErrors}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3 text-sm font-body font-semibold text-gray-300 active:scale-95 transition-transform disabled:opacity-60"
        >
          <Search size={15} />
          {isDetectingErrors ? 'Scanning…' : isPro ? 'Error Scan' : '🔒 Error Scan'}
        </button>
      </div>

      {/* Grade result card */}
      {gradeResult && (
        <div className="mx-5 mb-4 bg-[#1A1A1A] border border-[#D4A017]/40 rounded-2xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold font-body text-sm">AI Grade Result</h3>
            <button onClick={() => setGradeResult(null)}>
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-[#D4A017]/20 border border-[#D4A017]/40 rounded-xl px-4 py-2 text-center">
              <p className="text-[#D4A017] text-2xl font-bold font-display">{gradeResult.grade}</p>
              <p className="text-gray-400 text-xs font-body">{gradeResult.gradeDescription}</p>
            </div>
            <div className="flex-1">
              {gradeResult.estimatedValue > 0 && (
                <p className="text-white font-bold font-body">{formatCurrency(gradeResult.estimatedValue)}</p>
              )}
              <p className="text-gray-400 text-xs font-body mt-1">PCGS: {gradeResult.pcgsEquivalent}</p>
              <p className="text-gray-400 text-xs font-body">NGC: {gradeResult.ngcEquivalent}</p>
            </div>
          </div>
          {gradeResult.gradingNotes && (
            <p className="text-gray-400 text-xs font-body leading-relaxed">{gradeResult.gradingNotes}</p>
          )}
          {gradeResult.positives?.length > 0 && (
            <div className="mt-2">
              <p className="text-green-400 text-xs font-body font-semibold mb-1">Positives</p>
              {gradeResult.positives.map((p, i) => (
                <p key={i} className="text-gray-400 text-xs font-body">• {p}</p>
              ))}
            </div>
          )}
          {gradeResult.negatives?.length > 0 && (
            <div className="mt-2">
              <p className="text-red-400 text-xs font-body font-semibold mb-1">Detractions</p>
              {gradeResult.negatives.map((n, i) => (
                <p key={i} className="text-gray-400 text-xs font-body">• {n}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error detection result card */}
      {errorResult && (
        <div className={`mx-5 mb-4 rounded-2xl p-4 border animate-fade-in ${errorResult.hasErrors ? 'bg-orange-900/20 border-orange-700/40' : 'bg-green-900/20 border-green-700/40'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold font-body text-sm">Error Detection</h3>
            <button onClick={() => setErrorResult(null)}>
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <p className="text-gray-300 text-xs font-body mb-3 leading-relaxed">{errorResult.summary}</p>
          {errorResult.errors?.map((err, i) => (
            <div key={i} className="bg-black/30 rounded-xl p-3 mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white text-xs font-body font-semibold">{err.type}</p>
                <span className={`text-xs font-body font-bold ${severityColor(err.severity)}`}>{err.severity}</span>
              </div>
              <p className="text-gray-400 text-xs font-body">{err.description}</p>
              {err.location && <p className="text-gray-500 text-xs font-body mt-1">Location: {err.location}</p>}
            </div>
          ))}
          {errorResult.potentialValueRange?.high > 0 && (
            <p className="text-[#D4A017] text-xs font-body font-semibold mt-2">
              Potential value: {formatCurrency(errorResult.potentialValueRange.low)} – {formatCurrency(errorResult.potentialValueRange.high)}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4 overflow-x-auto scrollbar-none">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 rounded-full text-sm font-medium font-body whitespace-nowrap transition-colors',
              activeTab === tab
                ? 'bg-[#D4A017] text-black'
                : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A]',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 animate-fade-in">
        {activeTab === 'Details' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Denomination', result.denomination],
                ['Composition', result.composition],
                ['Diameter', result.diameter ? `${result.diameter}mm` : null],
                ['Weight', result.weight ? `${result.weight}g` : null],
                ['Mintage', result.mintage ? Number(result.mintage).toLocaleString() : null],
                ['Mint Mark', result.mintMark || result.mint_mark],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3">
                    <p className="text-gray-500 text-xs font-body mb-0.5">{label}</p>
                    <p className="text-white text-sm font-medium font-body">{value}</p>
                  </div>
                ))}
            </div>
            {result.errorCoinsToLookFor && result.errorCoinsToLookFor !== 'N/A' && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-white font-bold font-body mb-2 text-sm">Error Varieties to Watch</h3>
                <p className="text-gray-400 text-sm font-body leading-relaxed">{result.errorCoinsToLookFor}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Values' && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2A2A2A]">
              <h3 className="text-white font-bold font-body text-sm">Value by Grade</h3>
            </div>
            {estimatedValueEntries.length > 0 ? (
              <div className="divide-y divide-[#2A2A2A]">
                {estimatedValueEntries.map((item, i) => {
                  const isHighest = i === estimatedValueEntries.length - 1
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between px-4 py-3 ${isHighest ? 'bg-[#D4A017]/10' : ''}`}
                    >
                      <span className={`text-sm font-body ${isHighest ? 'text-[#D4A017] font-bold' : 'text-gray-300'}`}>
                        {item.label}
                      </span>
                      <span className={`text-sm font-bold font-body ${isHighest ? 'text-[#D4A017]' : 'text-white'}`}>
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500 font-body text-sm">No value data available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'History' && (
          <div className="space-y-3">
            {result.historicalContext && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-white font-bold font-body mb-2 text-sm">Historical Context</h3>
                <p className="text-gray-400 text-sm font-body leading-relaxed">{result.historicalContext}</p>
              </div>
            )}
            {result.funFact && (
              <div className="bg-[#1A2A1A] border border-green-900/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-[#D4A017]" />
                  <h3 className="text-white font-bold font-body text-sm">Fun Fact</h3>
                </div>
                <p className="text-gray-300 text-sm font-body leading-relaxed">{result.funFact}</p>
              </div>
            )}
            {!result.historicalContext && !result.funFact && (
              <div className="text-center py-8">
                <p className="text-gray-500 font-body text-sm">No historical data available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Alternatives' && showAlternatives && (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm font-body mb-3">
              Confidence was low — could this be one of these?
            </p>
            {result.alternativeMatches.map((alt, i) => (
              <div
                key={i}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between"
              >
                <p className="text-white font-medium font-body text-sm">{alt.name}</p>
                <div className="bg-[#2A2A2A] rounded-full px-3 py-1">
                  <span className="text-[#D4A017] text-xs font-bold font-body">
                    {alt.confidence || alt.confidenceScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/95 to-transparent z-30">
        <button
          onClick={handleAddToCollection}
          disabled={isAdding}
          className="w-full bg-[#D4A017] text-black font-bold py-4 rounded-xl font-body text-base active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isAdding ? (
            <>
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Adding…
            </>
          ) : (
            <>
              <Plus size={20} strokeWidth={2.5} />
              Add to Collection
            </>
          )}
        </button>
      </div>

      {/* AI Grade modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-t-2xl w-full max-w-[430px] mx-auto p-5 pb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-display font-bold text-lg">AI Grade</h3>
              <button
                onClick={() => { setShowGradeModal(false); setReverseImageData(null) }}
                className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <p className="text-gray-400 text-sm font-body mb-4 leading-relaxed">
              The front (obverse) is already captured. Upload the back (reverse) to get an accurate Sheldon scale grade.
            </p>

            {/* Reverse image preview */}
            <button
              onClick={() => reverseFileRef.current?.click()}
              className="w-full aspect-video bg-[#0F0F0F] border border-dashed border-[#3A3A3A] rounded-xl flex flex-col items-center justify-center mb-4 overflow-hidden active:scale-95 transition-transform"
            >
              {reverseImageData ? (
                <img src={reverseImageData} alt="Reverse" className="w-full h-full object-contain" />
              ) : (
                <>
                  <Upload size={24} className="text-gray-500 mb-2" />
                  <p className="text-gray-500 text-sm font-body">Upload reverse side</p>
                </>
              )}
            </button>

            <button
              onClick={handleGradeSubmit}
              disabled={!reverseImageData || isGrading}
              className="w-full bg-[#D4A017] text-black font-bold py-3.5 rounded-xl font-body disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isGrading ? (
                <>
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Grading…
                </>
              ) : 'Grade This Coin'}
            </button>
          </div>
        </div>
      )}

      {/* Paywall modal */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="AI Grading & Error Detection"
      />
    </div>
  )
}
