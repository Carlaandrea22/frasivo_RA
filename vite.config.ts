import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  plugins: [react()],
  build: { copyPublicDir: false },
  preview: { port: 4174 },
});
