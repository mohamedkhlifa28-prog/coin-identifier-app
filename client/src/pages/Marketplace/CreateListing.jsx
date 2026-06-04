import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, DollarSign, X, Plus } from 'lucide-react'
import { collectionAPI, marketplaceAPI } from '../../api/client'

const GRADES = ['Poor', 'Good', 'Very Good', 'Fine', 'Very Fine', 'Extremely Fine', 'About Uncirculated', 'MS-60', 'MS-63', 'MS-65']

export default function CreateListing() {
  const navigate = useNavigate()
  const location = useLocation()
  const preselectedCoinId = location.state?.coinId

  const [myCoins, setMyCoins] = useState([])
  const [selectedCoin, setSelectedCoin] = useState(null)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    grade: '',
  })

  useEffect(() => {
    collectionAPI.getCollection()
      .then((res) => {
        const coins = res.data.coins || []
        setMyCoins(coins)
        if (preselectedCoinId) {
          const coin = coins.find((c) => c.id === preselectedCoinId)
          if (coin) handleSelectCoin(coin)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCoins(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectCoin = (coin) => {
    setSelectedCoin(coin)
    let aiData = {}
    try { aiData = typeof coin.ai_data === 'string' ? JSON.parse(coin.ai_data) : (coin.ai_data || {}) } catch (_) {}
    setForm({
      title: coin.name || '',
      description: aiData.historicalContext ? aiData.historicalContext.substring(0, 200) : '',
      price: coin.estimated_value ? String(Math.round(coin.estimated_value * 0.9)) : '',
      grade: coin.grade || '',
    })
  }

  const handleSubmit = async () => {
    if (!form.title || !form.price) {
      alert('Please fill in a title and price')
      return
    }

    setIsSubmitting(true)
    try {
      let aiData = {}
      if (selectedCoin) {
        try { aiData = typeof selectedCoin.ai_data === 'string' ? JSON.parse(selectedCoin.ai_data) : (selectedCoin.ai_data || {}) } catch (_) {}
      }

      await marketplaceAPI.createListing({
        user_coin_id: selectedCoin?.id,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        grade: form.grade,
        image_url: selectedCoin?.image_url,
        coin_data: JSON.stringify({
          name: selectedCoin?.name || form.title,
          country: selectedCoin?.country,
          year: selectedCoin?.year,
          denomination: selectedCoin?.denomination,
          rarityTier: selectedCoin?.rarity_tier,
          ...aiData,
        }),
      })
      navigate('/marketplace')
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-8 overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-[#2A2A2A] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/marketplace')} className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="text-white font-display font-bold text-lg">List a Coin</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Select from collection */}
        <div>
          <p className="text-white font-body font-semibold text-sm mb-3">Select from Your Collection</p>
          {isLoadingCoins ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-16 h-16 rounded-xl bg-[#1A1A1A] animate-pulse flex-shrink-0" />
              ))}
            </div>
          ) : myCoins.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
              <p className="text-gray-500 text-sm font-body">No coins in your collection yet.</p>
              <button onClick={() => navigate('/scan')} className="text-[#D4A017] text-xs font-body mt-1">Scan a coin first</button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
              {myCoins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => handleSelectCoin(coin)}
                  className={`w-16 h-16 rounded-xl flex-shrink-0 border-2 overflow-hidden flex items-center justify-center transition-colors ${
                    selectedCoin?.id === coin.id ? 'border-[#D4A017]' : 'border-[#2A2A2A] bg-[#1A1A1A]'
                  }`}
                >
                  {coin.image_url ? (
                    <img src={coin.image_url} alt={coin.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🪙</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedCoin && (
            <div className="mt-2 flex items-center gap-2 bg-[#D4A017]/10 border border-[#D4A017]/30 rounded-xl px-3 py-2">
              <span className="text-[#D4A017] text-xs font-body font-medium">{selectedCoin.name}</span>
              <button onClick={() => setSelectedCoin(null)} className="ml-auto">
                <X size={12} className="text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 font-body mb-1.5">Listing Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. 1921 Morgan Silver Dollar MS-63"
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-body mb-1.5">Asking Price *</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-8 pr-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-body mb-1.5">Grade</label>
            <select
              value={form.grade}
              onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
            >
              <option value="">Select grade (optional)</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-body mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe the coin's condition, history, or any special attributes..."
              rows={4}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#D4A017] resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !form.title || !form.price}
          className="w-full bg-[#D4A017] text-black font-bold py-4 rounded-2xl font-body text-base active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Publishing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Plus size={18} />
              Publish Listing
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
