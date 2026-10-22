import { webglAvailable } from '../scenes/util';
import type { SceneHandle } from '../scenes/util';
import { h, sentenceCount, uid, wordCount, type Child } from './dom';
import { getChecks, getRows, getText, setChecks, setRows, setText } from './state';

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
    wrap.append(inp);
    return wrap;
  }
  const ta = makeTextarea({ id, rows: o.rows, placeholder: o.placeholder, value: getText(o.key), onInput: (v) => setText(o.key, v) });
  if (o.hint) ta.setAttribute('aria-describedby', hintId);
  wrap.append(ta);
  if (o.counter) wrap.append(attachCounter(ta, o.counter));
  return wrap;
}

/** Textarea bound to a state key without a visible label wrapper (caller supplies the label). */
export function boundTextarea(key: string, label: string, rows = 3, onChange?: (v: string) => void): HTMLTextAreaElement {
  return makeTextarea({
    rows,
    label,
    value: getText(key),
    onInput: (v) => {
      setText(key, v);
      onChange?.(v);
    },
  });
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
}

export interface TableHandle {
  el: HTMLElement;
  addRow(values?: string[]): void;
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
  const rows = normaliseRows(o, getRows(o.key));
  const min = o.minRows ?? 1;
  const tbody = h('tbody');
  const save = (): void => setRows(o.key, rows);

  const render = (focusRow = -1): void => {
    tbody.replaceChildren();
    rows.forEach((row, ri) => {
      const tr = h('tr');
      row.forEach((val, ci) => {
        if (ci === 0 && o.lockFirstCol) {
          tr.append(h('th', { scope: 'row', 'data-label': o.cols[0] }, val));
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
        tr.append(h('td', { 'data-label': o.cols[ci] }, ta));
      });
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

  const addRow = (values?: string[]): void => {
    rows.push(o.cols.map((_, i) => values?.[i] ?? ''));
    save();
    render(rows.length - 1);
  };

  const head = h('tr', null, o.cols.map((c) => h('th', { scope: 'col' }, c)), o.fixedRows ? null : h('th', { scope: 'col', class: 'row-actions' }, h('span', { class: 'sr-only' }, 'Row actions')));
  const table = h('table', { class: 'etable' }, h('caption', { class: 'sr-only' }, o.caption), h('thead', null, head), tbody);
  const el = h('div', { class: 'table-wrap' }, table);
  if (!o.fixedRows) {
    el.append(h('div', { class: 'table-actions' }, h('button', { type: 'button', class: 'btn btn-small', onClick: () => addRow() }, o.addLabel ?? 'Add row')));
  }
  render();
  return { el, addRow };
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
