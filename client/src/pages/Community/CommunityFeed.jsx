import { useState, useEffect, useCallback } from 'react'
import { Heart, MessageCircle, Plus, Trophy, Flame, X, Send } from 'lucide-react'
import { feedAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import SkeletonCard from '../../components/UI/SkeletonCard'
import { timeAgo, getInitials, formatCurrency } from '../../utils/helpers'

const POST_TYPES = ['showcase', 'graded', 'error', 'crh']
const POST_TYPE_LABELS = {
  showcase: '🪙 Found this today!',
  graded: '⭐ Just had it graded!',
  error: '🔍 Error coin spotted!',
  crh: '🎰 CRH find!',
}

function WeeklyChallenge({ challenge }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!challenge) return
    const tick = () => {
      const now = new Date()
      const end = new Date(challenge.endsAt || challenge.endDate)
      const diff = end - now
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${d}d ${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [challenge])

  if (!challenge) return null

  return (
    <div className="mx-4 mb-4 bg-gradient-to-r from-[#D4A017]/20 to-[#A67C00]/20 border border-[#D4A017]/40 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={16} className="text-[#D4A017]" />
        <span className="text-[#D4A017] text-xs font-body font-semibold uppercase tracking-wide">Weekly Challenge</span>
      </div>
      <p className="text-white font-display font-bold text-base">{challenge.title}</p>
      <p className="text-gray-400 text-xs font-body mt-1">{challenge.description}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="bg-[#D4A017]/20 text-[#D4A017] text-xs font-body px-2.5 py-1 rounded-full">{challenge.prize}</span>
        <div className="flex items-center gap-1.5">
          <Flame size={12} className="text-orange-400" />
          <span className="text-gray-400 text-xs font-body">{timeLeft} left</span>
        </div>
      </div>
    </div>
  )
}

function PostCard({ post, onLike, onComment }) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)

  const handleLike = async () => {
    setIsLiked((v) => !v)
    setLikeCount((c) => isLiked ? c - 1 : c + 1)
    try {
      await feedAPI.likePost(post.id)
    } catch (_) {
      setIsLiked((v) => !v)
      setLikeCount((c) => isLiked ? c + 1 : c - 1)
    }
  }

  const coinData = typeof post.coin_data === 'string'
    ? (() => { try { return JSON.parse(post.coin_data) } catch { return {} } })()
    : (post.coin_data || {})

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden mb-4 mx-4">
      {/* Post header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-[#D4A017]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[#D4A017] font-bold text-xs font-body">{getInitials(post.user_name || 'U')}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-body font-semibold truncate">{post.user_name}</span>
            <span className="bg-[#D4A017]/20 text-[#D4A017] text-xs font-body px-1.5 py-0.5 rounded-full flex-shrink-0">
              {post.user_level || 'Novice'}
            </span>
          </div>
          <span className="text-gray-500 text-xs font-body">{timeAgo(post.created_at)}</span>
        </div>
        <span className="text-xs font-body text-gray-500 bg-[#2A2A2A] px-2 py-1 rounded-full flex-shrink-0">
          {POST_TYPE_LABELS[post.type] || post.type}
        </span>
      </div>

      {/* Coin image */}
      {post.image_url && (
        <div className="w-full aspect-square bg-[#0F0F0F] flex items-center justify-center overflow-hidden">
          <img src={post.image_url} alt="coin" className="w-full h-full object-contain" />
        </div>
      )}
      {!post.image_url && (
        <div className="w-full aspect-video bg-[#0F0F0F] flex items-center justify-center">
          <span className="text-7xl">🪙</span>
        </div>
      )}

      {/* Post content */}
      <div className="px-4 py-3">
        {/* Coin name chip */}
        {coinData.name && (
          <p className="text-[#D4A017] text-xs font-body font-semibold mb-1.5">{coinData.name}</p>
        )}

        {/* Caption */}
        {post.content && (
          <p className="text-gray-200 text-sm font-body leading-relaxed mb-2">{post.content}</p>
        )}

        {/* Value tag */}
        {post.estimated_value > 0 && (
          <div className="inline-flex items-center gap-1 bg-[#D4A017]/10 border border-[#D4A017]/30 text-[#D4A017] text-xs font-body px-2.5 py-1 rounded-full mb-3">
            Est. {formatCurrency(post.estimated_value)}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-400' : 'text-gray-500'}`}
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            <span className="text-xs font-body">{likeCount}</span>
          </button>
          <button
            onClick={() => onComment && onComment(post)}
            className="flex items-center gap-1.5 text-gray-500 active:text-[#D4A017] transition-colors"
          >
            <MessageCircle size={18} />
            <span className="text-xs font-body">{post.comments_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CommunityFeed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [challenge, setChallenge] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)

  const [newPost, setNewPost] = useState({ type: 'showcase', content: '', estimated_value: '' })
  const [isPosting, setIsPosting] = useState(false)

  const [commentingPost, setCommentingPost] = useState(null)
  const [comments, setComments] = useState([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const loadFeed = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setIsLoading(true)
    try {
      const [feedRes, challengeRes] = await Promise.allSettled([
        feedAPI.getFeed({ page: pageNum, limit: 10 }),
        feedAPI.getFeed({ page: pageNum, limit: 10 }).then(() => fetch('/api/feed/weekly-challenge').then(r => r.json())),
      ])

      if (feedRes.status === 'fulfilled') {
        const newPosts = feedRes.value.data.posts || []
        setPosts((prev) => pageNum === 1 ? newPosts : [...prev, ...newPosts])
        setHasMore(newPosts.length === 10)
      }
    } catch (err) {
      console.error('Failed to load feed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeed(1)

    // Load weekly challenge
    fetch('/api/feed/weekly-challenge')
      .then((r) => r.json())
      .then((data) => setChallenge(data.challenge))
      .catch(() => {})
  }, [loadFeed])

  const handleOpenComments = useCallback(async (post) => {
    setCommentingPost(post)
    setComments([])
    setCommentText('')
    setIsLoadingComments(true)
    try {
      const res = await feedAPI.getPost(post.id)
      setComments(res.data.comments || [])
    } catch {
      setComments([])
    } finally {
      setIsLoadingComments(false)
    }
  }, [])

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !commentingPost) return
    setIsSubmittingComment(true)
    try {
      const res = await feedAPI.addComment(commentingPost.id, commentText.trim())
      const newComment = res.data.comment
      if (newComment) {
        setComments((prev) => [...prev, newComment])
        setPosts((prev) => prev.map((p) =>
          p.id === commentingPost.id
            ? { ...p, comments_count: (p.comments_count || 0) + 1 }
            : p
        ))
      }
      setCommentText('')
    } catch {
      alert('Failed to post comment.')
    } finally {
      setIsSubmittingComment(false)
    }
  }, [commentText, commentingPost])

  const handleCreatePost = async () => {
    if (!newPost.content.trim()) return
    setIsPosting(true)
    try {
      const res = await feedAPI.createPost({
        type: newPost.type,
        content: newPost.content,
        estimated_value: newPost.estimated_value ? parseFloat(newPost.estimated_value) : null,
      })
      const createdPost = res.data.post
      if (createdPost) {
        setPosts((prev) => [{
          ...createdPost,
          user_name: user?.name,
          user_level: user?.level,
        }, ...prev])
      }
      setNewPost({ type: 'showcase', content: '', estimated_value: '' })
      setShowNewPost(false)
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-24 overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-[#2A2A2A] px-4 py-4">
        <h1 className="text-xl font-bold font-display text-white">Community</h1>
      </div>

      <div className="pt-4">
        {/* Weekly Challenge */}
        <WeeklyChallenge challenge={challenge} />

        {/* Feed */}
        {isLoading ? (
          <div className="px-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} variant="post" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <span className="text-6xl mb-4">💬</span>
            <h3 className="text-white font-display font-bold text-lg mb-2">No Posts Yet</h3>
            <p className="text-gray-500 text-sm font-body mb-6">Be the first to share your coin finds!</p>
            <button
              onClick={() => setShowNewPost(true)}
              className="bg-[#D4A017] text-black font-bold px-6 py-3 rounded-xl font-body"
            >
              Share a Find
            </button>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onComment={handleOpenComments} />
            ))}
            {hasMore && (
              <button
                onClick={() => { const next = page + 1; setPage(next); loadFeed(next) }}
                className="w-full py-4 text-[#D4A017] text-sm font-body"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-t-2xl w-full max-w-[430px] mx-auto p-4 pb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-display font-bold text-lg">New Post</h3>
              <button onClick={() => setShowNewPost(false)} className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Post type */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-3">
              {POST_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setNewPost((p) => ({ ...p, type: t }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-body whitespace-nowrap transition-colors ${
                    newPost.type === t ? 'bg-[#D4A017] text-black font-bold' : 'bg-[#2A2A2A] text-gray-400'
                  }`}
                >
                  {POST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
              placeholder="Tell the community about your find..."
              rows={4}
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#D4A017] resize-none mb-3"
            />

            <input
              type="number"
              step="0.01"
              value={newPost.estimated_value}
              onChange={(e) => setNewPost((p) => ({ ...p, estimated_value: e.target.value }))}
              placeholder="Estimated value (optional)"
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#D4A017] mb-4"
            />

            <button
              onClick={handleCreatePost}
              disabled={isPosting || !newPost.content.trim()}
              className="w-full bg-[#D4A017] text-black font-bold py-3.5 rounded-xl font-body disabled:opacity-60"
            >
              {isPosting ? 'Posting...' : 'Share Post'}
            </button>
          </div>
        </div>
      )}

      {/* Comments sheet */}
      {commentingPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-t-2xl w-full max-w-[430px] mx-auto flex flex-col" style={{ maxHeight: '75vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
              <h3 className="text-white font-display font-bold text-base">Comments</h3>
              <button onClick={() => setCommentingPost(null)} className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-none">
              {isLoadingComments ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 text-sm font-body text-center py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((c, i) => (
                  <div key={c.id || i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D4A017]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#D4A017] text-xs font-bold font-body">{(c.author_name || 'U').charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 bg-[#0F0F0F] rounded-xl px-3 py-2">
                      <p className="text-[#D4A017] text-xs font-body font-semibold mb-0.5">{c.author_name || 'User'}</p>
                      <p className="text-gray-300 text-sm font-body leading-snug">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-[#2A2A2A] flex gap-3 items-center">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-white text-sm font-body placeholder-gray-600 focus:outline-none focus:border-[#D4A017]"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || isSubmittingComment}
                className="w-10 h-10 bg-[#D4A017] rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
              >
                <Send size={16} className="text-black" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowNewPost(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-[#D4A017] rounded-full flex items-center justify-center shadow-2xl shadow-[#D4A017]/40 active:scale-95 transition-transform"
      >
        <Plus size={24} className="text-black" strokeWidth={2.5} />
      </button>
    </div>
  )
}
