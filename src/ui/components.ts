import { webglAvailable } from '../scenes/util';
import type { SceneHandle } from '../scenes/util';
import { h, sentenceCount, uid, wordCount, type Child } from './dom';
import { isGroupKey } from '../sync/room';
import { roomBar } from './roombar';
import { getChecks, getRowIds, getRows, getText, newRowId, setChecks, setRowIds, setRows, setText, subscribeKey } from './state';

export interface PageCtx {
  onDispose(fn: () => void): void;
  afterMount(fn: () => void): void;
}

/* ---------- textarea auto-grow ---------- */

export function autogrow(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  if (ta.scrollHeight > 0) ta.style.height = `${ta.scrollHeight + 2}px`;
}

export function growAll(root: ParentNode = document): void {
  root.querySelectorAll('textarea').forEach((t) => autogrow(t));
}

document.addEventListener(
  'toggle',
  (e) => {
    const t = e.target;
    if (t instanceof HTMLElement) growAll(t);
  },
  true,
);
window.addEventListener('resize', () => growAll());

function makeTextarea(opts: { id?: string; rows?: number; placeholder?: string; label?: string; value: string; onInput(v: string): void }): HTMLTextAreaElement {
  const ta = h('textarea', {
    id: opts.id,
    rows: opts.rows ?? 3,
    placeholder: opts.placeholder,
    'aria-label': opts.label,
    spellcheck: true,
    class: 'autogrow',
  });
  ta.value = opts.value;
  ta.addEventListener('input', () => {
    autogrow(ta);
    opts.onInput(ta.value);
  });
  requestAnimationFrame(() => autogrow(ta));
  return ta;
}


/** Keep a field in step with edits that arrive from a group room. Never overwrites a field being typed in. */
function followRemote(key: string, el: HTMLTextAreaElement | HTMLInputElement): void {
  if (!isGroupKey(key)) return;
  let pending: string | null = null;
  const apply = (v: string): void => {
    if (el.value === v) return;
    el.value = v;
    if (el instanceof HTMLTextAreaElement) autogrow(el);
    el.classList.add('just-synced');
    window.setTimeout(() => el.classList.remove('just-synced'), 1200);
  };
  const unsub = subscribeKey(key, () => {
    if (!el.isConnected) {
      unsub();
      return;
    }
    const v = getText(key);
    if (document.activeElement === el) pending = v;
    else apply(v);
  });
  el.addEventListener('blur', () => {
    if (pending !== null) {
      apply(pending);
      pending = null;
    }
  });
  el.addEventListener('input', () => {
    pending = null; // our own newer typing supersedes anything held back
  });
}

/* ---------- counters ---------- */

export type CounterSpec =
  | { kind: 'words'; min: number; max: number }
  | { kind: 'sentences'; min: number; max: number };

type Level = 'low' | 'ok' | 'high';

function levelMessage(spec: CounterSpec, n: number): { level: Level; text: string } {
  const unit = spec.kind === 'words' ? 'words' : n === 1 ? 'sentence' : 'sentences';
  if (n < spec.min) {
    const need = spec.min - n;
    return { level: 'low', text: `${n} ${unit}: under the target, aim for ${spec.min} to ${spec.max} (${need} more ${spec.kind === 'words' ? 'words' : need === 1 ? 'sentence' : 'sentences'})` };
  }
  if (n > spec.max) {
    const over = n - spec.max;
    return { level: 'high', text: `${n} ${unit}: over the limit by ${over}, trim to ${spec.max} or fewer` };
  }
  return { level: 'ok', text: `${n} ${unit}: in range (${spec.min} to ${spec.max})` };
}

