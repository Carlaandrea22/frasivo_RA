export interface ChatEnv {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_FALLBACK_MODELS?: string;
}

type Mensaje = { role: 'user' | 'assistant'; content: string };
type Codigo = 'entrada_invalida' | 'no_configurado' | 'limite' | 'no_disponible';
type Evento =
  | { nombre: 'delta'; datos: { text: string } }
  | { nombre: 'error'; datos: { code: Codigo } }
  | { nombre: 'done'; datos: Record<string, never> };
type FragmentoOpenRouter = {
  error?: { code?: number };
  choices?: { delta?: { content?: string }; finish_reason?: string }[];
};

const HOST_LUMAR = 'frasivo-ra.pages.dev';
const URL_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
const MODELO_PREDETERMINADO = 'qwen/qwen3-30b-a3b-instruct-2507';
const MAX_BYTES = 16 * 1024;
const MAX_CARACTERES = 1_000;
const MAX_HISTORIAL = 12;
const MAX_TOKENS = 700;
const MAX_TIEMPO_MS = 60_000;
const VENTANA_MS = 10 * 60_000;
const MAX_SOLICITUDES = 20;
const ventanasPorIp = new Map<string, { vence: number; solicitudes: number }>();
let proximaLimpieza = 0;

const PROMPT = [
  'Eres el tutor de LumAR. Responde en español sobre anatomía humana y vocabulario médico en inglés.',
  'Sé breve, unas 150 palabras salvo que el estudiante pida más. Marca cada término en inglés con este formato: [[en:femur]].',
  'Puedes hacer preguntas tipo quiz. No diagnostiques ni recomiendes tratamientos. Para consultas de salud personal, sugiere consultar a un profesional.',
  'Si la pregunta queda fuera de anatomía humana o inglés médico, redirige con amabilidad hacia estos temas.',
].join(' ');

function origenPermitido(origen: string | null) {
  if (!origen) return false;
  try {
    const { origin, hostname, protocol, port } = new URL(origen);
    if (origin !== origen) return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return protocol === 'http:' || protocol === 'https:';
    }
    return protocol === 'https:' && !port && (
      hostname === HOST_LUMAR || hostname.endsWith(`.${HOST_LUMAR}`)
    );
  } catch {
    return false;
  }
}

function respuestaError(code: Codigo, status: number, retryAfter?: string) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (retryAfter) headers.set('Retry-After', retryAfter);
  return Response.json({ code }, { status, headers });
}

function codigoOpenRouter(status?: number): Codigo {
  switch (status) {
    case 400: return 'entrada_invalida';
    case 401: return 'no_configurado';
    case 429: return 'limite';
    default: return 'no_disponible';
  }
}

function errorOpenRouter({ status, headers, body }: Response) {
  void body?.cancel().catch(() => {});
  switch (status) {
    case 400:
    case 402:
    case 503:
      return respuestaError(codigoOpenRouter(status), status);
    case 401:
      return respuestaError('no_configurado', 503);
    case 429:
      return respuestaError('limite', 429, headers.get('Retry-After') || '60');
    default:
      return respuestaError('no_disponible', 502);
  }
}

