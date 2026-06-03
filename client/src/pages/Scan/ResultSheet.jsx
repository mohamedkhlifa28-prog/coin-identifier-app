import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, Plus, ChevronDown } from 'lucide-react'
import { collectionAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import RarityBadge from '../../components/UI/RarityBadge'
import CoinFlipReveal from '../../components/Coin/CoinFlipReveal'
import { formatCurrency, getCountryFlag } from '../../utils/helpers'

const GRADES = [
  { grade: 'PO-1', label: 'PO-1 Poor' },
  { grade: 'FR-2', label: 'FR-2 Fair' },
  { grade: 'AG-3', label: 'AG-3 Almost Good' },
  { grade: 'G-4', label: 'G-4 Good' },
  { grade: 'VG-8', label: 'VG-8 Very Good' },
  { grade: 'F-12', label: 'F-12 Fine' },
  { grade: 'VF-20', label: 'VF-20 Very Fine' },
  { grade: 'EF-40', label: 'EF-40 Extremely Fine' },
  { grade: 'MS-60', label: 'MS-60 Uncirculated' },
]

const TABS = ['Details', 'Values', 'History', 'Alternatives']

export default function ResultSheet() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showXP } = useAuth()

  const { result, imageBase64 } = location.state || {}

  const [activeTab, setActiveTab] = useState('Details')
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDone, setFlipDone] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (!result) {
      navigate('/scan', { replace: true })
      return
    }
    // Trigger flip reveal after short delay
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
      await collectionAPI.addCoin({
        ...result,
        imageBase64: imageBase64?.includes(',')
          ? imageBase64.split(',')[1]
          : imageBase64,
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

  if (!result) return null

  const confidenceScore = result.confidenceScore || result.confidence_score || 0
  const rarityTier = result.rarityTier || result.rarity_tier || 'Common'
  const flag = getCountryFlag(result.country)

  const showAlternatives = confidenceScore < 85 && result.alternativeMatches?.length > 0
  const visibleTabs = showAlternatives ? TABS : TABS.filter((t) => t !== 'Alternatives')

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-32">
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

      {/* Coin identity */}
      <div className="px-5 text-center mb-5">
        <h2 className="text-[#D4A017] text-2xl font-bold font-display mb-2 leading-tight">
          {result.name || 'Unknown Coin'}
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-300 text-sm font-body mb-3">
          <span className="text-xl">{flag}</span>
          <span>{result.country}</span>
          {result.year && <span>· {result.year}</span>}
        </div>
        <div className="flex items-center justify-center gap-3">
          <RarityBadge tier={rarityTier} size="md" />
        </div>
      </div>

      {/* Confidence meter */}
      <div className="mx-5 mb-5">
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

            {result.errorVarieties?.length > 0 && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-white font-bold font-body mb-2 text-sm">Error Varieties to Look For</h3>
                <ul className="space-y-1">
                  {result.errorVarieties.map((e, i) => (
                    <li key={i} className="text-gray-400 text-sm font-body flex items-start gap-2">
                      <span className="text-[#D4A017] mt-0.5">•</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Values' && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2A2A2A]">
              <h3 className="text-white font-bold font-body text-sm">Value by Grade</h3>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {(result.valuesByGrade || []).map((item, i) => {
                const isHighest = i === (result.valuesByGrade?.length || 0) - 1
                return (
                  <div
                    key={item.grade}
                    className={[
                      'flex items-center justify-between px-4 py-3',
                      isHighest ? 'bg-[#D4A017]/10' : '',
                    ].join(' ')}
                  >
                    <span className={[
                      'text-sm font-body',
                      isHighest ? 'text-[#D4A017] font-bold' : 'text-gray-300',
                    ].join(' ')}>
                      {item.grade}
                    </span>
                    <span className={[
                      'text-sm font-bold font-body',
                      isHighest ? 'text-[#D4A017]' : 'text-white',
                    ].join(' ')}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                )
              })}
              {(!result.valuesByGrade || result.valuesByGrade.length === 0) && (
                <div className="px-4 py-8 text-center">
                  <p className="text-gray-500 font-body text-sm">No value data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'History' && (
          <div className="space-y-3">
            {result.historicalContext && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-white font-bold font-body mb-2 text-sm">Historical Context</h3>
                <p className="text-gray-400 text-sm font-body leading-relaxed">
                  {result.historicalContext}
                </p>
              </div>
            )}
            {result.funFact && (
              <div className="bg-[#1A2A1A] border border-green-900/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-[#D4A017]" />
                  <h3 className="text-white font-bold font-body text-sm">Fun Fact</h3>
                </div>
                <p className="text-gray-300 text-sm font-body leading-relaxed">
                  {result.funFact}
                </p>
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
              The AI wasn't fully confident. Could this be one of these?
            </p>
            {result.alternativeMatches.map((alt, i) => (
              <button
                key={i}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div className="text-left">
                  <p className="text-white font-medium font-body text-sm">{alt.name}</p>
                  {alt.country && (
                    <p className="text-gray-500 text-xs font-body">{alt.country}</p>
                  )}
                </div>
                <div className="bg-[#2A2A2A] rounded-full px-3 py-1">
                  <span className="text-[#D4A017] text-xs font-bold font-body">
                    {alt.confidence || alt.confidenceScore}%
                  </span>
                </div>
              </button>
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
              Adding...
            </>
          ) : (
            <>
              <Plus size={20} strokeWidth={2.5} />
              Add to Collection
            </>
          )}
        </button>
      </div>
    </div>
  )
}
