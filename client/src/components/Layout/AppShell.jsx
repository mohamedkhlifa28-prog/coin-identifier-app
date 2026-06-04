import { useAuth } from '../../hooks/useAuth'
import BottomNav from './BottomNav'
import XPPopup from '../UI/XPPopup'

export default function AppShell({ children }) {
  const { xpPopup, hideXP } = useAuth()

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#0F0F0F] relative">
      <div className="pb-20">
        {children}
      </div>
      <BottomNav />
      {xpPopup.show && (
        <XPPopup
          amount={xpPopup.amount}
          reason={xpPopup.reason}
          onComplete={hideXP}
        />
      )}
    </div>
  )
}
