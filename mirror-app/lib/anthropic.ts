import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_MODEL = 'claude-sonnet-4-6'

let _anthropic: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return _anthropic
}

// Lazy proxy so call sites can keep using `anthropic.messages...`
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return getAnthropic()[prop as keyof Anthropic]
  },
})
