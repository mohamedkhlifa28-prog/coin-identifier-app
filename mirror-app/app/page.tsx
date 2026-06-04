import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in-up max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-[#888888] mb-8">
          Your AI alter ego
        </p>

        <h1 className="text-7xl font-thin tracking-[-0.04em] text-[#f0f0f0] mb-6 leading-none">
          Mirror
        </h1>

        <p className="text-lg text-[#888888] font-light leading-relaxed max-w-lg mx-auto mb-12">
          Mirror learns exactly how you think, write, and see the world.
          The longer you use it, the more it becomes you.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-[#a78bfa] hover:bg-[#9370f5] text-white font-medium rounded-full px-8 py-3.5 text-sm transition-colors"
          >
            Build your Mirror
          </Link>
          <Link
            href="/login"
            className="border border-[#1f1f1f] hover:border-[#333] text-[#f0f0f0] font-light rounded-full px-8 py-3.5 text-sm transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left max-w-3xl mx-auto">
          {[
            {
              title: 'Learns your voice',
              desc: 'Through questions, writing samples, and every conversation.',
            },
            {
              title: 'Quotes you back',
              desc: 'References things you said months ago to make a point or call out a contradiction.',
            },
            {
              title: 'Gets more accurate',
              desc: 'Every session improves the Mirror. Leaving feels like abandoning yourself.',
            },
          ].map((item) => (
            <div key={item.title} className="border border-[#1f1f1f] rounded-xl p-6">
              <h3 className="text-sm font-medium text-[#a78bfa] mb-2">{item.title}</h3>
              <p className="text-sm text-[#888888] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
