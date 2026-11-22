import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { parseEnv } from 'node:util';
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { onRequestPost, type ChatEnv } from './functions/api/chat.ts';

async function readChatEnv(root: string): Promise<ChatEnv> {
  try {
    const vars = parseEnv(await readFile(resolve(root, '.dev.vars'), 'utf8'));
    return {
      OPENROUTER_API_KEY: vars.OPENROUTER_API_KEY,
      OPENROUTER_MODEL: vars.OPENROUTER_MODEL,
      OPENROUTER_FALLBACK_MODELS: vars.OPENROUTER_FALLBACK_MODELS,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error('No se pudo leer la configuración local de Chat.');
  }
}

async function serveChat(req: IncomingMessage, res: ServerResponse, url: URL, env: ChatEnv) {
  const abort = new AbortController();
  res.once('close', () => { if (!res.writableEnded) abort.abort(); });
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(name, value);
    }
    headers.set('CF-Connecting-IP', req.socket.remoteAddress ?? '127.0.0.1');
    const init = {
      method: 'POST', headers, signal: abort.signal, duplex: 'half',
      body: Readable.toWeb(req) as unknown as BodyInit,
    };
    const reply = await onRequestPost({ request: new Request(url, init), env });
    res.statusCode = reply.status;
    reply.headers.forEach((value, name) => res.setHeader(name, value));
    if (reply.body) {
      res.flushHeaders();
      await pipeline(Readable.fromWeb(reply.body as NodeReadableStream), res, { signal: abort.signal });
    } else res.end();
  } catch {
    if (res.destroyed) return;
    if (res.headersSent) res.destroy();
    else {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ code: 'no_disponible' }));
    }
  }
}

function localChat(): Plugin {
  const configure = async (server: ViteDevServer | PreviewServer) => {
    const env = await readChatEnv(server.config.root);
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname !== '/api/chat' && url.pathname !== '/api/chat/') return next();
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST', 'Cache-Control': 'no-store' });
        return res.end();
      }
      void serveChat(req, res, url, env);
    });
  };
  return { name: 'lumar-local-chat', configureServer: configure, configurePreviewServer: configure };
}

function appCommit() {
  const ciCommit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (ciCommit && /^[0-9a-f]{40}$/i.test(ciCommit)) return ciCommit;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export default defineConfig({
  define: { __LUMAR_COMMIT__: JSON.stringify(appCommit()) },
  plugins: [react(), localChat()],
  server: { fs: { deny: [
    '.env', '.env.*', '.dev.vars', '.dev.vars.*', '*.{crt,pem,key,p12,pfx,cer,der}',
    '.npmrc', '.yarnrc.yml', '**/.git/**', '**/functions/**',
  ] } },
  build: { copyPublicDir: false },
  preview: { port: 4174 },
});
