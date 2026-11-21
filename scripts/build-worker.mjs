import { build } from 'esbuild';

// MediaPipe loads the WASM glue via importScripts, so this worker is classic.
await build({
  entryPoints: ['src/features/cuerpo/pose.worker.ts'],
  outfile: 'src/generated/pose.worker.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
});