function attachCounter(ta: HTMLTextAreaElement, spec: CounterSpec): HTMLElement {
  const visible = h('p', { class: 'counter', 'aria-hidden': 'true' });
  const live = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  let lastLevel: Level | '' = '';
  const update = (): void => {
    const n = spec.kind === 'words' ? wordCount(ta.value) : sentenceCount(ta.value);
    const m = levelMessage(spec, n);
    visible.textContent = m.text;
    visible.className = `counter is-${m.level}`;
    if (m.level !== lastLevel) {
      live.textContent = m.text;
      lastLevel = m.level;
    }
  };
  ta.addEventListener('input', update);
  update();
  return h('div', null, visible, live);
}

/* ---------- text field ---------- */

export interface TextFieldOpts {
  key: string;
  label: string;
  hint?: string;
  rows?: number;
  placeholder?: string;
  single?: boolean;
  counter?: CounterSpec;
  big?: boolean;
}

export function textField(o: TextFieldOpts): HTMLElement {
  const id = uid('f');
  const hintId = `${id}-hint`;
  const wrap = h('div', { class: `field${o.big ? ' field-big' : ''}` });
  wrap.append(h('label', { for: id }, o.label));
  if (o.hint) wrap.append(h('p', { class: 'hint', id: hintId }, o.hint));
  if (o.single) {
    const inp = h('input', { id, type: 'text', placeholder: o.placeholder, autocomplete: 'off', value: getText(o.key) });
    if (o.hint) inp.setAttribute('aria-describedby', hintId);
    inp.addEventListener('input', () => setText(o.key, inp.value));
    followRemote(o.key, inp);
    wrap.append(inp);
    return wrap;
  }
  const ta = makeTextarea({ id, rows: o.rows, placeholder: o.placeholder, value: getText(o.key), onInput: (v) => setText(o.key, v) });
  if (o.hint) ta.setAttribute('aria-describedby', hintId);
  followRemote(o.key, ta);
  wrap.append(ta);
  if (o.counter) wrap.append(attachCounter(ta, o.counter));
  return wrap;
}

/** Textarea bound to a state key without a visible label wrapper (caller supplies the label). */
export function boundTextarea(key: string, label: string, rows = 3, onChange?: (v: string) => void): HTMLTextAreaElement {
  const ta = makeTextarea({
    rows,
    label,
    value: getText(key),
    onInput: (v) => {
      setText(key, v);
      onChange?.(v);
    },
  });
  followRemote(key, ta);
  return ta;
}

/* ---------- checklist ---------- */

export function checkList(key: string, items: string[], opts: { onChange?(state: boolean[]): void; legend?: string; describe?: (i: number) => string | undefined } = {}): HTMLElement {
  const state = getChecks(key, items.length);
  const set = h('fieldset', { class: 'checklist' });
  if (opts.legend) set.append(h('legend', null, opts.legend));
  items.forEach((label, i) => {
    const id = uid('c');
    const cb = h('input', { type: 'checkbox', id, checked: state[i] });
    cb.addEventListener('change', () => {
      state[i] = cb.checked;
      setChecks(key, state);
      opts.onChange?.([...state]);
    });
    const desc = opts.describe?.(i);
    set.append(h('div', { class: 'check' }, cb, h('label', { for: id }, label, desc ? h('span', { class: 'check-desc' }, desc) : null)));
  });
  if (isGroupKey(key)) {
    const unsub = subscribeKey(key, () => {
      if (!set.isConnected) {
        unsub();
        return;
      }
      const next = getChecks(key, items.length);
      set.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((box, i) => {
        state[i] = next[i];
        box.checked = next[i];
      });
      opts.onChange?.([...next]);
    });
  }
  return set;
}

/* ---------- editable table ---------- */

export interface TableOpts {
  key: string;
  cols: string[];
  defaultRows: string[][];
  caption: string;
  lockFirstCol?: boolean;
  fixedRows?: boolean;
  minRows?: number;
  addLabel?: string;
  placeholders?: string[];
  /** Keep a stable id per row (always on for group tables). */
  trackIds?: boolean;
}

