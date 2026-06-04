import OpenAI from 'openai'

export const EMBEDDING_MODEL = 'text-embedding-3-small'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }
  return _openai
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  const embedding = response.data?.[0]?.embedding
  if (!embedding) throw new Error('No embedding returned from OpenAI')
  return embedding
}
