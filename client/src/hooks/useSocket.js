import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './useAuth'

export function useSocket() {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!user?._id && !user?.id) return

    const userId = user._id || user.id

    const socket = io('http://localhost:3001', {
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('authenticate', { userId })
    })

    socket.on('notification', (notification) => {
      setNotifications((prev) => [{ ...notification, read: false, id: Date.now() }, ...prev])
    })

    socket.on('disconnect', () => {
      // handle gracefully
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?._id, user?.id])

  const markRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  return {
    socket: socketRef.current,
    notifications,
    markRead,
    markAllRead,
    unreadCount: notifications.filter((n) => !n.read).length,
  }
}
