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
    body: JSON.stringify({ message, history, sessionId, language }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  const text = await response.text();
  if (text) onChunk(text);
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const headers = await getAuthHeaders();
  const fetchHeaders: Record<string, string> = {};
  if (headers.Authorization) fetchHeaders['Authorization'] = headers.Authorization;

  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE}/api/voice/transcribe`, {
    method: 'POST',
    headers: fetchHeaders,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription error: ${response.status}`);
  }

  const data = await response.json();
  return data.transcript || data.text || '';
}
