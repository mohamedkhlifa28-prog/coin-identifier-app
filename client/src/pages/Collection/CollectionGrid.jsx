import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, ChevronDown, ChevronUp, Camera, X, TrendingUp } from 'lucide-react'
import { collectionAPI } from '../../api/client'
import { formatCurrency } from '../../utils/helpers'
import CoinCard from '../../components/Coin/CoinCard'
import SkeletonCard from '../../components/UI/SkeletonCard'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const RARITY_OPTIONS = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Ultra Rare']

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'value_desc', label: 'Highest Value' },
  { value: 'value_asc', label: 'Lowest Value' },
  { value: 'year_desc', label: 'Newest Year' },
  { value: 'year_asc', label: 'Oldest Year' },
  { value: 'rarity', label: 'Rarity' },
]

// Mock portfolio trend data
const MOCK_TREND = [
  { month: 'Jan', value: 120 },
  { month: 'Feb', value: 185 },
  { month: 'Mar', value: 160 },
  { month: 'Apr', value: 240 },
  { month: 'May', value: 310 },
  { month: 'Jun', value: 290 },
]

export default function CollectionGrid() {
  const navigate = useNavigate()

  const [coins, setCoins] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [dashboardExpanded, setDashboardExpanded] = useState(false)

  const [filters, setFilters] = useState({
    country: '',
    yearMin: '',
    yearMax: '',
    rarities: [],
    denomination: '',
    sortBy: 'date_desc',
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = {}
      if (filters.country) params.country = filters.country
      if (filters.yearMin) params.yearMin = filters.yearMin
      if (filters.yearMax) params.yearMax = filters.yearMax
      if (filters.rarities.length) params.rarities = filters.rarities.join(',')
      if (filters.denomination) params.denomination = filters.denomination
      if (filters.sortBy) params.sort = filters.sortBy

      const [coinsRes, statsRes] = await Promise.all([
        collectionAPI.getCollection(params),
        collectionAPI.getStats(),
      ])
      setCoins(coinsRes.data.coins || coinsRes.data || [])
      setStats(statsRes.data)
    } catch (err) {
      setError('Failed to load collection.')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalValue = useMemo(
    () => stats?.totalValue || coins.reduce((sum, c) => sum + (c.estimatedValue || c.estimated_value || 0), 0),
    [stats, coins]
  )

  const costBasis = stats?.costBasis || 0
  const gainLoss = totalValue - costBasis
  const gainLossPercent = costBasis > 0 ? ((gainLoss / costBasis) * 100).toFixed(1) : null

  const topCoins = useMemo(
    () => [...coins]
      .sort((a, b) => (b.estimatedValue || b.estimated_value || 0) - (a.estimatedValue || a.estimated_value || 0))
      .slice(0, 3),
    [coins]
  )

  const toggleRarity = (r) => {
    setFilters((prev) => ({
      ...prev,
      rarities: prev.rarities.includes(r)
        ? prev.rarities.filter((x) => x !== r)
        : [...prev.rarities, r],
    }))
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 bg-[#0F0F0F] z-10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white font-display font-bold text-2xl">My Collection</h1>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-body font-medium transition-colors',
              showFilters
                ? 'bg-[#D4A017] text-black border-[#D4A017]'
                : 'bg-[#1A1A1A] text-gray-400 border-[#2A2A2A]',
            ].join(' ')}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3">
          <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-center">
            <p className="text-[#D4A017] font-bold text-lg font-body">{coins.length}</p>
            <p className="text-gray-500 text-xs font-body">Coins</p>
          </div>
          <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-center">
            <p className="text-[#D4A017] font-bold text-lg font-body">{formatCurrency(totalValue)}</p>
            <p className="text-gray-500 text-xs font-body">Est. Value</p>
          </div>
        </div>
      </div>

      {/* Portfolio Dashboard */}
      {coins.length > 0 && (
        <div className="mx-4 mb-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <button
            onClick={() => setDashboardExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#D4A017]" />
              <span className="text-white font-medium font-body text-sm">Portfolio</span>
            </div>
            {dashboardExpanded ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {dashboardExpanded && (
            <div className="px-4 pb-4 border-t border-[#2A2A2A] pt-4 space-y-4">
              {/* Value */}
              <div>
                <p className="text-gray-500 text-xs font-body mb-1">Total Estimated Value</p>
                <p className="text-[#D4A017] text-3xl font-bold font-display">{formatCurrency(totalValue)}</p>
                {costBasis > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500 text-xs font-body">Cost: {formatCurrency(costBasis)}</span>
                    <span className={`text-xs font-bold font-body ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                      {gainLossPercent && ` (${gainLossPercent}%)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Chart */}
              <div>
                <p className="text-gray-500 text-xs font-body mb-2">Value Trend (6 months)</p>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={MOCK_TREND}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#D4A017"
                      strokeWidth={2}
                      dot={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#6B7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A1A',
                        border: '1px solid #2A2A2A',
                        borderRadius: 8,
                        color: '#fff',
                      }}
                      formatter={(v) => [formatCurrency(v), 'Value']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top 3 */}
              {topCoins.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs font-body mb-2">Top Valuable Coins</p>
                  <div className="space-y-2">
                    {topCoins.map((c, i) => (
                      <div key={c._id || i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[#D4A017] font-bold text-xs font-body">#{i + 1}</span>
                          <span className="text-white text-xs font-body line-clamp-1 max-w-[160px]">{c.name}</span>
                        </div>
                        <span className="text-[#D4A017] text-xs font-bold font-body">
                          {formatCurrency(c.estimatedValue || c.estimated_value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Drawer */}
      {showFilters && (
        <div className="mx-4 mb-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium font-body text-sm">Filters & Sort</h3>
            <button
              onClick={() => setFilters({ country: '', yearMin: '', yearMax: '', rarities: [], denomination: '', sortBy: 'date_desc' })}
              className="text-[#D4A017] text-xs font-body"
            >
              Reset
            </button>
          </div>

          {/* Sort */}
          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Country</label>
            <input
              type="text"
              placeholder="e.g. United States"
              value={filters.country}
              onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
            />
          </div>

          {/* Year range */}
          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Year Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="From"
                value={filters.yearMin}
                onChange={(e) => setFilters((f) => ({ ...f, yearMin: e.target.value }))}
                className="flex-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
              />
              <input
                type="number"
                placeholder="To"
                value={filters.yearMax}
                onChange={(e) => setFilters((f) => ({ ...f, yearMax: e.target.value }))}
                className="flex-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
              />
            </div>
          </div>

          {/* Rarity */}
          <div>
            <label className="text-gray-400 text-xs font-body mb-1.5 block">Rarity</label>
            <div className="flex flex-wrap gap-2">
              {RARITY_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRarity(r)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-colors',
                    filters.rarities.includes(r)
                      ? 'bg-[#D4A017] text-black border-[#D4A017]'
                      : 'bg-transparent text-gray-400 border-[#3A3A3A]',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <SkeletonCard key={i} variant="coin-card" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-red-400 font-body text-sm mb-3">{error}</p>
            <button
              onClick={fetchData}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2 text-white text-sm font-body"
            >
              Try Again
            </button>
          </div>
        ) : coins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <span className="text-6xl mb-4">🪙</span>
            <p className="text-white font-body font-medium text-base mb-2">
              Your collection is empty
            </p>
            <p className="text-gray-500 font-body text-sm mb-6">
              Start scanning coins to build your collection!
            </p>
            <button
              onClick={() => navigate('/scan')}
              className="flex items-center gap-2 bg-[#D4A017] text-black font-bold px-6 py-3 rounded-xl font-body"
            >
              <Camera size={18} />
              Scan a Coin
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {coins.map((coin) => (
              <CoinCard
                key={coin._id || coin.id}
                coin={coin}
                onClick={() => navigate(`/collection/${coin._id || coin.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