export interface TableHandle {
  el: HTMLElement;
  addRow(values?: string[]): void;
  /** Put values in the first blank row, or add a row when none is blank. Returns the 1-based row number used. */
  fillRow(values: string[]): number;
  /** Called after every local edit to the table. */
  onChange(cb: () => void): void;
  /** Current rows with their stable ids (ids are empty strings unless ids are tracked). */
  snapshot(): { id: string; cells: string[] }[];
}

function normaliseRows(o: TableOpts, stored: string[][] | null): string[][] {
  const base = stored && stored.length ? stored : o.defaultRows;
  const rows = base.map((r) => o.cols.map((_, i) => r[i] ?? ''));
  if (o.fixedRows) {
    return o.defaultRows.map((d, i) => o.cols.map((_, j) => (j === 0 && o.lockFirstCol ? d[0] ?? '' : rows[i]?.[j] ?? '')));
  }
  return rows;
}

export function editableTable(o: TableOpts): TableHandle {
  const shared = isGroupKey(o.key);
  const track = shared || !!o.trackIds; // stable row ids, so other parts of the page can follow individual rows
  const changeCbs: (() => void)[] = [];
  const rows = normaliseRows(o, getRows(o.key));
  const ids: string[] = track ? getRowIds(o.key).slice(0, rows.length) : [];
  if (track) {
    while (ids.length < rows.length) ids.push(newRowId());
    setRowIds(o.key, ids); // persist now so the room and this table agree on row ids
  }
  const min = o.minRows ?? 1;
  const tbody = h('tbody');
  let cells: HTMLTextAreaElement[][] = [];
  const save = (): void => {
    if (track) setRowIds(o.key, ids);
    setRows(o.key, rows);
    changeCbs.forEach((cb) => cb());
  };

  const render = (focusRow = -1): void => {
    tbody.replaceChildren();
    cells = [];
    rows.forEach((row, ri) => {
      const tr = h('tr');
      const rowCells: HTMLTextAreaElement[] = [];
      row.forEach((val, ci) => {
        if (ci === 0 && o.lockFirstCol) {
          tr.append(h('th', { scope: 'row', 'data-label': o.cols[0] }, val));
          rowCells[ci] = undefined as unknown as HTMLTextAreaElement;
          return;
        }
        const ta = makeTextarea({
          rows: 2,
          label: `${o.cols[ci]}, row ${ri + 1}`,
          placeholder: o.placeholders?.[ci],
          value: val,
          onInput: (v) => {
            rows[ri][ci] = v;
            save();
          },
        });
        rowCells[ci] = ta;
        tr.append(h('td', { 'data-label': o.cols[ci] }, ta));
      });
      cells.push(rowCells);
      if (!o.fixedRows) {
        const rm = h(
          'button',
          {
            type: 'button',
            class: 'btn btn-quiet btn-small',
            'aria-label': `Remove row ${ri + 1}`,
            disabled: rows.length <= min,
            onClick: () => {
              rows.splice(ri, 1);
              if (track) ids.splice(ri, 1);
              save();
              render(Math.min(ri, rows.length - 1));
            },
          },
          'Remove',
        );
        tr.append(h('td', { class: 'row-actions' }, rm));
      }
      tbody.append(tr);
    });
    if (focusRow >= 0) {
      const t = tbody.querySelectorAll('tr')[focusRow]?.querySelector('textarea');
      t?.focus();
    }
  };

  const addRow = (values?: string[], focus = true): void => {
    rows.push(o.cols.map((_, i) => values?.[i] ?? ''));
    if (track) ids.push(newRowId());
    save();
    render(focus ? rows.length - 1 : -1);
  };

  const fillRow = (values: string[]): number => {
    const blank = rows.findIndex((r) => r.every((c) => c.trim() === ''));
    if (blank >= 0) {
      rows[blank] = o.cols.map((_, i) => values[i] ?? '');
      save();
      render();
      return blank + 1;
    }
    addRow(values, false);
    return rows.length;
  };

  if (shared) {
    // A groupmate changed the table: take their rows, but never disturb the cell being typed in.
    const unsub = subscribeKey(o.key, () => {
      if (!tbody.isConnected) {
        unsub();
        return;
      }
      const active = document.activeElement;
      let focus: { id: string; col: number; value: string; start: number | null; end: number | null } | null = null;
      cells.forEach((rc, ri) =>
        rc.forEach((ta, ci) => {
          if (ta && ta === active) focus = { id: ids[ri], col: ci, value: ta.value, start: ta.selectionStart, end: ta.selectionEnd };
        }),
      );
      const nextRows = normaliseRows(o, getRows(o.key));
      const nextIds = getRowIds(o.key).slice(0, nextRows.length);
      while (nextIds.length < nextRows.length) nextIds.push(newRowId());
      const sameShape = nextIds.join(',') === ids.join(',');
      rows.splice(0, rows.length, ...nextRows);
      ids.splice(0, ids.length, ...nextIds);
      const f = focus as { id: string; col: number; value: string; start: number | null; end: number | null } | null;
      if (f) {
        const fr = ids.indexOf(f.id);
        if (fr >= 0) {
          rows[fr][f.col] = f.value; // our own typing wins locally
          save();
        }
      }
      if (sameShape) {
        rows.forEach((row, ri) =>
          row.forEach((val, ci) => {
            const ta = cells[ri]?.[ci];
            if (ta && ta !== active && ta.value !== val) {
              ta.value = val;
              autogrow(ta);
              ta.classList.add('just-synced');
              window.setTimeout(() => ta.classList.remove('just-synced'), 1200);
            }
          }),
        );
        return;
      }
      render();
      if (f) {
        const fr = ids.indexOf(f.id);
        const ta = cells[fr]?.[f.col];
        if (ta) {
          ta.focus();
          if (f.start !== null && f.end !== null) ta.setSelectionRange(f.start, f.end);
        }
      }
    });
  }

  const head = h('tr', null, o.cols.map((c) => h('th', { scope: 'col' }, c)), o.fixedRows ? null : h('th', { scope: 'col', class: 'row-actions' }, h('span', { class: 'sr-only' }, 'Row actions')));
  const table = h('table', { class: 'etable' }, h('caption', { class: 'sr-only' }, o.caption), h('thead', null, head), tbody);
  const el = h('div', { class: 'table-wrap' }, table);
  if (!o.fixedRows) {
    el.append(h('div', { class: 'table-actions' }, h('button', { type: 'button', class: 'btn btn-small', onClick: () => addRow() }, o.addLabel ?? 'Add row')));
  }
  render();
  return {
    el,
    addRow: (v) => addRow(v),
    fillRow,
    onChange: (cb) => changeCbs.push(cb),
    snapshot: () => rows.map((r, i) => ({ id: ids[i] ?? '', cells: [...r] })),
  };
}

