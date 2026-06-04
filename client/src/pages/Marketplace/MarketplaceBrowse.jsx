import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { marketplaceAPI } from '../../api/client'
import { formatCurrency, getInitials, timeAgo } from '../../utils/helpers'
import SkeletonCard from '../../components/UI/SkeletonCard'
import RarityBadge from '../../components/UI/RarityBadge'

function ListingCard({ listing, onClick }) {
  const seller = listing.seller || {}
  const initials = getInitials(seller.name || 'Unknown')
  const imageUrl = listing.photos?.[0] || listing.imageUrl || listing.image_url

  return (
    <button
      onClick={onClick}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden w-full text-left active:scale-[0.97] transition-transform"
    >
      {/* Image */}
      <div className="aspect-[3/4] bg-[#222222] overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">🪙</span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-white text-xs font-medium font-body line-clamp-2 leading-tight">
          {listing.title || listing.coinName || 'Untitled'}
        </p>
        {listing.grade && (
          <span className="inline-block bg-[#2A2A2A] text-gray-300 text-[10px] font-body px-2 py-0.5 rounded-full">
            {listing.grade}
          </span>
        )}
        <p className="text-[#D4A017] font-bold font-body text-sm">
          {formatCurrency(listing.price || listing.askingPrice)}
        </p>

        {/* Seller */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#2A2A2A]">
          <div className="w-5 h-5 rounded-full bg-[#D4A017] flex items-center justify-center shrink-0">
            <span className="text-black text-[8px] font-bold">{initials}</span>
          </div>
          <span className="text-gray-500 text-[10px] font-body truncate">{seller.name || 'Seller'}</span>
        </div>
      </div>
    </button>
  )
}

export default function MarketplaceBrowse() {
  const navigate = useNavigate()

  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const loaderRef = useRef(null)

  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    grade: '',
    country: '',
    denomination: '',
  })

  const fetchListings = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setIsLoading(true)
    else setIsLoadingMore(true)
    setError(null)

    try {
      const params = { page: pageNum, limit: 20 }
      if (search) params.search = search
      if (filters.priceMin) params.priceMin = filters.priceMin
      if (filters.priceMax) params.priceMax = filters.priceMax
      if (filters.grade) params.grade = filters.grade
      if (filters.country) params.country = filters.country
      if (filters.denomination) params.denomination = filters.denomination

      const res = await marketplaceAPI.getListings(params)
      const data = res.data.listings || res.data || []
      const total = res.data.total || data.length

      if (append) {
        setListings((prev) => [...prev, ...data])
      } else {
        setListings(data)
      }
      setHasMore(pageNum * 20 < total)
    } catch (err) {
      setError('Failed to load marketplace.')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [search, filters])

  useEffect(() => {
    setPage(1)
    fetchListings(1, false)
  }, [fetchListings])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchListings(nextPage, true)
    }
  }, [isLoadingMore, hasMore, page, fetchListings])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  // Split listings into two columns for masonry
  const leftCol = listings.filter((_, i) => i % 2 === 0)
  const rightCol = listings.filter((_, i) => i % 2 !== 0)

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 bg-[#0F0F0F] z-10 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-display font-bold text-2xl">Marketplace</h1>
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
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search coins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { label: 'Under $50', action: () => setFilters(f => ({ ...f, priceMax: '50' })) },
            { label: '$50-$200', action: () => setFilters(f => ({ ...f, priceMin: '50', priceMax: '200' })) },
            { label: 'MS Grade', action: () => setFilters(f => ({ ...f, grade: 'MS' })) },
            { label: 'US Coins', action: () => setFilters(f => ({ ...f, country: 'United States' })) },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={chip.action}
              className="shrink-0 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-3 py-1.5 text-xs font-body text-gray-400 active:bg-[#D4A017] active:text-black active:border-[#D4A017] transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mx-4 mb-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium font-body text-sm">Filters</h3>
            <button
              onClick={() => setFilters({ priceMin: '', priceMax: '', grade: '', country: '', denomination: '' })}
              className="text-[#D4A017] text-xs font-body"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400 text-xs font-body mb-1 block">Min Price</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  value={filters.priceMin}
                  onChange={(e) => setFilters(f => ({ ...f, priceMin: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl pl-6 pr-2 py-2 text-white text-xs font-body focus:outline-none focus:border-[#D4A017]"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-body mb-1 block">Max Price</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  value={filters.priceMax}
                  onChange={(e) => setFilters(f => ({ ...f, priceMax: e.target.value }))}
                  placeholder="Any"
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl pl-6 pr-2 py-2 text-white text-xs font-body focus:outline-none focus:border-[#D4A017]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1 block">Grade</label>
            <input
              type="text"
              placeholder="e.g. MS-65"
              value={filters.grade}
              onChange={(e) => setFilters(f => ({ ...f, grade: e.target.value }))}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-white text-xs font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs font-body mb-1 block">Country</label>
            <input
              type="text"
              placeholder="e.g. United States"
              value={filters.country}
              onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))}
              className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-white text-xs font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
            />
          </div>
        </div>
      )}

      {/* Listings grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} variant="coin-card" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-red-400 font-body text-sm mb-3">{error}</p>
            <button
              onClick={() => fetchListings(1)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2 text-white text-sm font-body"
            >
              Try Again
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">🏪</span>
            <p className="text-white font-body font-medium mb-1">No listings found</p>
            <p className="text-gray-500 font-body text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-2">
              {leftCol.map((l) => (
                <ListingCard
                  key={l._id || l.id}
                  listing={l}
                  onClick={() => navigate(`/marketplace/${l._id || l.id}`)}
                />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-2 mt-4">
              {rightCol.map((l) => (
                <ListingCard
                  key={l._id || l.id}
                  listing={l}
                  onClick={() => navigate(`/marketplace/${l._id || l.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="h-4 mt-2" />
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* FAB: List a Coin */}
      <button
        onClick={() => navigate('/marketplace/create')}
        className="fixed bottom-24 right-4 bg-[#D4A017] text-black font-bold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-[#D4A017]/30 active:scale-95 transition-transform z-30"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span className="font-body text-sm">List a Coin</span>
      </button>
    </div>
  )
}
