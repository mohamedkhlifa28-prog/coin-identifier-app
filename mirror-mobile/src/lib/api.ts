import { API_BASE } from './constants';
import { supabase } from './supabase';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const url = `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

export async function streamChat(
  message: string,
  history: Message[],
  sessionId: string | null,
  language: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      history,
      sessionId,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader available');
  }

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text =
            parsed.choices?.[0]?.delta?.content ||
            parsed.content ||
            parsed.text ||
            '';
          if (text) {
            onChunk(text);
          }
        } catch {
          // If not JSON, treat as raw text chunk
          if (data && data !== '[DONE]') {
            onChunk(data);
          }
        }
      } else if (line.trim() && !line.startsWith(':')) {
        // Handle non-SSE streaming responses
        try {
          const parsed = JSON.parse(line);
          const text =
            parsed.choices?.[0]?.delta?.content ||
            parsed.content ||
            parsed.text ||
            '';
          if (text) {
            onChunk(text);
          }
        } catch {
          // Not JSON, skip
        }
      }
    }
  }
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const headers = await getAuthHeaders();
  const { Authorization } = headers;

  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE}/api/voice/transcribe`, {
    method: 'POST',
    headers: {
      Authorization,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription error: ${response.status}`);
  }

  const data = await response.json();
  return data.transcript || data.text || '';
}
