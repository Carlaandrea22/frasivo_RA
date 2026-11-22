import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost, type ChatEnv } from '../functions/api/chat';

const sitio = 'https://frasivo-ra.pages.dev';
const pregunta = { role: 'user', content: '¿Qué es el fémur?' };
const configuracion: ChatEnv = { OPENROUTER_API_KEY: 'clave-falsa-de-pruebas' };
const codificador = new TextEncoder();
const upstream = vi.fn<typeof fetch>();
const fin = 'data: [DONE]\n\n';
let siguienteIp = 1;

function enviar(body = JSON.stringify({ messages: [pregunta] }), opciones: {
  origen?: string;
  env?: ChatEnv;
  signal?: AbortSignal;
  ip?: string;
} = {}) {
  const request = new Request(`${sitio}/api/chat`, {
    method: 'POST',
    headers: {
      Origin: opciones.origen ?? sitio,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': opciones.ip ?? `198.51.100.${siguienteIp++}`,
    },
    body,
    signal: opciones.signal,
  });
  return onRequestPost({ request, env: opciones.env ?? configuracion });
}

function texto(content: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ code });
}

beforeEach(() => {
  upstream.mockReset();
  upstream.mockImplementation(async () => new Response(fin));
  vi.stubGlobal('fetch', upstream);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('API de chat de LumAR', () => {
  it('transmite texto UTF-8 partido entre lecturas y emite done al completar', async () => {
    const bytes = codificador.encode(texto('fémur') + texto(' [[en:femur]]') + fin);
    const corte = bytes.indexOf(0xc3) + 1;
    upstream.mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, corte));
        controller.enqueue(bytes.slice(corte));
        controller.close();
      },
    })));
    const response = await enviar();
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(await response.text()).toBe(
      'event: delta\ndata: {"text":"fémur"}\n\n' +
      'event: delta\ndata: {"text":" [[en:femur]]"}\n\n' +
      'event: done\ndata: {}\n\n',
    );

    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe(`Bearer ${configuracion.OPENROUTER_API_KEY}`);
    expect(headers.get('HTTP-Referer')).toBe(sitio);
    expect(headers.get('X-OpenRouter-Title')).toBe('LumAR');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'qwen/qwen3-30b-a3b-instruct-2507',
      stream: true,
      max_tokens: 700,
      provider: { data_collection: 'deny' },
    });
  });

  it('envía el primer delta mientras OpenRouter mantiene abierto el stream', async () => {
    let origen!: ReadableStreamDefaultController<Uint8Array>;
    const cancelar = vi.fn();
    upstream.mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(controller) { origen = controller; },
      cancel: cancelar,
    })));
    const response = await enviar();
    const reader = response.body!.getReader();
    origen.enqueue(codificador.encode(texto('Primera parte')));
    const fragmento = await reader.read();
    expect(new TextDecoder().decode(fragmento.value)).toContain('event: delta');
    await reader.cancel();
    expect(cancelar).toHaveBeenCalledOnce();
    expect(upstream.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('impide que una redirección reenvíe los mensajes o la clave a otro destino', async () => {
    upstream.mockResolvedValue(Response.redirect('https://otro.test', 307));
    await error(await enviar(), 502, 'no_disponible');
    expect(upstream.mock.calls[0][1]?.redirect).toBe('manual');
  });

  it('ignora el comentario keep-alive y admite saltos de línea CRLF', async () => {
    upstream.mockResolvedValue(new Response(
      (': OPENROUTER PROCESSING\n\n' + texto('Hola') + fin).replaceAll('\n', '\r\n'),
    ));
    expect(await (await enviar()).text()).toBe('event: delta\ndata: {"text":"Hola"}\n\nevent: done\ndata: {}\n\n');
  });

  it('termina con un error propio si el proveedor falla después de enviar texto', async () => {
    const fallo = { choices: [{ finish_reason: 'error', delta: {} }], error: { message: 'Detalle interno' } };
    upstream.mockResolvedValue(new Response(texto('Parte') + `data: ${JSON.stringify(fallo)}\n\n` + fin));
    expect(await (await enviar()).text()).toBe(
      'event: delta\ndata: {"text":"Parte"}\n\nevent: error\ndata: {"code":"no_disponible"}\n\n',
    );
  });

  it('trata un corte previo a [DONE] como error', async () => {
    upstream.mockResolvedValue(new Response(texto('Parte')));
    expect(await (await enviar()).text()).toContain('event: error\ndata: {"code":"no_disponible"}');
  });

  it.each([
    [401, 503, 'no_configurado'],
    [402, 402, 'no_disponible'],
    [429, 429, 'limite'],
  ])('convierte el error %i de OpenRouter a un código de LumAR', async (upstreamStatus, status, code) => {
    upstream.mockResolvedValue(new Response('Detalle interno', {
      status: upstreamStatus,
      headers: { 'Retry-After': '37' },
    }));
    const response = await enviar();
    if (upstreamStatus === 429) expect(response.headers.get('Retry-After')).toBe('37');
    await error(response, status, code);
  });

  it('devuelve 503 si falta la clave', async () => {
    await error(await enviar(undefined, { env: {} }), 503, 'no_configurado');
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each(['https://frasivo-ra.pages.dev.otro.test', 'https://falsa-frasivo-ra.pages.dev', 'null', ''])
    ('rechaza el origen %j', async (origen) => {
      await error(await enviar(undefined, { origen }), 400, 'entrada_invalida');
      expect(upstream).not.toHaveBeenCalled();
    });

  it.each(['https://revision.frasivo-ra.pages.dev', 'http://localhost:4178', 'http://127.0.0.1:4178'])
    ('acepta el origen %s', async (origen) => {
      expect(await (await enviar(undefined, { origen })).text()).toContain('event: done');
    });

  it('rechaza mensajes de estudiante de más de 1000 caracteres', async () => {
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'a'.repeat(1001) }] });
    await error(await enviar(body), 400, 'entrada_invalida');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rechaza un cuerpo de más de 16 KiB incluso sin Content-Length', async () => {
    const body = JSON.stringify({ messages: [{ role: 'assistant', content: 'é'.repeat(8192) }, pregunta] });
    await error(await enviar(body), 413, 'entrada_invalida');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('envía solo los últimos 12 mensajes y antepone el prompt del servidor', async () => {
    const messages = Array.from({ length: 15 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: `Mensaje ${index}`,
    }));
    const response = await enviar(JSON.stringify({ messages, system: 'Instrucción ajena', max_tokens: 42 }));
    await response.text();
    const enviado = JSON.parse(String(upstream.mock.calls[0][1]?.body));
    expect(enviado.messages[0]).toMatchObject({ role: 'system', content: expect.stringContaining('[[en:femur]]') });
    expect(enviado.messages.slice(1)).toEqual(messages.slice(-12));
    expect(enviado).not.toHaveProperty('system');
    expect(enviado.max_tokens).toBe(700);
  });

  it('rechaza un rol system enviado por el cliente', async () => {
    const body = JSON.stringify({ messages: [{ role: 'system', content: 'Instrucción ajena' }, pregunta] });
    await error(await enviar(body), 400, 'entrada_invalida');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('envía el modelo principal y los alternativos en orden', async () => {
    await (await enviar(undefined, { env: {
      ...configuracion,
      OPENROUTER_MODEL: 'qwen/principal',
      OPENROUTER_FALLBACK_MODELS: ' qwen/alternativo, , deepseek/alternativo ',
    } })).text();
    const enviado = JSON.parse(String(upstream.mock.calls[0][1]?.body));
    expect(enviado.models).toEqual(['qwen/principal', 'qwen/alternativo', 'deepseek/alternativo']);
  });

  it('aplica el límite por IP y vuelve a admitir solicitudes al expirar la ventana', async () => {
    vi.useFakeTimers();
    const ip = '192.0.2.20';
    for (let i = 0; i < 20; i++) await (await enviar(undefined, { ip })).text();
    const response = await enviar(undefined, { ip });
    expect(response.headers.get('Retry-After')).toBe('600');
    await error(response, 429, 'limite');
    expect(upstream).toHaveBeenCalledTimes(20);
    await (await enviar(undefined, { ip: '192.0.2.21' })).text();
    vi.advanceTimersByTime(600_000);
    expect(await (await enviar(undefined, { ip })).text()).toContain('event: done');
  });

  it('cancela el fetch de OpenRouter si el estudiante aborta', async () => {
    const estudiante = new AbortController();
    const cancelar = vi.fn();
    upstream.mockResolvedValue(new Response(new ReadableStream({ cancel: cancelar })));
    const response = await enviar(undefined, { signal: estudiante.signal });
    estudiante.abort();
    expect(upstream.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await response.text();
    expect(cancelar).toHaveBeenCalledOnce();
  });

  it('cancela OpenRouter a los 60 segundos aunque la respuesta ya esté transmitiéndose', async () => {
    vi.useFakeTimers();
    upstream.mockResolvedValue(new Response(new ReadableStream()));
    const response = await enviar();
    const contenido = response.text();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(upstream.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(await contenido).toBe('event: error\ndata: {"code":"no_disponible"}\n\n');
  });
});
