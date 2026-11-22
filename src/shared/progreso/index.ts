export const progressStorageKey = 'lumar.progress:v1';
export const legacyProgressKey = 'frasivo-explore:v1';
const eventPrefix = `${progressStorageKey}:event:`;

export type ProgressStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem'>;

export interface ProgressTarget {
  readonly areaId: string;
  readonly groupId?: string;
  readonly itemId: string;
  readonly activityId?: string;
}

export interface ReasoningText {
  readonly summary: string;
  readonly hypothesisId: string;
  readonly evidence: string;
  readonly missingInformation: string;
}

export interface ReasoningEvidence {
  readonly original: ReasoningText;
  readonly suggestions: readonly string[];
  readonly revised?: ReasoningText;
}

export type PracticeContext =
  | { readonly kind: 'reto'; readonly mode: 'entrenamiento' | 'evaluacion' }
  | { readonly kind: 'caso'; readonly questionIds: readonly string[]; readonly hypothesisId: string };

export interface PracticeInput extends ProgressTarget {
  readonly correct: number;
  readonly errors: number;
  readonly hints: number;
  readonly assisted?: number;
  readonly retried?: boolean;
  readonly context?: PracticeContext;
  readonly reasoning?: ReasoningEvidence;
}

export interface DemonstrationInput extends ProgressTarget {
  readonly practiceEventId: string;
}

interface EventStamp {
  readonly id: string;
  readonly timestamp: string;
}

export type ConsultationEvent = ProgressTarget & EventStamp & { readonly kind: 'consultation' };
export type PracticeEvent = PracticeInput & EventStamp & { readonly kind: 'practice' };
export type DemonstrationEvent = DemonstrationInput & EventStamp & { readonly kind: 'demonstration' };
export type ProgressEvent = ConsultationEvent | PracticeEvent | DemonstrationEvent;
export type ProgressKind = ProgressEvent['kind'];
export type ProgressFilter = Partial<ProgressTarget> & { kind?: ProgressKind };

export interface LegacyProgress {
  readonly points: number;
  readonly words: Readonly<Record<string, { readonly attempts: number; readonly correct: number }>>;
}

export interface ProgressSnapshot {
  readonly version: 1;
  readonly events: readonly ProgressEvent[];
  readonly legacy: LegacyProgress | null;
}

const browserStorage: ProgressStorage = {
  get length() { return window.localStorage.length; },
  key: index => window.localStorage.key(index),
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

interface StorageState {
  pending: Map<string, string>;
  cache?: { fingerprint: string; snapshot: ProgressSnapshot };
}

const states = new WeakMap<ProgressStorage, StorageState>();
const listeners = new Set<() => void>();
let fallbackSequence = 0;

function getState(storage: ProgressStorage): StorageState {
  let state = states.get(storage);
  if (!state) {
    state = { pending: new Map() };
    states.set(storage, state);
  }
  return state;
}

function readString(storage: ProgressStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeString(storage: ProgressStorage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseLegacy(value: unknown): LegacyProgress | null {
  if (!isRecord(value) || !isCount(value.points) || !isRecord(value.words)) return null;

  const words: [string, { attempts: number; correct: number }][] = [];
  for (const [id, stat] of Object.entries(value.words)) {
    if (!id || !isRecord(stat) || !isCount(stat.attempts) || !isCount(stat.correct) || stat.correct > stat.attempts) {
      return null;
    }
    words.push([id, { attempts: stat.attempts, correct: stat.correct }]);
  }
  return { points: value.points, words: Object.fromEntries(words) };
}

function readMetadata(storage: ProgressStorage): { legacy: LegacyProgress | null; writable: boolean } {
  const raw = readString(storage, progressStorageKey);
  const metadata = parseJson(raw);
  if (isRecord(metadata) && metadata.version === 1) {
    return { legacy: parseLegacy(metadata.legacy), writable: true };
  }
  if (isRecord(metadata) && typeof metadata.version === 'number') {
    return { legacy: null, writable: false };
  }

  const previous = parseJson(readString(storage, legacyProgressKey));
  const legacy = isRecord(previous) && previous.version === 1 ? parseLegacy(previous) : null;
  if (raw === null) {
    writeString(storage, progressStorageKey, JSON.stringify({ version: 1, legacy }));
  }
  return { legacy, writable: true };
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isReasoningText(value: unknown): value is ReasoningText {
  return isRecord(value) && typeof value.summary === 'string' && typeof value.hypothesisId === 'string' &&
    typeof value.evidence === 'string' && typeof value.missingInformation === 'string';
}

function isReasoningEvidence(value: unknown): value is ReasoningEvidence {
  return isRecord(value) && isReasoningText(value.original) && Array.isArray(value.suggestions) &&
    value.suggestions.every(suggestion => typeof suggestion === 'string') &&
    (value.revised === undefined || isReasoningText(value.revised));
}

function isPracticeContext(value: unknown): value is PracticeContext {
  if (!isRecord(value)) return false;
  if (value.kind === 'reto') return value.mode === 'entrenamiento' || value.mode === 'evaluacion';
  return value.kind === 'caso' && Array.isArray(value.questionIds) &&
    value.questionIds.every(isId) && isId(value.hypothesisId);
}

function isProgressEvent(value: unknown): value is ProgressEvent {
  if (!isRecord(value) || !isId(value.id) || !isId(value.areaId) || !isId(value.itemId) ||
      (value.groupId !== undefined && !isId(value.groupId)) ||
      (value.activityId !== undefined && !isId(value.activityId)) ||
      typeof value.timestamp !== 'string') {
    return false;
  }

  const date = new Date(value.timestamp);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.timestamp) return false;

  switch (value.kind) {
    case 'consultation':
      return true;
    case 'practice':
      return isCount(value.correct) && isCount(value.errors) && isCount(value.hints) &&
        (value.assisted === undefined || isCount(value.assisted)) &&
        (value.retried === undefined || typeof value.retried === 'boolean') &&
        (value.context === undefined || isPracticeContext(value.context)) &&
        (value.reasoning === undefined || isReasoningEvidence(value.reasoning));
    case 'demonstration':
      return isId(value.practiceEventId) && value.id === demonstrationId(value.practiceEventId);
    default:
      return false;
  }
}

function sameTarget(left: ProgressTarget, right: ProgressTarget): boolean {
  return left.areaId === right.areaId && left.groupId === right.groupId &&
    left.itemId === right.itemId && left.activityId === right.activityId;
}

function readEntries(storage: ProgressStorage, writable: boolean, pending: Map<string, string>) {
  const entries = new Map(pending);
  if (writable) {
    try {
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (!key?.startsWith(eventPrefix)) continue;
        const raw = readString(storage, key);
        if (raw !== null) entries.set(key, raw);
      }
    } catch {
      // Events from the current session are still available.
    }
  }
  return [...entries].sort(([left], [right]) => left.localeCompare(right));
}

export function getProgress(storage: ProgressStorage = browserStorage): ProgressSnapshot {
  const { legacy, writable } = readMetadata(storage);
  const state = getState(storage);
  const entries = readEntries(storage, writable, state.pending);
  const fingerprint = JSON.stringify([legacy, entries]);
  if (state.cache?.fingerprint === fingerprint) return state.cache.snapshot;

  const events = entries.flatMap(([key, raw]) => {
    const event = parseJson(raw);
    return isProgressEvent(event) && key === eventPrefix + event.id ? [event] : [];
  });
  const practices = new Map(events.filter(event => event.kind === 'practice').map(event => [event.id, event]));
  const snapshot: ProgressSnapshot = {
    version: 1,
    legacy,
    events: events.filter(event => {
      if (event.kind !== 'demonstration') return true;
      const practice = practices.get(event.practiceEventId);
      return !!practice && sameTarget(event, practice);
    }).sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp) ||
      Number(left.kind === 'demonstration') - Number(right.kind === 'demonstration'),
    ),
  };
  state.cache = { fingerprint, snapshot };
  return snapshot;
}

