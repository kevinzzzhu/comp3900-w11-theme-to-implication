// TUTOR_ONLY: class board. Watches several group rooms read-only and shows what each group wrote.
// It joins in watch mode, so it adds no presence and creates nothing. Codes are held in memory only.
import { isValidCode, normaliseCode, pickTransport, prettyCode } from '../sync/config';
import type { RoomConn, Tree } from '../sync/types';
import { copyButton } from '../ui/components';
import { h } from '../ui/dom';

export interface BoardCode {
  label: string;
  code: string;
}

interface Card {
  label: string;
  code: string;
  online: number;
  conn: RoomConn | null;
  tree: Tree;
  state: 'connecting' | 'watching' | 'error';
  message: string;
  el: HTMLElement;
}

const leaf = (tree: Tree, key: string): string => {
  const v = tree[key];
  return typeof v === 'string' ? v.trim() : '';
};

/** Parse "label, code" or "code" lines into valid, de-duplicated entries. */
export function parseCodes(text: string): { items: BoardCode[]; warnings: string[] } {
  const items: BoardCode[] = [];
  const warnings: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    const codePart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const code = normaliseCode(codePart);
    const label = parts.length > 1 ? parts.slice(0, -1).join(', ') : `Group ${items.length + 1}`;
    if (!isValidCode(code)) {
      warnings.push(`Line ${i + 1}: "${codePart}" is not a valid room code`);
      return;
    }
    if (items.some((x) => x.code === code)) return;
    items.push({ label: label || `Group ${items.length + 1}`, code });
  });
  return { items, warnings };
}

export function mountBoard(getBuilderCodes: () => BoardCode[]): { el: HTMLElement; stop(): void } {
  const cards: Card[] = [];
  const grid = h('div', { class: 'tb-grid', 'aria-live': 'polite' });
  const warn = h('div', { class: 'td-warn', role: 'status', 'aria-live': 'polite' });
  const input = h('textarea', {
    class: 'tb-codes',
    rows: 4,
    placeholder: 'One group per line: label, code   (for example  Group 1, K7M-3QX)',
    spellcheck: false,
    'aria-label': 'Group room codes to watch',
  });
  const useBuilder = h('button', { type: 'button', class: 'btn btn-small' }, 'Use the group builder codes');
  const watchBtn = h('button', { type: 'button', class: 'btn btn-primary btn-small' }, 'Watch these rooms');
  const stopBtn = h('button', { type: 'button', class: 'btn btn-small' }, 'Stop');
  const fullBtn = h('button', { type: 'button', class: 'btn btn-small', 'aria-pressed': 'false' }, 'Full screen board');

  const root = h(
    'div',
    { class: 'td-panel tb-root' },
    h('p', { class: 'small muted' }, 'Read-only view of what each group has written. Needs the groups to be in their rooms; you can see theme and implication as they type.'),
    input,
    h('div', { class: 'btn-row' }, useBuilder, watchBtn, stopBtn, fullBtn),
    warn,
    grid,
  );

  const summary = (): string =>
    cards
      .map((c) => {
        const t = leaf(c.tree, 't3_shareTheme');
        const i = leaf(c.tree, 't3_shareImplication');
        return `${c.label} (${prettyCode(c.code)})\nTheme: ${t || '(not shared yet)'}\nImplication: ${i || '(not shared yet)'}`;
      })
      .join('\n\n');
  const copy = copyButton('Copy board text', summary, 'btn btn-small');
  root.querySelector('.btn-row')?.append(copy);

  const paint = (c: Card): void => {
    const shareTheme = leaf(c.tree, 't3_shareTheme');
    const shareImpl = leaf(c.tree, 't3_shareImplication');
    const draft = [leaf(c.tree, 't1_themeName'), leaf(c.tree, 't1_themeConcept')].filter(Boolean).join(': ');
    const revised = leaf(c.tree, 't2_revName');
    const level = shareTheme && shareImpl ? 'done' : draft || shareTheme || shareImpl ? 'partial' : 'empty';
    c.el.className = `tb-card is-${level}`;
    c.el.replaceChildren(
      h(
        'header',
        { class: 'tb-head' },
        h('strong', null, c.label),
        h('span', { class: 'tb-code' }, prettyCode(c.code)),
        h('span', { class: 'tb-online' }, c.state === 'error' ? 'error' : c.state === 'connecting' ? 'connecting' : `${c.online} here`),
      ),
      ...(c.state === 'error' ? [h('p', { class: 'td-warn' }, c.message)] : []),
      h('p', { class: 'tb-label' }, 'Theme'),
      h('p', { class: shareTheme ? 'tb-text' : 'tb-text is-empty' }, shareTheme || (draft ? `Not on the card yet. Task 1 draft: ${draft}` : 'Nothing yet')),
      ...(revised ? [h('p', { class: 'tb-meta' }, `Task 2 revised theme name: ${revised}`)] : []),
      h('p', { class: 'tb-label' }, 'Implication'),
      h('p', { class: shareImpl ? 'tb-text' : 'tb-text is-empty' }, shareImpl || 'Nothing yet'),
    );
  };

  const stop = (): void => {
    cards.splice(0).forEach((c) => c.conn?.close());
    grid.replaceChildren();
  };

  const start = async (): Promise<void> => {
    stop();
    const { items, warnings } = parseCodes(input.value);
    warn.replaceChildren(...warnings.map((w) => h('p', null, w)));
    if (!items.length) return;
    const transport = await pickTransport();
    if (!transport) {
      warn.append(h('p', null, 'Group rooms are not set up in this build.'));
      return;
    }
    for (const it of items) {
      const card: Card = { ...it, online: 0, conn: null, tree: {}, state: 'connecting', message: '', el: h('article', { class: 'tb-card' }) };
      cards.push(card);
      grid.append(card.el);
      paint(card);
      transport
        .join(it.code, { watch: true })
        .then((conn) => {
          if (!cards.includes(card)) {
            conn.close();
            return;
          }
          card.conn = conn;
          card.state = 'watching';
          conn.onTree((t) => {
            card.tree = t;
            paint(card);
          });
          conn.onPresence((n) => {
            card.online = n;
            paint(card);
          });
          paint(card);
        })
        .catch((e: unknown) => {
          card.state = 'error';
          card.message = e instanceof Error ? e.message : 'Could not watch this room.';
          paint(card);
        });
    }
  };

  useBuilder.addEventListener('click', () => {
    const codes = getBuilderCodes();
    if (!codes.length) {
      warn.replaceChildren(h('p', null, 'Build groups on the Groups tab first; each group gets a room code there.'));
      return;
    }
    input.value = codes.map((c) => `${c.label}, ${c.code}`).join('\n');
    warn.replaceChildren();
  });
  watchBtn.addEventListener('click', () => void start());
  stopBtn.addEventListener('click', stop);

  // The drawer is transformed, which would trap a fixed overlay inside its own width; move the board to <body> while full.
  const home = document.createComment('class board');
  const setFull = (on: boolean): void => {
    if (on && !home.parentNode) {
      root.before(home);
      document.body.append(root);
    } else if (!on && home.parentNode) {
      home.replaceWith(root);
    }
    root.classList.toggle('is-full', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.textContent = on ? 'Exit full screen board' : 'Full screen board';
  };
  fullBtn.addEventListener('click', () => setFull(!root.classList.contains('is-full')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-full')) setFull(false);
  });

  return { el: root, stop };
}
