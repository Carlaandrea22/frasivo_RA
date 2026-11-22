import type { ComponentType } from 'react';

export type NavigationTab = 'cuerpo' | 'explorar' | 'practicar' | 'progreso' | 'chatbot';
export type RouteProps = { params: Readonly<Record<string, string>> };

export interface RouteDefinition {
  path: string;
  tab: NavigationTab;
  Screen: ComponentType<RouteProps>;
}

const aliases: ReadonlyMap<string, string> = new Map([
  ['explorar-3d', 'explorar'],
  ['mi-progreso', 'progreso'],
  ['creditos', 'progreso/creditos'],
]);

export function resolveRoute(routes: readonly RouteDefinition[], hash: string) {
  const requested = hash.replace(/^#\/?/, '').replace(/\/$/, '') || 'cuerpo';
  const path = aliases.get(requested) ?? requested;
  const exact = routes.find(route => route.path === path);
  if (exact) return { route: exact, params: {} };

  const segments = path.split('/');
  for (const route of routes) {
    const parts = route.path.split('/');
    if (parts.length !== segments.length || !parts.every((part, i) =>
      part.startsWith(':') ? Boolean(segments[i]) : part === segments[i],
    )) continue;
    try {
      const params = Object.fromEntries(parts.flatMap((part, i) =>
        part.startsWith(':') ? [[part.slice(1), decodeURIComponent(segments[i])]] : [],
      ));
      return { route, params };
    } catch {
      return null;
    }
  }
  return null;
}

export function hashSnapshot() {
  return window.location.hash;
}

export function subscribeHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