/* ---------- layout helpers ---------- */

export function stepHeader(step: string, title: string, minutes: number, mode: 'Individual' | 'Group' | 'Whole class'): HTMLElement {
  return h(
    'div',
    { class: 'step-head' },
    h('h2', null, `${step}: ${title}`),
    h('p', { class: 'step-meta' }, h('span', { class: 'pill' }, `${minutes} min`), h('span', { class: 'pill pill-alt' }, mode)),
  );
}

export function pageHeader(title: string, lead: Child, meta?: Child): HTMLElement {
  return h('header', { class: 'page-head' }, h('h1', { tabindex: -1 }, title), lead ? h('p', { class: 'lead' }, lead) : null, meta ?? null);
}

export function quoteBox(...children: Child[]): HTMLElement {
  return h('blockquote', { class: 'quote-box' }, ...children);
}

export interface WidgetPanel {
  el: HTMLElement;
  stage: HTMLElement;
  /** true when WebGL is available and a scene should be mounted */
  canMount: boolean;
}

/** Wrapper for a 3D widget: text description for assistive tech, graceful when WebGL is missing. */
export function widgetPanel(title: string, description: string, side?: Child): WidgetPanel {
  const canMount = webglAvailable();
  const descId = uid('wd');
  const stage = h('div', { class: 'widget-stage', role: 'img', 'aria-label': title, 'aria-describedby': descId });
  const el = h(
    'section',
    { class: 'panel widget', 'aria-label': title },
    h('h3', null, title),
    h('p', { class: 'widget-desc small', id: descId }, description),
    canMount ? stage : h('p', { class: 'widget-fallback' }, '3D view is not available in this browser. Everything you need is in the controls and tables on this page.'),
    side ?? null,
  );
  return { el, stage, canMount };
}

