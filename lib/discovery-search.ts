import Fuse from 'fuse.js';

export type SearchDocument = { value: string; keywords?: string[] };

/** Match each word independently, preserving exact short state abbreviations. */
export function createDiscoverySearch(documents: SearchDocument[]) {
  const fuse = new Fuse(documents, {
    keys: ['value', 'keywords'],
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
    ignoreFieldNorm: true,
  });
  return (query: string): Map<string, number> => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return new Map(documents.map((doc) => [doc.value, 1]));
    let scores: Map<string, number> | null = null;
    for (const word of words) {
      const next =
        word.length <= 2
          ? new Map(
              documents
                .filter((doc) =>
                  [doc.value, ...(doc.keywords ?? [])]
                    .join(' ')
                    .toLowerCase()
                    .split(/[^a-z0-9]+/)
                    .includes(word),
                )
                .map((doc) => [doc.value, 1]),
            )
          : new Map(
              fuse
                .search(word)
                .map((hit) => [hit.item.value, 1 - (hit.score ?? 0)]),
            );
      if (scores === null) scores = next;
      else
        for (const [value, score] of scores) {
          if (!next.has(value)) scores.delete(value);
          else scores.set(value, Math.min(score, next.get(value)!));
        }
    }
    return scores ?? new Map();
  };
}
