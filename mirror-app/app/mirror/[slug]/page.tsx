import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { SharedMirrorClient } from '@/components/SharedMirrorClient'

type Props = { params: Promise<{ slug: string }> }

export default async function SharedMirrorPage({ params }: Props) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: share } = await supabase
    .from('shared_mirrors')
    .select('id, user_id, is_active, views')
    .eq('slug', slug)
    .single()

  if (!share || !share.is_active) notFound()

  // Increment view count
  await supabase
    .from('shared_mirrors')
    .update({ views: (share.views ?? 0) + 1 })
    .eq('id', share.id)

  const { data: owner } = await supabase
    .from('users')
    .select('name')
    .eq('id', share.user_id)
    .single()

  return (
    <SharedMirrorClient
      slug={slug}
      ownerName={owner?.name ?? 'Someone'}
    />
  )
}
