import { getRarityBorderClass } from '../../utils/helpers'
import { formatCurrency } from '../../utils/helpers'

export default function CoinCard({ coin, onClick }) {
  const borderClass = getRarityBorderClass(coin?.rarityTier || coin?.rarity_tier)

  const imageUrl = coin?.imageUrl || coin?.image_url || coin?.photos?.[0]

  return (
    <button
      onClick={onClick}
      className={[
        'bg-[#1A1A1A] rounded-xl overflow-hidden border-2 w-full text-left',
        'active:scale-[0.97] transition-transform focus:outline-none',
        borderClass,
      ].join(' ')}
    >
      {/* Image */}
      <div className="aspect-square w-full overflow-hidden bg-[#222222] flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={coin?.name || 'Coin'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl select-none">🪙</span>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-0.5">
        <p className="text-white text-xs font-medium font-body leading-tight line-clamp-1">
          {coin?.name || 'Unknown Coin'}
        </p>
        <p className="text-gray-500 text-[10px] font-body">
          {coin?.year} {coin?.denomination ? `· ${coin.denomination}` : ''}
        </p>
        {(coin?.estimatedValue != null || coin?.estimated_value != null) && (
          <p className="text-[#D4A017] text-xs font-bold font-body mt-1">
            {formatCurrency(coin.estimatedValue ?? coin.estimated_value)}
          </p>
        )}
      </div>
    </button>
  )
}
