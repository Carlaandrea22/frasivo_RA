import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
// MediaPipe 0.10.32 loads its WASM glue with importScripts, requiring a
// classic worker. Bundle identically for development and production.
await build({ entryPoints: ['src/detector.worker.ts'], outfile: 'public/detector.worker.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true });
// Vite fingerprints this asset so an older PWA cannot serve a stale worker.
await mkdir('src/generated', { recursive: true });
await copyFile('public/detector.worker.js', 'src/generated/detector.worker.js');

await build({ entryPoints: ['src/medicine/pose.worker.ts'], outfile: 'src/generated/pose.worker.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true });
