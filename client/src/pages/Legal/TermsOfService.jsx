import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'June 8, 2025'
const CONTACT_EMAIL = 'support@coinvault.app'
const APP_NAME = 'CoinVault'

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-white font-bold font-display text-base mb-2">{title}</h2>
      <div className="text-gray-400 text-sm font-body leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

export default function TermsOfService() {
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
        <h1 className="text-white font-display font-bold text-lg">Terms of Service</h1>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <p className="text-gray-500 text-xs font-body mb-6">Last updated: {LAST_UPDATED}</p>

        <Section title="Acceptance of Terms">
          <p>
            By downloading, installing, or using {APP_NAME} ("the App," "Service," "we," "us," or
            "our"), you agree to be bound by these Terms of Service. If you do not agree to these
            terms, do not use the Service.
          </p>
        </Section>

        <Section title="Description of Service">
          <p>
            {APP_NAME} is an AI-powered coin identification and collection management application.
            The Service includes coin scanning via AI image analysis, personal collection tracking,
            a peer-to-peer marketplace, community features, and optional subscription plans.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            You must be at least 13 years old to use {APP_NAME}. By using the Service, you
            represent that you meet this requirement. Users under 18 should have parental consent.
          </p>
        </Section>

        <Section title="User Accounts">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must provide accurate and current information when registering.</li>
            <li>You may not share your account or create multiple accounts.</li>
            <li>You may delete your account at any time via Settings → Delete Account.</li>
          </ul>
        </Section>

        <Section title="Subscriptions and Payments">
          <p>
            {APP_NAME} offers free and paid subscription tiers (Pro and Expert). Paid features
            require an active subscription.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-gray-300">Web subscriptions</strong> are processed by Stripe
              and renew automatically unless cancelled.
            </li>
            <li>
              <strong className="text-gray-300">iOS subscriptions</strong> are processed by Apple
              and managed through your Apple ID. Cancel anytime in iPhone Settings → Subscriptions.
            </li>
            <li>
              <strong className="text-gray-300">Android subscriptions</strong> are processed by
              Google Play. Cancel anytime in the Play Store → Subscriptions.
            </li>
            <li>Subscription fees are non-refundable except as required by applicable law or platform policy.</li>
            <li>We reserve the right to change pricing with 30 days' notice.</li>
          </ul>
        </Section>

        <Section title="AI Coin Identification">
          <p>
            The coin identification feature uses AI image analysis and is provided for informational
            purposes only. Identifications, grades, and valuations are estimates and should not be
            relied upon for financial, insurance, or legal decisions. We make no warranty as to the
            accuracy of AI-generated identifications.
          </p>
        </Section>

        <Section title="Marketplace">
          <p>
            {APP_NAME} provides a platform for users to list and purchase coins from other users.
            We are not a party to any transaction between users and do not guarantee the quality,
            authenticity, or legality of listed items.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Sellers are responsible for accurate descriptions and timely fulfillment.</li>
            <li>Buyers are responsible for reviewing listings before purchase.</li>
            <li>Disputes between buyers and sellers are the parties' responsibility to resolve.</li>
            <li>We reserve the right to remove any listing that violates these Terms.</li>
          </ul>
        </Section>

        <Section title="User Content">
          <p>
            By submitting content (coin images, posts, messages, listings) to {APP_NAME}, you grant
            us a non-exclusive, worldwide, royalty-free license to use, store, and display that
            content solely to operate the Service.
          </p>
          <p>You agree not to post content that is:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Illegal, fraudulent, or misleading</li>
            <li>Infringing on third-party intellectual property rights</li>
            <li>Harassing, abusive, or threatening</li>
            <li>Spam or unsolicited commercial messages</li>
          </ul>
        </Section>

        <Section title="Prohibited Conduct">
          <p>You may not:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Reverse-engineer, decompile, or attempt to extract source code</li>
            <li>Use automated bots or scrapers on the Service</li>
            <li>Circumvent any security or authentication measures</li>
            <li>Use the Service for any illegal purpose</li>
            <li>Impersonate another person or entity</li>
            <li>Interfere with or disrupt the Service infrastructure</li>
          </ul>
        </Section>

        <Section title="Intellectual Property">
          <p>
            The {APP_NAME} name, logo, interface design, and all software are owned by us and
            protected by intellectual property laws. Nothing in these Terms grants you ownership
            of any {APP_NAME} intellectual property.
          </p>
        </Section>

        <Section title="Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
            ERROR-FREE, OR THAT ANY SPECIFIC RESULTS WILL BE OBTAINED FROM USE OF THE SERVICE.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {APP_NAME.toUpperCase()} SHALL NOT BE LIABLE
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF
            PROFITS OR DATA, ARISING FROM YOUR USE OF THE SERVICE.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            We may suspend or terminate your account at our discretion if you violate these Terms.
            You may terminate your account at any time via the Settings screen. Upon termination,
            your right to use the Service ceases and we may delete your data in accordance with
            our Privacy Policy.
          </p>
        </Section>

        <Section title="Governing Law">
          <p>
            These Terms are governed by the laws of the United States. Any disputes arising from
            these Terms or the Service shall be resolved through binding arbitration, except where
            prohibited by applicable law.
          </p>
        </Section>

        <Section title="Changes to Terms">
          <p>
            We may update these Terms from time to time. We will notify you of significant changes
            by updating the "Last updated" date and, where appropriate, sending a notification
            through the app. Your continued use of the Service after changes constitutes acceptance
            of the updated Terms.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have questions about these Terms of Service, please contact us at:
          </p>
          <p className="text-[#D4A017]">{CONTACT_EMAIL}</p>
        </Section>
      </div>
    </div>
  )
}