/** Mount a scene defensively; a scene error must never break the rest of the page. */
export function mountScene<T extends SceneHandle>(ctx: PageCtx, panel: WidgetPanel, make: (el: HTMLElement) => T): T | null {
  if (!panel.canMount) return null;
  try {
    const handle = make(panel.stage);
    ctx.onDispose(() => {
      try {
        handle.dispose();
      } catch {
        /* ignore */
      }
    });
    return handle;
  } catch (err) {
    console.error('scene failed to mount', err);
    panel.stage.replaceWith(h('p', { class: 'widget-fallback' }, '3D view failed to load. You can still use everything else on this page.'));
    return null;
  }
}

/** Mount a scene the first time its stage is actually visible (not in a hidden step or closed <details>). */
export interface LazyScene<T> {
  get(): T | null;
  /** run now if mounted, otherwise as soon as it mounts */
  ready(fn: (handle: T) => void): void;
}

/** Scenes waiting for their stage to be displayed (not inside a hidden step or a closed <details>). */
const pendingScenes = new Set<() => boolean>();

/** Mount every pending scene whose stage is now laid out. Safe to call often. */
export function flushPendingScenes(): void {
  for (const attempt of [...pendingScenes]) {
    if (attempt()) pendingScenes.delete(attempt);
  }
}

document.addEventListener('toggle', () => flushPendingScenes(), true);

export function mountWhenVisible<T extends SceneHandle>(ctx: PageCtx, panel: WidgetPanel, make: (el: HTMLElement) => T): LazyScene<T> {
  let handle: T | null = null;
  const queue: ((h: T) => void)[] = [];
  if (panel.canMount) {
    const attempt = (): boolean => {
      if (!panel.stage.isConnected) return false;
      if (panel.stage.getClientRects().length === 0) return false; // display:none somewhere above
      handle = mountScene(ctx, panel, make);
      if (handle) queue.splice(0).forEach((fn) => fn(handle as T));
      return true;
    };
    pendingScenes.add(attempt);
    ctx.afterMount(flushPendingScenes);
    ctx.onDispose(() => pendingScenes.delete(attempt));
  }
  return {
    get: () => handle,
    ready(fn) {
      if (handle) fn(handle);
      else queue.push(fn);
    },
  };
}

/** A closed-by-default section for secondary material. */
export function collapsible(summary: string, children: Child[], opts: { open?: boolean; className?: string } = {}): HTMLDetailsElement {
  const d = h('details', { class: `panel ${opts.className ?? ''}`.trim() }, h('summary', null, summary), ...children) as HTMLDetailsElement;
  if (opts.open) d.open = true;
  return d;
}

/* ---------- stepper: one step on screen at a time ---------- */

export interface StepDef {
  title: string;
  minutes?: number;
  mode?: 'Individual' | 'Group' | 'Whole class';
  /** Show the group room strip even on a step that is not a group step. */
  room?: boolean;
  /** Replaces the strip's "what is shared" sentence for this step. */
  roomNote?: string;
  body: Child[];
}

