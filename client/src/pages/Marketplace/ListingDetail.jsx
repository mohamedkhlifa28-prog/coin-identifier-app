import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MessageCircle, Check, X } from 'lucide-react'
import { marketplaceAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, getInitials, timeAgo } from '../../utils/helpers'
import RarityBadge from '../../components/UI/RarityBadge'

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [listing, setListing] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [isWatchlisted, setIsWatchlisted] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [isMakingOffer, setIsMakingOffer] = useState(false)
  const [offerSuccess, setOfferSuccess] = useState(false)
  const [showOfferForm, setShowOfferForm] = useState(false)

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await marketplaceAPI.getListing(id)
        const data = res.data.listing || res.data
        setListing(data)
        setIsWatchlisted(data.isWatchlisted || false)
      } catch (err) {
        setError('Failed to load listing.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchListing()
  }, [id])

  const handleToggleWatchlist = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    try {
      await marketplaceAPI.toggleWatchlist(id)
      setIsWatchlisted((v) => !v)
    } catch (err) {
      console.error('Watchlist error:', err)
    }
  }, [id, isAuthenticated, navigate])

  const handleMakeOffer = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    if (!offerPrice || isNaN(Number(offerPrice))) {
      alert('Please enter a valid offer price.')
      return
    }
    setIsMakingOffer(true)
    try {
      await marketplaceAPI.makeOffer(id, {
        amount: Number(offerPrice),
        message: offerMessage,
      })
      setOfferSuccess(true)
      setShowOfferForm(false)
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to make offer.')
    } finally {
      setIsMakingOffer(false)
    }
  }, [id, offerPrice, offerMessage, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center text-center px-8">
        <p className="text-red-400 font-body mb-4">{error || 'Listing not found'}</p>
        <button onClick={() => navigate(-1)} className="text-[#D4A017] font-body">Go Back</button>
      </div>
    )
  }

  const seller = listing.seller || {}
  const photos = listing.photos || (listing.imageUrl ? [listing.imageUrl] : [])
  const isOwner = user && (user._id === seller._id || user.id === seller.id)
  const offers = listing.offers || []

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <button
          onClick={handleToggleWatchlist}
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Heart
            size={18}
            className={isWatchlisted ? 'text-red-400 fill-red-400' : 'text-gray-400'}
          />
        </button>
      </div>

      {/* Photos */}
      <div className="mb-4">
        <div className="w-full aspect-square bg-[#1A1A1A] overflow-hidden">
          {photos.length > 0 ? (
            <img
              src={photos[selectedPhoto]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">🪙</span>
            </div>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 px-4 mt-2 overflow-x-auto scrollbar-none">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedPhoto(i)}
                className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 ${i === selectedPhoto ? 'border-[#D4A017]' : 'border-transparent'}`}
              >
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 space-y-4">
        {/* Title + Price */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-white text-xl font-bold font-display leading-tight flex-1">
              {listing.title || listing.coinName}
            </h1>
            <p className="text-[#D4A017] text-2xl font-bold font-body shrink-0">
              {formatCurrency(listing.price || listing.askingPrice)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {listing.grade && (
              <span className="bg-[#2A2A2A] text-gray-300 text-xs font-body px-2 py-0.5 rounded-full">
                {listing.grade}
              </span>
            )}
            {listing.rarityTier && <RarityBadge tier={listing.rarityTier} size="sm" />}
            {listing.year && (
              <span className="text-gray-500 text-xs font-body">{listing.year}</span>
            )}
          </div>
        </div>

        {/* Seller */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#D4A017] flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-sm">{getInitials(seller.name || 'U')}</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-medium font-body text-sm">{seller.name || 'Unknown Seller'}</p>
            {seller.level && (
              <p className="text-gray-500 text-xs font-body">Level {seller.level}</p>
            )}
            {listing.createdAt && (
              <p className="text-gray-600 text-xs font-body">Listed {timeAgo(listing.createdAt)}</p>
            )}
          </div>
          <button className="flex items-center gap-1.5 bg-[#2A2A2A] rounded-xl px-3 py-2">
            <MessageCircle size={14} className="text-gray-400" />
            <span className="text-gray-400 text-xs font-body">Message</span>
          </button>
        </div>

        {/* Coin details */}
        {(listing.country || listing.composition || listing.denomination) && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <h3 className="text-white font-bold font-body text-sm mb-3">Coin Details</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {[
                ['Country', listing.country],
                ['Year', listing.year],
                ['Denomination', listing.denomination],
                ['Composition', listing.composition],
                ['Diameter', listing.diameter ? `${listing.diameter}mm` : null],
                ['Weight', listing.weight ? `${listing.weight}g` : null],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label}>
                    <p className="text-gray-500 text-xs font-body">{label}</p>
                    <p className="text-white text-sm font-medium font-body">{value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <h3 className="text-white font-bold font-body text-sm mb-2">Description</h3>
            <p className="text-gray-400 text-sm font-body leading-relaxed">{listing.description}</p>
          </div>
        )}

        {/* Offer success */}
        {offerSuccess && (
          <div className="bg-green-900/30 border border-green-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
            <Check size={16} className="text-green-400" />
            <p className="text-green-400 text-sm font-body">Offer sent successfully!</p>
          </div>
        )}

        {/* Make Offer form */}
        {showOfferForm && !isOwner && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 space-y-3 animate-fade-in">
            <h3 className="text-white font-bold font-body text-sm">Make an Offer</h3>
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Your Offer Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder={String(Math.round((listing.price || listing.askingPrice || 0) * 0.9))}
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl pl-8 pr-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#D4A017]"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-body mb-1.5 block">Message (optional)</label>
              <textarea
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Add a message to the seller..."
                rows={2}
                className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017] resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowOfferForm(false)}
                className="flex-1 bg-[#2A2A2A] text-gray-300 font-medium py-3 rounded-xl font-body text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeOffer}
                disabled={isMakingOffer}
                className="flex-1 bg-[#D4A017] text-black font-bold py-3 rounded-xl font-body text-sm disabled:opacity-60"
              >
                {isMakingOffer ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </div>
        )}

        {/* Seller: offers received */}
        {isOwner && offers.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <h3 className="text-white font-bold font-body text-sm mb-3">
              Offers Received ({offers.length})
            </h3>
            <div className="space-y-3">
              {offers.map((offer, i) => (
                <div
                  key={offer._id || i}
                  className="flex items-center justify-between bg-[#2A2A2A] rounded-xl p-3"
                >
                  <div>
                    <p className="text-[#D4A017] font-bold font-body text-sm">
                      {formatCurrency(offer.price)}
                    </p>
                    <p className="text-gray-500 text-xs font-body">
                      {offer.buyerName || 'Buyer'} · {timeAgo(offer.createdAt)}
                    </p>
                    {offer.message && (
                      <p className="text-gray-400 text-xs font-body mt-0.5 italic">"{offer.message}"</p>
                    )}
                  </div>
                  {offer.status === 'pending' && (
                    <div className="flex gap-2">
                      <button className="w-8 h-8 bg-green-800/50 border border-green-700/50 rounded-lg flex items-center justify-center">
                        <Check size={14} className="text-green-400" />
                      </button>
                      <button className="w-8 h-8 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center justify-center">
                        <X size={14} className="text-red-400" />
                      </button>
                    </div>
                  )}
                  {offer.status && offer.status !== 'pending' && (
                    <span className={`text-xs font-body capitalize ${offer.status === 'accepted' ? 'text-green-400' : 'text-red-400'}`}>
                      {offer.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom buttons */}
      {!isOwner && !offerSuccess && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/95 to-transparent z-30">
          <div className="flex gap-3">
            <button
              onClick={() => setShowOfferForm(true)}
              disabled={showOfferForm}
              className="flex-1 bg-[#1A1A1A] border border-[#D4A017] text-[#D4A017] font-bold py-4 rounded-xl font-body text-sm disabled:opacity-50"
            >
              Make Offer
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/auth/login')
                  return
                }
                alert('Stripe checkout coming soon')
              }}
              className="flex-1 bg-[#D4A017] text-black font-bold py-4 rounded-xl font-body text-sm active:scale-[0.98] transition-transform"
            >
              Buy Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
