// TUTOR_ONLY: group builder logic. Names are never persisted anywhere.
import type { VideoId } from '../types';

export interface Student {
  name: string;
  video: VideoId | null;
}

const VIDEO_IDS: VideoId[] = ['simon', 'sarah', 'stacey'];

export function parseRoster(text: string): { students: Student[]; warnings: string[] } {
  const students: Student[] = [];
  const warnings: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    const name = parts[0];
    if (!name) {
      warnings.push(`Line ${i + 1}: no name`);
      return;
    }
    const v = (parts[1] ?? '').toLowerCase();
    const match = VIDEO_IDS.find((id) => id === v);
    if (!match) warnings.push(`Line ${i + 1}: "${parts[1] ?? ''}" is not simon, sarah or stacey; ${name} is treated as unassigned`);
    students.push({ name, video: match ?? null });
  });
  return { students, warnings };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Group sizes: groups of 4-5 where possible; one smaller group only when the whole class is under 4. */
export function groupSizes(n: number): number[] {
  if (n <= 0) return [];
  const g = Math.max(1, Math.floor(n / 4));
  const base = Math.floor(n / g);
  const rem = n % g;
  return Array.from({ length: g }, (_, i) => base + (i < rem ? 1 : 0));
}

export function buildGroups(students: Student[], rng: () => number = Math.random): Student[][] {
  const sizes = groupSizes(students.length);
  const groups: Student[][] = sizes.map(() => []);
  const key = (s: Student) => s.video ?? 'none';
  const counts = new Map<string, number>();
  students.forEach((s) => counts.set(key(s), (counts.get(key(s)) ?? 0) + 1));
  // Place the most common video first, so the scarce videos can fill the gaps.
  const ordered = shuffle(students, rng).sort((a, b) => (counts.get(key(b)) ?? 0) - (counts.get(key(a)) ?? 0));
  for (const s of ordered) {
    let best: number[] = [];
    let bestScore = Infinity;
    groups.forEach((g, gi) => {
      if (g.length >= sizes[gi]) return;
      const same = g.filter((x) => key(x) === key(s)).length;
      const score = same * 100 + g.length;
      if (score < bestScore) {
        bestScore = score;
        best = [gi];
      } else if (score === bestScore) best.push(gi);
    });
    const pick = best[Math.floor(rng() * best.length)] ?? 0;
    groups[pick].push(s);
  }
  return groups;
}

export function groupsToText(groups: Student[][], label: (v: VideoId | null) => string, codes: string[] = []): string {
  return groups
    .map((g, i) => `Group ${i + 1}${codes[i] ? ` (room ${codes[i]})` : ''} (${g.length}): ${g.map((s) => `${s.name} [${label(s.video)}]`).join(', ')}`)
    .join('\n');
}