export function queryProgress<K extends ProgressKind>(
  filter: ProgressFilter & { kind: K },
  storage?: ProgressStorage,
): readonly Extract<ProgressEvent, { kind: K }>[];
export function queryProgress(filter?: ProgressFilter, storage?: ProgressStorage): readonly ProgressEvent[];
export function queryProgress(filter: ProgressFilter = {}, storage?: ProgressStorage): readonly ProgressEvent[] {
  return getProgress(storage).events.filter(event =>
    (filter.kind === undefined || event.kind === filter.kind) &&
    (filter.areaId === undefined || event.areaId === filter.areaId) &&
    (filter.groupId === undefined || event.groupId === filter.groupId) &&
    (filter.itemId === undefined || event.itemId === filter.itemId) &&
    (filter.activityId === undefined || event.activityId === filter.activityId),
  );
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === progressStorageKey ||
        event.key === legacyProgressKey || event.key.startsWith(eventPrefix)) {
      listener();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

function stamp(id: string = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${++fallbackSequence}`): EventStamp {
  return { id, timestamp: new Date().toISOString() };
}

function demonstrationId(practiceEventId: string): string {
  return `demonstration:${practiceEventId}`;
}

function saveEvent<T extends ProgressEvent>(event: T, storage: ProgressStorage): T {
  if (!isProgressEvent(event)) throw new TypeError('Los datos del evento de progreso no son válidos.');

  const { pending } = getState(storage);
  pending.set(eventPrefix + event.id, JSON.stringify(event));
  if (readMetadata(storage).writable) {
    // A separate key per event keeps simultaneous writes from different tabs independent.
    for (const [key, raw] of pending) {
      if (writeString(storage, key, raw)) pending.delete(key);
    }
  }
  if (storage === browserStorage) {
    for (const listener of listeners) listener();
  }
  return event;
}

export function recordConsultation(input: ProgressTarget, storage: ProgressStorage = browserStorage): ConsultationEvent {
  return saveEvent({ ...input, ...stamp(), kind: 'consultation' }, storage);
}

export function recordPractice(input: PracticeInput, storage: ProgressStorage = browserStorage): PracticeEvent {
  return saveEvent({ ...input, ...stamp(), kind: 'practice' }, storage);
}

export function recordDemonstration(
  input: DemonstrationInput,
  storage: ProgressStorage = browserStorage,
): DemonstrationEvent | null {
  const events = getProgress(storage).events;
  const id = demonstrationId(input.practiceEventId);
  const previous = events.find((event): event is DemonstrationEvent => event.id === id && event.kind === 'demonstration');
  if (previous) return sameTarget(previous, input) ? previous : null;

  const practice = events.find(event => event.id === input.practiceEventId && event.kind === 'practice');
  if (!practice || !sameTarget(practice, input)) return null;

  return saveEvent({ ...input, ...stamp(id), kind: 'demonstration' }, storage);
}
