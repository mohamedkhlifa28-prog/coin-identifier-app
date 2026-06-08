import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()
export const isIOS = () => Capacitor.getPlatform() === 'ios'
export const isAndroid = () => Capacitor.getPlatform() === 'android'

let _purchases = null

async function getPurchases() {
  if (!isNative()) return null
  if (_purchases) return _purchases
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    _purchases = Purchases
    return _purchases
  } catch {
    return null
  }
}

export async function initPurchases(userId) {
  const purchases = await getPurchases()
  if (!purchases) return

  const apiKey = isIOS()
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY

  if (!apiKey) {
    console.warn('RevenueCat API key not set')
    return
  }

  try {
    await purchases.configure({ apiKey, appUserID: userId })
  } catch (err) {
    console.error('RevenueCat init error:', err)
  }
}

// Returns the current offering or null
export async function getOfferings() {
  const purchases = await getPurchases()
  if (!purchases) return null
  try {
    const { current } = await purchases.getOfferings()
    return current
  } catch {
    return null
  }
}

// tier: 'pro' | 'expert'
export async function purchaseTier(tier) {
  const purchases = await getPurchases()
  if (!purchases) throw new Error('Not available on this platform')

  const offering = await getOfferings()
  if (!offering?.availablePackages?.length) {
    throw new Error('No products available. Check App Store / Play Console setup.')
  }

  // Match package by identifier — configure these in RevenueCat dashboard
  // Convention: package identifiers are 'pro_monthly' and 'expert_monthly'
  const pkg = offering.availablePackages.find((p) =>
    p.identifier === `${tier}_monthly` || p.packageType === 'MONTHLY'
  ) || offering.availablePackages[0]

  const { customerInfo } = await purchases.purchasePackage({ aPackage: pkg })
  return customerInfo
}

export async function restorePurchases() {
  const purchases = await getPurchases()
  if (!purchases) return null
  try {
    const { customerInfo } = await purchases.restorePurchases()
    return customerInfo
  } catch {
    return null
  }
}

// Returns active entitlements, e.g. { pro: true, expert: false }
export async function getActiveSubscriptions() {
  const purchases = await getPurchases()
  if (!purchases) return {}
  try {
    const { customerInfo } = await purchases.getCustomerInfo()
    const entitlements = customerInfo?.entitlements?.active || {}
    return {
      pro: 'pro' in entitlements || 'expert' in entitlements,
      expert: 'expert' in entitlements,
    }
  } catch {
    return {}
  }
}
