import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'June 8, 2025'
const CONTACT_EMAIL = 'privacy@coinvault.app'
const APP_NAME = 'CoinVault'

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-white font-bold font-display text-base mb-2">{title}</h2>
      <div className="text-gray-400 text-sm font-body leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-12">
      <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-[#2A2A2A] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="text-white font-display font-bold text-lg">Privacy Policy</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <p className="text-gray-500 text-xs font-body mb-6">Last updated: {LAST_UPDATED}</p>

        <Section title="Introduction">
          <p>
            {APP_NAME} ("we," "our," or "us") is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when you
            use our mobile application and website (collectively, the "Service").
          </p>
          <p>
            By using {APP_NAME}, you agree to the collection and use of information in accordance
            with this policy.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p><strong className="text-gray-300">Account Information:</strong> When you register, we collect your name and email address.</p>
          <p><strong className="text-gray-300">Coin Images:</strong> When you scan a coin, the image is sent to our AI provider (Anthropic) for analysis. Images are not stored on our servers after processing unless you choose to add the coin to your collection.</p>
          <p><strong className="text-gray-300">Collection Data:</strong> Coins you add to your collection, including names, grades, values, and personal notes you enter.</p>
          <p><strong className="text-gray-300">Usage Data:</strong> App interactions, scan history, XP earned, and feature usage to improve the service and power the leaderboard.</p>
          <p><strong className="text-gray-300">Payment Information:</strong> Subscription payments are processed by Stripe (web) or Apple/Google (in-app purchases). We do not store your payment card details.</p>
          <p><strong className="text-gray-300">Messages:</strong> Messages you send to other users through the in-app messaging system.</p>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Provide, operate, and maintain the Service</li>
            <li>Identify coins using AI image analysis</li>
            <li>Power your personal collection and marketplace listings</li>
            <li>Process subscription payments</li>
            <li>Send notifications about offers, messages, and badges</li>
            <li>Display leaderboards and community features</li>
            <li>Improve and develop new features</li>
            <li>Respond to customer support requests</li>
          </ul>
        </Section>

        <Section title="Third-Party Services">
          <p>We share data with these third-party providers to operate the Service:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-gray-300">Anthropic</strong> — AI coin identification. Coin images are sent to Anthropic's API for analysis.</li>
            <li><strong className="text-gray-300">Stripe</strong> — Payment processing for web subscriptions.</li>
            <li><strong className="text-gray-300">RevenueCat</strong> — Subscription management for iOS and Android in-app purchases.</li>
            <li><strong className="text-gray-300">Railway</strong> — Cloud hosting for our servers and database.</li>
            <li><strong className="text-gray-300">Apple / Google</strong> — In-app purchase processing on their respective platforms.</li>
          </ul>
          <p>
            Each third party has their own privacy policy governing their use of your data. We
            encourage you to review their policies.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your personal data for as long as your account is active or as needed to
            provide the Service. You can request deletion of your account and associated data at
            any time through the app's Settings screen or by contacting us at {CONTACT_EMAIL}.
          </p>
          <p>
            Coin images submitted for scanning are not retained after the analysis is complete
            unless you explicitly save the coin to your collection.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Export your collection data</li>
            <li>Opt out of non-essential communications</li>
          </ul>
          <p>To exercise these rights, contact us at {CONTACT_EMAIL} or use the "Delete Account" option in the app.</p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            {APP_NAME} is rated 4+ and does not knowingly collect personal information from
            children under 13. If we become aware that a child under 13 has provided us with
            personal information, we will delete it immediately. If you are a parent or guardian
            and believe your child has provided us with personal information, please contact us
            at {CONTACT_EMAIL}.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use industry-standard security measures including HTTPS encryption, hashed
            passwords (bcrypt), and JWT-based authentication. No method of transmission over the
            internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes by updating the "Last updated" date at the top of this page and, where
            appropriate, sending a notification through the app.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have questions or concerns about this Privacy Policy or our data practices,
            please contact us at:
          </p>
          <p className="text-[#D4A017]">{CONTACT_EMAIL}</p>
        </Section>
      </div>
    </div>
  )
}
