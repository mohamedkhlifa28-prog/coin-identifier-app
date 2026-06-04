import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send, MessageCircle } from 'lucide-react'
import { messagesAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { getInitials, timeAgo } from '../../utils/helpers'

function ConversationList({ conversations, onSelect }) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <MessageCircle size={48} className="text-gray-600 mb-4" />
        <p className="text-white font-body font-medium mb-1">No messages yet</p>
        <p className="text-gray-500 text-sm font-body">Message a seller from any listing page</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#2A2A2A]">
      {conversations.map((conv) => (
        <button
          key={conv.other_user_id}
          onClick={() => onSelect(conv.other_user_id, conv.other_user_name)}
          className="w-full flex items-center gap-3 px-4 py-4 active:bg-[#1A1A1A] transition-colors text-left"
        >
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#D4A017]/20 flex items-center justify-center">
              <span className="text-[#D4A017] font-bold text-sm font-body">{getInitials(conv.other_user_name)}</span>
            </div>
            {conv.unread_count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#D4A017] rounded-full text-[10px] text-black font-bold flex items-center justify-center">
                {conv.unread_count > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className={`text-sm font-body font-semibold truncate ${conv.unread_count > 0 ? 'text-white' : 'text-gray-300'}`}>
                {conv.other_user_name}
              </p>
              <span className="text-gray-600 text-[10px] font-body flex-shrink-0 ml-2">
                {timeAgo(conv.last_message_at)}
              </span>
            </div>
            <p className={`text-xs font-body truncate ${conv.unread_count > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
              {conv.last_sender_id !== conv.other_user_id ? 'You: ' : ''}{conv.last_message}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

function MessageThread({ userId, userName, currentUserId, listingId, onBack }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await messagesAPI.getMessages(userId)
      setMessages(res.data.messages || [])
    } catch (_) {}
    finally { setIsLoading(false) }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || isSending) return
    const content = text.trim()
    setText('')
    setIsSending(true)
    try {
      const res = await messagesAPI.sendMessage(userId, content, listingId || undefined)
      setMessages((prev) => [...prev, res.data.message])
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to send message')
      setText(content)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0F0F0F]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-[#2A2A2A] px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#D4A017]/20 flex items-center justify-center">
          <span className="text-[#D4A017] text-xs font-bold font-body">{getInitials(userName)}</span>
        </div>
        <p className="text-white font-body font-semibold text-base">{userName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-4 pb-24 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm font-body">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-[#D4A017] text-black rounded-br-sm'
                      : 'bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm font-body leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] font-body mt-1 ${isMe ? 'text-black/60' : 'text-gray-500'}`}>
                    {timeAgo(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/95 to-transparent z-30">
        <div className="flex gap-2 items-end">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a message..."
            className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="w-11 h-11 bg-[#D4A017] rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          >
            <Send size={18} className="text-black" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const { userId: routeUserId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [conversations, setConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [threadUser, setThreadUser] = useState(
    routeUserId ? { id: routeUserId, name: searchParams.get('name') || 'User' } : null
  )

  const listingId = searchParams.get('listingId')

  useEffect(() => {
    if (!routeUserId) {
      messagesAPI.getConversations()
        .then((res) => setConversations(res.data.conversations || []))
        .catch(() => {})
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [routeUserId])

  const handleSelectConversation = (userId, userName) => {
    setThreadUser({ id: userId, name: userName })
    navigate(`/messages/${userId}`)
  }

  const handleBack = () => {
    if (routeUserId) {
      navigate('/messages')
      setThreadUser(null)
    } else {
      navigate(-1)
    }
  }

  if (threadUser) {
    return (
      <MessageThread
        userId={threadUser.id}
        userName={threadUser.name}
        currentUserId={user?.id}
        listingId={listingId}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-24">
      <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-[#2A2A2A] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="text-white font-display font-bold text-lg">Messages</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ConversationList conversations={conversations} onSelect={handleSelectConversation} />
      )}
    </div>
  )
}
