import type { GeographyMetric } from './geography-analysis';
import {
  isComparisonSettings,
  type ComparisonSettings,
} from './comparison-settings';

export type EvidenceSummary = {
  specialty: string;
  metric: GeographyMetric;
  national: number | null;
  minimum: number;
  places: {
    name: string;
    code: string;
    value: number | null;
    providers: number | null;
    coverage: string;
  }[];
};

export type EvidenceRecord = {
  id: string;
  captured: string;
  year: number;
  context: string;
  observation: string;
  summary: EvidenceSummary;
  settings?: ComparisonSettings;
};

export const NOTEBOOK_KEY = 'part-d-explorer:notebook:v1';
export const NOTEBOOK_LIMIT = 40;
export const OBSERVATION_LIMIT = 1200;
export const NOTEBOOK_FILE_LIMIT = 7_000_000;

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, limit: number): value is string =>
  typeof value === 'string' && value.length <= limit;
const number = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const nullableNumber = (value: unknown) => value === null || number(value);

function validRecord(value: unknown): value is EvidenceRecord {
  if (!object(value) || !object(value.summary)) return false;
  const summary = value.summary;
  return (
    (value.settings === undefined ||
      (isComparisonSettings(value.settings) &&
        value.settings.year === value.year)) &&
    text(value.id, 100) &&
    value.id.length > 0 &&
    text(value.captured, 40) &&
    Number.isFinite(Date.parse(value.captured)) &&
    number(value.year) &&
    Number.isInteger(value.year) &&
    text(value.context, 150000) &&
    text(value.observation, OBSERVATION_LIMIT) &&
    text(summary.specialty, 300) &&
    ['costPerClaim', 'claimsPerProvider', 'opioidShare'].includes(
      String(summary.metric),
    ) &&
    nullableNumber(summary.national) &&
    number(summary.minimum) &&
    Array.isArray(summary.places) &&
    summary.places.length === 2 &&
    summary.places.every(
      (place: unknown) =>
        object(place) &&
        text(place.name, 150) &&
        text(place.code, 10) &&
        nullableNumber(place.value) &&
        nullableNumber(place.providers) &&
        ['included', 'not reported', 'below threshold'].includes(
          String(place.coverage),
        ) &&
        (place.coverage === 'included'
          ? number(place.value) && number(place.providers)
          : place.value === null),
    )
  );
}

/** Reject unsupported/corrupt storage rather than silently replacing saved work. */
export function parseNotebook(raw: string | null): EvidenceRecord[] {
  if (raw === null) return [];
  if (raw.length > NOTEBOOK_FILE_LIMIT)
    throw new Error('This notebook exceeds the 7 MB limit.');
  const value: unknown = JSON.parse(raw);
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.notes) ||
    value.notes.length > NOTEBOOK_LIMIT ||
    !value.notes.every(validRecord) ||
    new Set(value.notes.map((note) => note.id)).size !== value.notes.length
  )
    throw new Error(
      'The saved notebook could not be read. Its stored data has been preserved.',
    );
  return value.notes;
}

export function serializeNotebook(notes: EvidenceRecord[]): string {
  const raw = JSON.stringify({ version: 1, notes });
  parseNotebook(raw);
  return raw;
}

export function addEvidence(
  notes: EvidenceRecord[],
  note: EvidenceRecord,
): EvidenceRecord[] {
  if (!validRecord(note))
    throw new Error(
      'This note could not be saved. Download its evidence instead.',
    );
  if (
    notes.some(
      (saved) =>
        saved.id === note.id ||
        (saved.context === note.context &&
          saved.observation === note.observation),
    )
  )
    return notes;
  if (notes.length >= NOTEBOOK_LIMIT)
    throw new Error(
      'Your notebook has 40 notes. Download it and remove a note to make room.',
    );
  return [note, ...notes];
}

export function evidenceText(note: EvidenceRecord): string {
  return `${note.context}\n\nCAPTURED\n${note.captured}\n\nMY OBSERVATION\n${note.observation.trim() || '(No observation added.)'}\n`;
}

export function notebookText(notes: EvidenceRecord[]): string {
  return `PART D EXPLORER · FIELD NOTEBOOK\n${notes.length} saved discoveries\n\n${notes.map(evidenceText).join('\n' + '─'.repeat(64) + '\n\n')}`;
}

/** Merge atomically: duplicate content is skipped, conflicting IDs are reassigned. */
export function mergeNotebook(
  current: EvidenceRecord[],
  incoming: EvidenceRecord[],
) {
  // Validate both sides before creating any result or writing to browser storage.
  parseNotebook(serializeNotebook(current));
  parseNotebook(serializeNotebook(incoming));
  const accepted: EvidenceRecord[] = [];
  const ids = new Set(current.map((note) => note.id));
  let duplicates = 0,
    sequence = 0;
  for (const note of incoming) {
    if (
      [...current, ...accepted].some(
        (saved) =>
          saved.context === note.context &&
          saved.observation === note.observation &&
          saved.year === note.year,
      )
    ) {
      duplicates++;
      continue;
    }
    let id = note.id;
    while (ids.has(id)) id = `import-${++sequence}`;
    ids.add(id);
    accepted.push({ ...note, id });
  }
  if (current.length + accepted.length > NOTEBOOK_LIMIT)
    throw new Error(
      `This import would exceed the ${NOTEBOOK_LIMIT}-note limit. Export a backup and remove some notes first; nothing has been changed.`,
    );
  return {
    notes: [...accepted, ...current],
    added: accepted.length,
    duplicates,
  };
}
