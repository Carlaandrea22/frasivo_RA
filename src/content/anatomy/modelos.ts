const fichas = import.meta.glob<string>('./modelos/fichas/explorar-*.glb', {
  eager: true, query: '?url&no-inline', import: 'default',
});

export const modelos: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(fichas).map(([path, url]) => [path.slice('./modelos/fichas/explorar-'.length, -'.glb'.length), url]),
);
