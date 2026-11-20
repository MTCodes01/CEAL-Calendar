/**
 * Performs fuzzy search on an array of items.
 * Ranks items by exact match, prefix match, substring match, and ordered subsequence match.
 *
 * @param {Array<T>} items
 * @param {string} query
 * @param {Function} [getLabel]
 * @returns {Array<T>}
 */
export function fuzzySearch(items, query, getLabel = (item) => item?.name || '') {
  if (!query || !query.trim()) return items;
  const q = query.trim().toLowerCase();

  const scored = [];
  for (const item of items) {
    const text = (getLabel(item) || '').toLowerCase();
    const slug = (item.slug || '').toLowerCase();

    // Exact match
    if (text === q || slug === q) {
      scored.push({ item, score: 100 });
      continue;
    }
    // Starts with
    if (text.startsWith(q) || slug.startsWith(q)) {
      scored.push({ item, score: 80 });
      continue;
    }
    // Substring match
    if (text.includes(q) || slug.includes(q)) {
      scored.push({ item, score: 60 });
      continue;
    }
    // Subsequence fuzzy match (e.g. "ics" matches "ieee cs", "hck" matches "hack404")
    let pIdx = 0;
    for (let tIdx = 0; tIdx < text.length && pIdx < q.length; tIdx++) {
      if (text[tIdx] === q[pIdx]) {
        pIdx++;
      }
    }
    if (pIdx === q.length) {
      scored.push({ item, score: 40 });
      continue;
    }
    // Subsequence against slug
    if (slug) {
      let sIdx = 0;
      for (let tIdx = 0; tIdx < slug.length && sIdx < q.length; tIdx++) {
        if (slug[tIdx] === q[sIdx]) {
          sIdx++;
        }
      }
      if (sIdx === q.length) {
        scored.push({ item, score: 30 });
      }
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}
