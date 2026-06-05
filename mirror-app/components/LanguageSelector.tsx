'use client'

import { useState, useEffect, useRef } from 'react'

export const LANGUAGES = [
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', native: 'Shqip' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan' },
  { code: 'eu', name: 'Basque', native: 'Euskara' },
  { code: 'be', name: 'Belarusian', native: 'Беларуская' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'bs', name: 'Bosnian', native: 'Bosanski' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာဘာသာ' },
  { code: 'ca', name: 'Catalan', native: 'Català' },
  { code: 'ceb', name: 'Cebuano', native: 'Bisaya' },
  { code: 'zh', name: 'Chinese (Simplified)', native: '中文（简体）' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '中文（繁體）' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'eo', name: 'Esperanto', native: 'Esperanto' },
  { code: 'et', name: 'Estonian', native: 'Eesti' },
  { code: 'tl', name: 'Filipino', native: 'Filipino' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'gl', name: 'Galician', native: 'Galego' },
  { code: 'ka', name: 'Georgian', native: 'ქართული' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ht', name: 'Haitian Creole', native: 'Kreyòl Ayisyen' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'haw', name: 'Hawaiian', native: 'ʻŌlelo Hawaiʻi' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  { code: 'is', name: 'Icelandic', native: 'Íslenska' },
  { code: 'ig', name: 'Igbo', native: 'Igbo' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ga', name: 'Irish', native: 'Gaeilge' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'jv', name: 'Javanese', native: 'Basa Jawa' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'kk', name: 'Kazakh', native: 'Қазақша' },
  { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ' },
  { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ku', name: 'Kurdish', native: 'Kurdî' },
  { code: 'ky', name: 'Kyrgyz', native: 'Кыргызча' },
  { code: 'lo', name: 'Lao', native: 'ພາສາລາວ' },
  { code: 'la', name: 'Latin', native: 'Latina' },
  { code: 'lv', name: 'Latvian', native: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', native: 'Lietuvių' },
  { code: 'lb', name: 'Luxembourgish', native: 'Lëtzebuergesch' },
  { code: 'mk', name: 'Macedonian', native: 'Македонски' },
  { code: 'mg', name: 'Malagasy', native: 'Malagasy' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mt', name: 'Maltese', native: 'Malti' },
  { code: 'mi', name: 'Māori', native: 'Te Reo Māori' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'mn', name: 'Mongolian', native: 'Монгол' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'no', name: 'Norwegian', native: 'Norsk' },
  { code: 'ny', name: 'Nyanja (Chichewa)', native: 'Chichewa' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ps', name: 'Pashto', native: 'پښتو' },
  { code: 'fa', name: 'Persian (Farsi)', native: 'فارسی' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'sm', name: 'Samoan', native: 'Gagana Samoa' },
  { code: 'gd', name: 'Scottish Gaelic', native: 'Gàidhlig' },
  { code: 'sr', name: 'Serbian', native: 'Српски' },
  { code: 'st', name: 'Sesotho', native: 'Sesotho' },
  { code: 'sn', name: 'Shona', native: 'Shona' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina' },
  { code: 'so', name: 'Somali', native: 'Soomaali' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'su', name: 'Sundanese', native: 'Basa Sunda' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'tg', name: 'Tajik', native: 'Тоҷикӣ' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'tt', name: 'Tatar', native: 'Татарча' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'th', name: 'Thai', native: 'ภาษาไทย' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'tk', name: 'Turkmen', native: 'Türkmençe' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'ug', name: 'Uyghur', native: 'ئۇيغۇرچە' },
  { code: 'uz', name: 'Uzbek', native: "O'zbek" },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'cy', name: 'Welsh', native: 'Cymraeg' },
  { code: 'xh', name: 'Xhosa', native: 'IsiXhosa' },
  { code: 'yi', name: 'Yiddish', native: 'ייִדיש' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'zu', name: 'Zulu', native: 'IsiZulu' },
]

const STORAGE_KEY = 'mirror-language'

export function getStoredLanguage(): string {
  if (typeof window === 'undefined') return 'English'
  return localStorage.getItem(STORAGE_KEY) ?? 'English'
}

export function useLanguage() {
  const [language, setLanguageState] = useState<string>(() => getStoredLanguage())

  function setLanguage(lang: string) {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  return { language, setLanguage }
}

interface LanguageSelectorProps {
  compact?: boolean
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.native.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Switch language"
        className={
          compact
            ? 'flex items-center gap-1.5 text-xs text-[#555] hover:text-[#888] transition-colors px-2 py-1 rounded-lg hover:bg-[#1f1f1f]'
            : 'flex items-center gap-2 text-xs text-[#555] hover:text-[#888] transition-colors px-3 py-2 rounded-lg hover:bg-[#1f1f1f] w-full'
        }
      >
        <span className="text-sm">🌐</span>
        <span className="truncate">{language}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl w-full max-w-sm animate-fade-in-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-sm font-medium text-[#f0f0f0]">Mirror language</h3>
                <p className="text-xs text-[#555] mt-0.5">Mirror will respond in this language</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[#555] hover:text-[#888] transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search languages…"
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] focus:border-[#a78bfa]/50 rounded-xl px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] outline-none transition-colors"
              />
            </div>

            {/* Language list */}
            <div className="overflow-y-auto max-h-72 px-3 pb-4 space-y-0.5">
              {filtered.length === 0 && (
                <p className="text-xs text-[#555] text-center py-6">No languages found</p>
              )}
              {filtered.map((lang) => {
                const active = language === lang.name
                return (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.name); setOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                      active
                        ? 'bg-[#a78bfa]/15 text-[#a78bfa]'
                        : 'text-[#888888] hover:text-[#f0f0f0] hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <span className={active ? 'text-[#a78bfa]' : 'text-[#f0f0f0]'}>{lang.name}</span>
                    <span className={`text-xs ml-3 shrink-0 ${active ? 'text-[#a78bfa]/70' : 'text-[#444]'}`}>
                      {lang.native}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