export function stepper(key: string, steps: StepDef[], finish?: Child, onShow?: (i: number) => void): HTMLElement {
  const storeKey = `w11:ui.step.${key}`;
  let current = 0;
  try {
    const saved = Number(localStorage.getItem(storeKey));
    if (Number.isInteger(saved) && saved >= 0 && saved < steps.length) current = saved;
  } catch {
    /* storage unavailable: start at the first step */
  }

  const root = h('div', { class: 'stepper' });
  const navButtons: HTMLButtonElement[] = [];
  const panels: HTMLElement[] = [];

  const nav = h('ol', { class: 'step-nav', 'aria-label': 'Steps' });
  steps.forEach((st, i) => {
    const b = h(
      'button',
      { type: 'button', class: 'step-tab', onClick: () => show(i, true) },
      h('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
      h('span', { class: 'step-tab-text' }, h('strong', null, st.title), st.minutes ? h('small', null, `${st.minutes} min${st.mode ? ` · ${st.mode}` : ''}`) : null),
    );
    navButtons.push(b);
    nav.append(h('li', null, b));
  });
  root.append(nav);

  steps.forEach((st, i) => {
    const last = i === steps.length - 1;
    const foot = h(
      'div',
      { class: 'step-foot' },
      i > 0 ? h('button', { type: 'button', class: 'btn', onClick: () => show(i - 1, true) }, 'Back') : h('span'),
      last
        ? (finish ?? h('span'))
        : h('button', { type: 'button', class: 'btn btn-primary', onClick: () => show(i + 1, true) }, `Next: ${steps[i + 1].title}`),
    );
    const heading = h('h2', { tabindex: -1 }, st.title);
    const panel = h(
      'section',
      { class: 'step-panel', 'aria-label': st.title },
      h(
        'div',
        { class: 'step-head' },
        heading,
        st.minutes ? h('p', { class: 'step-meta' }, h('span', { class: 'pill' }, `${st.minutes} min`), st.mode ? h('span', { class: 'pill pill-alt' }, st.mode) : null) : null,
      ),
      st.mode === 'Group' || st.mode === 'Whole class' || st.room ? roomBar(st.roomNote) : null,
      ...st.body,
      foot,
    );
    panel.hidden = true;
    panels.push(panel);
    root.append(panel);
  });

  function show(i: number, move: boolean): void {
    current = i;
    panels.forEach((p, k) => {
      p.hidden = k !== i;
    });
    navButtons.forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.classList.toggle('is-done', k < i);
    });
    try {
      localStorage.setItem(storeKey, String(i));
    } catch {
      /* ignore */
    }
    onShow?.(i);
    growAll(panels[i]);
    flushPendingScenes();
    if (move) {
      root.scrollIntoView({ behavior: 'auto', block: 'start' });
      (panels[i].querySelector('h2') as HTMLElement | null)?.focus({ preventScroll: true });
    }
  }
  // Other parts of the page can ask this stepper to open a step, e.g. after copying into a table on another step.
  const onGoto = (e: Event): void => {
    const d = (e as CustomEvent<{ key: string; index: number }>).detail;
    if (!root.isConnected) {
      window.removeEventListener('w11:goto-step', onGoto);
      return;
    }
    if (d.key === key && d.index >= 0 && d.index < steps.length) show(d.index, true);
  };
  window.addEventListener('w11:goto-step', onGoto);
  show(current, false);
  return root;
}

/* ---------- clipboard / download ---------- */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to textarea */
  }
  const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;left:-9999px;top:0;opacity:0' });
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function downloadText(filename: string, text: string, mime = 'text/markdown'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A button that copies text produced by `get` and reports briefly. */
export function copyButton(label: string, get: () => string, cls = 'btn btn-small'): HTMLElement {
  const status = h('span', { class: 'copy-status small', role: 'status', 'aria-live': 'polite' });
  const btn = h('button', {
    type: 'button',
    class: cls,
    onClick: async () => {
      const ok = await copyText(get());
      status.textContent = ok ? 'Copied' : 'Copy failed, select the text and copy it manually';
      window.setTimeout(() => (status.textContent = ''), 2500);
    },
  }, label);
  return h('span', { class: 'copy-wrap' }, btn, status);
}
