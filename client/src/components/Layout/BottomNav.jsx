import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, Grid3X3, Tag, Users, User } from 'lucide-react'
import { useSocket } from '../../hooks/useSocket'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { unreadCount } = useSocket()

  const tabs = [
    {
      id: 'collection',
      label: 'Collection',
      icon: Grid3X3,
      path: '/collection',
    },
    {
      id: 'market',
      label: 'Market',
      icon: Tag,
      path: '/marketplace',
    },
    {
      id: 'scan',
      label: 'Scan',
      icon: Camera,
      path: '/scan',
      center: true,
    },
    {
      id: 'community',
      label: 'Community',
      icon: Users,
      path: '/community',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      badge: unreadCount > 0,
    },
  ]

  const isActive = (path) => {
    if (path === '/scan') {
      return location.pathname === '/scan' || location.pathname === '/scan/result'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 safe-bottom">
      <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] px-2 pt-2 pb-4">
        <div className="flex items-end justify-around">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            const Icon = tab.icon

            if (tab.center) {
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className="flex flex-col items-center -mt-5 focus:outline-none"
                  aria-label="Scan"
                >
                  <div
                    className={[
                      'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95',
                      active
                        ? 'bg-[#E8B820] shadow-[#D4A017]/40'
                        : 'bg-[#D4A017] shadow-[#D4A017]/30',
                    ].join(' ')}
                  >
                    <Icon size={24} className="text-black" strokeWidth={2.5} />
                  </div>
                  <span
                    className={[
                      'text-[10px] mt-1 font-medium font-body',
                      active ? 'text-[#D4A017]' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {tab.label}
                  </span>
                </button>
              )
            }

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 px-3 pt-1 pb-0 focus:outline-none relative transition-colors"
                aria-label={tab.label}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    className={[
                      'transition-colors',
                      active ? 'text-[#D4A017]' : 'text-gray-500',
                    ].join(' ')}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                <span
                  className={[
                    'text-[10px] font-medium font-body',
                    active ? 'text-[#D4A017]' : 'text-gray-500',
                  ].join(' ')}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