async function leerMensajes(request: Request): Promise<Mensaje[] | 400 | 413> {
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return 413;
  if (!request.body) return 400;
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let texto = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) return 413;
      texto += decoder.decode(value, { stream: true });
    }

    const entrada: unknown = JSON.parse(texto + decoder.decode());
    if (!entrada || typeof entrada !== 'object' || !('messages' in entrada) || !Array.isArray(entrada.messages)) {
      return 400;
    }

    const mensajes: Mensaje[] = [];
    for (const item of entrada.messages) {
      if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return 400;
      if (item.role === 'user' && (!item.content.trim() || item.content.length > MAX_CARACTERES)) return 400;
      mensajes.push({ role: item.role, content: item.content });
    }
    if (mensajes.at(-1)?.role !== 'user') return 400;
    return mensajes.slice(-MAX_HISTORIAL);
  } catch {
    return 400;
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function esperaPorIp(ip: string) {
  const ahora = Date.now();
  if (ahora >= proximaLimpieza) {
    for (const [direccion, ventana] of ventanasPorIp) {
      if (ventana.vence <= ahora) ventanasPorIp.delete(direccion);
    }
    proximaLimpieza = ahora + VENTANA_MS;
  }

  let ventana = ventanasPorIp.get(ip);
  if (!ventana || ventana.vence <= ahora) {
    ventana = { vence: ahora + VENTANA_MS, solicitudes: 0 };
    ventanasPorIp.set(ip, ventana);
  }
  if (ventana.solicitudes >= MAX_SOLICITUDES) return Math.ceil((ventana.vence - ahora) / 1_000);
  ventana.solicitudes++;
  return 0;
}

async function* leerEventos(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<Evento> {
  const decoder = new TextDecoder();
  let pendiente = '';
  let datos: string[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    const bloque = pendiente + decoder.decode(value, { stream: !done });
    // Una CR al final de la lectura puede ser el inicio de un CRLF.
    const lineas = bloque.split(done ? /\r\n|\r|\n/ : /\r\n|\r(?!$)|\n/);
    pendiente = lineas.pop() ?? '';
    for (const linea of lineas) {
      if (linea.startsWith('data:')) datos.push(linea.slice(5).replace(/^ /, ''));
      if (linea || !datos.length) continue;
      const payload = datos.join('\n');
      datos = [];

      if (payload === '[DONE]') {
        yield { nombre: 'done', datos: {} };
        return;
      }
      const fragmento: FragmentoOpenRouter = JSON.parse(payload);
      const choice = fragmento.choices?.[0];
      if (fragmento.error || choice?.finish_reason === 'error') {
        yield { nombre: 'error', datos: { code: codigoOpenRouter(fragmento.error?.code) } };
        return;
      }
      const texto = choice?.delta?.content;
      if (typeof texto === 'string' && texto) yield { nombre: 'delta', datos: { text: texto } };
    }
    if (done) return;
  }
}

function reenviarEventos(body: ReadableStream<Uint8Array>, upstream: AbortController, limpiar: () => void) {
  const reader = body.getReader();
  const eventos = leerEventos(reader);
  const encoder = new TextEncoder();
  const fallo: Evento = { nombre: 'error', datos: { code: 'no_disponible' } };
  let cerrado = false;
  let alAbortar: () => void;

  const cerrar = () => {
    cerrado = true;
    upstream.signal.removeEventListener('abort', alAbortar);
    limpiar();
    void reader.cancel().catch(() => {});
    reader.releaseLock();
    void eventos.return(undefined).catch(() => {});
  };

  const escribir = (controller: ReadableStreamDefaultController<Uint8Array>, evento: Evento) => {
    if (cerrado) return;
    controller.enqueue(encoder.encode(`event: ${evento.nombre}\ndata: ${JSON.stringify(evento.datos)}\n\n`));
    if (evento.nombre !== 'delta') {
      cerrar();
      controller.close();
    }
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      alAbortar = () => escribir(controller, fallo);
      upstream.signal.addEventListener('abort', alAbortar, { once: true });
      if (upstream.signal.aborted) alAbortar();
    },
    async pull(controller) {
      try {
        const siguiente = await eventos.next();
        escribir(controller, siguiente.done ? fallo : siguiente.value);
      } catch {
        escribir(controller, fallo);
      }
    },
    cancel() {
      cerrar();
      upstream.abort();
    },
  });
}

export async function onRequestPost({ request, env }: { request: Request; env: ChatEnv }): Promise<Response> {
  if (!origenPermitido(request.headers.get('Origin'))) return respuestaError('entrada_invalida', 400);
  const clave = env.OPENROUTER_API_KEY?.trim();
  if (!clave) return respuestaError('no_configurado', 503);

  const mensajes = await leerMensajes(request);
  if (typeof mensajes === 'number') return respuestaError('entrada_invalida', mensajes);
  const espera = esperaPorIp(request.headers.get('CF-Connecting-IP') ?? 'desconocida');
  if (espera) return respuestaError('limite', 429, String(espera));

  const modelo = env.OPENROUTER_MODEL?.trim() || MODELO_PREDETERMINADO;
  const alternativos = env.OPENROUTER_FALLBACK_MODELS?.split(',').map(id => id.trim()).filter(Boolean);
  const modelos = alternativos?.length ? { models: [...new Set([modelo, ...alternativos])] } : { model: modelo };
  const upstream = new AbortController();
  const abortar = () => upstream.abort();
  request.signal.addEventListener('abort', abortar, { once: true });
  if (request.signal.aborted) abortar();
  const timeout = setTimeout(abortar, MAX_TIEMPO_MS);
  const limpiar = () => {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abortar);
  };

  try {
    const response = await fetch(URL_OPENROUTER, {
      method: 'POST',
      signal: upstream.signal,
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${clave}`,
        'HTTP-Referer': `https://${HOST_LUMAR}`,
        'X-OpenRouter-Title': 'LumAR',
        'X-OpenRouter-App-Visibility': 'hidden',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...modelos,
        messages: [{ role: 'system', content: PROMPT }, ...mensajes],
        stream: true,
        max_tokens: MAX_TOKENS,
        provider: { data_collection: 'deny' },
      }),
    });
    if (!response.ok || !response.body) {
      limpiar();
      return errorOpenRouter(response);
    }
    return new Response(reenviarEventos(response.body, upstream, limpiar), {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    limpiar();
    return respuestaError('no_disponible', 502);
  }
}
