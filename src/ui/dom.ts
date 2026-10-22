export type Child = Node | string | number | null | undefined | false | Child[];
export type Attrs = Record<string, unknown>;

const PROPS = new Set(['value', 'checked', 'disabled', 'open', 'hidden', 'selected', 'readOnly', 'tabIndex', 'rows', 'required']);

function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

/** Tiny hyperscript helper. Never uses innerHTML, so all text is escaped. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (PROPS.has(k)) (el as unknown as Record<string, unknown>)[k] = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

export function clear(el: Element): void {
  el.replaceChildren();
}

let uidCounter = 0;
export function uid(prefix = 'id'): string {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return hh > 0 ? `${hh}:${p(mm)}:${p(ss)}` : `${mm}:${p(ss)}`;
}

/** Parse "3:25", "1:02:03" or "205" into seconds; returns null when invalid. */
export function parseTime(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p.trim()))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p.trim()), 0);
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Counts sentences by terminal punctuation; trailing text without punctuation counts as one. */
export function sentenceCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim().length > 0).length;
}

export function prefersReduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
