export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ErrorCode = 'sin_conexion' | 'no_configurado' | 'limite' | 'no_disponible' | 'entrada_invalida';

function errorCode(payload: unknown): ErrorCode {
  if (payload && typeof payload === 'object' && 'code' in payload) {
    switch (payload.code) {
      case 'no_configurado':
      case 'limite':
      case 'no_disponible':
      case 'entrada_invalida':
        return payload.code;
    }
  }
  return 'no_disponible';
}

export class ChatError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

function requestBody(history: ChatMessage[]) {
  const messages = history.slice(-12).map(({ role, content }) => ({ role, content }));
  const encoder = new TextEncoder();
  let body = JSON.stringify({ messages });
  while (messages.length > 1 && encoder.encode(body).byteLength > 16 * 1024) {
    messages.shift();
    body = JSON.stringify({ messages });
  }
  return body;
}

function handleEvent(frame: string, onDelta: (text: string) => void) {
  let event = '';
  const data: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  if (event === 'done') return true;
  if (event !== 'delta' && event !== 'error') return false;

  const payload: unknown = JSON.parse(data.join('\n'));
  if (event === 'error') throw new ChatError(errorCode(payload));
  if (payload && typeof payload === 'object' && 'text' in payload && typeof payload.text === 'string') {
    onDelta(payload.text);
  }
  return false;
}

export async function streamChat(history: ChatMessage[], signal: AbortSignal, onDelta: (text: string) => void) {
  const response = await fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody(history), signal,
  });
  if (!response.ok) throw new ChatError(errorCode(await response.json().catch(() => undefined)));
  if (!response.body) throw new ChatError('no_disponible');

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let remaining = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new ChatError('no_disponible');
      const frames = (remaining + value).split(/\r?\n\r?\n/);
      remaining = frames.pop() ?? '';
      for (const frame of frames) {
        if (handleEvent(frame, onDelta)) return;
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
