import { lensObservationIds, lenses } from '../../data/lenses';
import { observations } from '../../data/observations';
import { mountPrism } from '../../scenes/prism';
import { mountWall, type WallHandle, type WallNote, type WallPos } from '../../scenes/wall';
import { onRoom, onShared, roomState, sharedSet } from '../../sync/room';
import {
  boundTextarea, collapsible, editableTable, mountWhenVisible, pageHeader, quoteBox, stepper, textField, widgetPanel, type PageCtx,
} from '../components';
import { LENS_COLORS, t1ClusterCols, t1CodeCols, t1Discussion } from '../copy';
import { h, uid } from '../dom';
import { TimeLink, VideoChip, VideoPanel, personName } from '../video';
import type { VideoId } from '../../types';

const MEMBER_COLORS = ['#2B6672', '#B5527A', '#C48A1F', '#6A5ACD', '#3E8E5A', '#C0563B', '#5B7DB1', '#8C6D31'];

/** A random id for this browser, so a group's notes can be told apart without asking anyone's name. */
function memberId(): string {
  try {
    const have = localStorage.getItem('w11:me');
    if (have) return have;
    const fresh = Math.random().toString(36).slice(2, 8);
    localStorage.setItem('w11:me', fresh);
    return fresh;
  } catch {
    return 'me';
  }
}

interface CodeNote {
  id: string;
  code: string;
  excerpt: string;
  why: string;
  owner: string;
}

const clip = (v: string, n: number): string => v.trim().slice(0, n);

export function renderTask1(ctx: PageCtx): HTMLElement {
  const root = h('div', { class: 'page' });
  root.append(pageHeader('Task 1: From observations to themes', 'Code your video, cluster with your group, then draft a candidate theme.'), VideoPanel());

  /* ---------------- Step 1 ---------------- */
  const codeTable = editableTable({
    key: 't1.codes',
    cols: t1CodeCols,
    caption: 'Initial codes for your video: observation, code and reason',
    defaultRows: [['', '', ''], ['', '', ''], ['', '', '']],
    minRows: 1,
    addLabel: 'Add a row',
    placeholders: ['e.g. Simon 3:25, says the chair "is part of me"', 'A short label', 'What in the moment led to this code?'],
    trackIds: true,
  });

  const prismPanel = widgetPanel('Lens Prism', 'The same observations, coded through different assumptions.');
  const lensDetail = h('div', { class: 'lens-detail', 'aria-live': 'polite' });
  const lensRadioName = uid('lens');
  const lensOptions: HTMLElement[] = [];
  let currentLens = -1;
  const prism = mountWhenVisible(ctx, prismPanel, (el) => mountPrism(el, lenses.map((_, i) => LENS_COLORS[i % LENS_COLORS.length])));
  prism.ready((p) => p.setLens(currentLens));

  const showLens = (i: number): void => {
    currentLens = i;
    prism.get()?.setLens(i);
    lensDetail.replaceChildren();
    if (i < 0 || !lenses[i]) {
      lensDetail.append(h('p', { class: 'muted' }, 'Pick a lens to see what it would code.'));
      return;
    }
    const lens = lenses[i];
    lensDetail.append(h('p', null, h('strong', null, 'Assumption: '), lens.assumption));
    const list = h('ul', { class: 'lens-codes' });
    for (const id of lensObservationIds) {
      const o = observations.find((x) => x.id === id);
      const code = lens.codes[id];
      if (!o || code === undefined) continue;
      list.append(
        h('li', null, TimeLink(o.video, o.t, { prefix: `${personName(o.video)} ` }), ' ', h('span', { class: 'muted' }, o.excerpt), h('br'), h('span', { class: 'code-tag' }, `Code: ${code}`)),
      );
    }
    lensDetail.append(list.children.length ? list : h('p', { class: 'muted' }, 'No codes for this lens yet.'));
  };

  const mkOption = (value: number, title: string, color?: string): HTMLElement => {
    const id = uid('lo');
    const input = h('input', { type: 'radio', name: lensRadioName, id, checked: value === -1 });
    input.addEventListener('change', () => showLens(value));
    return h('div', { class: 'radio-row' }, input, h('label', { for: id }, color ? h('span', { class: 'swatch', style: `background:${color}`, 'aria-hidden': 'true' }) : null, h('strong', null, title)));
  };
  lensOptions.push(mkOption(-1, 'No lens'));
  lenses.forEach((l, i) => lensOptions.push(mkOption(i, l.name, LENS_COLORS[i % LENS_COLORS.length])));
  const lensPicker = h('fieldset', { class: 'lens-picker' }, h('legend', null, 'Choose a lens'), lensOptions);
  prismPanel.el.append(...(lenses.length ? [lensPicker, lensDetail] : [h('p', { class: 'muted' }, 'Lens details have not loaded.')]));
  showLens(-1);

  const step1 = [
    h('p', { class: 'instruction' }, 'Code 3-5 moments from your video. A code is a short label for what a moment is about. Your codes go on your group\'s wall in Step 2.'),
    textField({
      key: 't1.assumptions',
      label: 'What assumptions do you bring to this topic?',
      hint: 'Honest notes here are the raw material of reflexivity.',
      rows: 3,
    }),
    h('h3', null, 'Code table'),
    codeTable.el,
    collapsible('Optional: see how a different lens would code it', [
      prismPanel.el,
      textField({ key: 't1.lensNote', label: 'Which lens is closest to how you coded, and what might another lens have made you notice?', rows: 3 }),
    ]),
  ];

  /* ---------------- Step 2: the code wall ---------------- */
  // The wall is made of the codes written in Step 1. Your own come straight from the table; a group room adds everyone else's.
  const me = memberId();
  const notes = new Map<string, CodeNote>();
  const positions = new Map<string, WallPos>();
  const published = new Set<string>();

  const owners = (): string[] => [...new Set([me, ...[...notes.values()].map((n) => n.owner)])].sort();
  const colorOf = (owner: string): string => MEMBER_COLORS[Math.max(0, owners().indexOf(owner)) % MEMBER_COLORS.length];
  const toWall = (n: CodeNote): WallNote => ({ id: n.id, code: n.code, excerpt: n.excerpt, why: n.why, color: colorOf(n.owner), mine: n.owner === me });

  const cardHost = h('div', { class: 'obs-card-host', 'aria-live': 'polite' });
  const legend = h('ul', { class: 'wall-legend', 'aria-label': 'Who wrote which colour' });
  const gotoStep1 = (): void => {
    window.dispatchEvent(new CustomEvent('w11:goto-step', { detail: { key: 'task1', index: 0 } }));
  };
  const showHint = (): void => {
    const open = h('button', { type: 'button', class: 'btn btn-small' }, 'Add or edit codes in Step 1');
    open.addEventListener('click', gotoStep1);
    cardHost.replaceChildren(h('p', { class: 'muted' }, 'Click a note to read it here. Your codes come from your Step 1 table.'), open);
  };
  showHint();

  const paintLegend = (): void => {
    const others = owners().filter((o) => o !== me);
    legend.replaceChildren(
      ...[me, ...others].map((o) =>
        h('li', null, h('span', { class: 'swatch', style: `background:${colorOf(o)}`, 'aria-hidden': 'true' }), o === me ? 'You' : `Groupmate ${others.indexOf(o) + 1}`),
      ),
    );
  };

  const showCard = (id: string): void => {
    const n = notes.get(id);
    if (!n) return;
    const t = /(simon|sarah|stacey)\D{0,4}(\d{1,2}):(\d{2})/i.exec(n.excerpt);
    cardHost.replaceChildren(
      h(
        'article',
        { class: 'obs-card', style: `--vc:${colorOf(n.owner)}` },
        h('header', null, h('strong', null, n.code), ' ', t ? TimeLink(t[1].toLowerCase() as VideoId, Number(t[2]) * 60 + Number(t[3])) : null),
        n.excerpt ? quoteBox(n.excerpt) : null,
        n.why ? h('p', { class: 'small' }, h('strong', null, 'Why: '), n.why) : null,
        h('p', { class: 'small muted' }, n.owner === me ? 'Your code.' : 'A groupmate\'s code.'),
        n.owner === me ? (() => {
          const edit = h('button', { type: 'button', class: 'btn btn-small' }, 'Edit in Step 1');
          edit.addEventListener('click', gotoStep1);
          return edit;
        })() : null,
      ),
    );
  };

  const wallPanel = widgetPanel('Code Wall', 'Drag related codes together. Each colour is one person; your own notes are marked "you".');
  const wall = mountWhenVisible(ctx, wallPanel, (el) => mountWall(el, { onSelect: showCard }));

  const live = (): boolean => roomState().phase === 'live' || roomState().phase === 'offline';
  const posText = (p: WallPos): string => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const noteJson = (n: CodeNote): string => JSON.stringify({ c: n.code, e: n.excerpt, w: n.why, m: n.owner });
  const publishNote = (n: CodeNote): void => {
    sharedSet(['n', n.id], noteJson(n));
    const p = positions.get(n.id);
    if (p) sharedSet(['p', n.id], posText(p));
  };

  const placeNote = (g: WallHandle, n: CodeNote, at?: WallPos): void => {
    const where = g.upsert(toWall(n), at);
    if (where) positions.set(n.id, where);
  };
  const repaintAll = (g: WallHandle): void => {
    for (const n of notes.values()) g.upsert(toWall(n));
    paintLegend();
  };

  /** Mirror the Step 1 table onto the wall (and into the room when joined). */
  const syncOwn = (): void => {
    const fresh = new Map<string, CodeNote>();
    for (const row of codeTable.snapshot()) {
      const code = clip(row.cells[1] ?? '', 60);
      if (!row.id || !code) continue;
      fresh.set(row.id, { id: row.id, code, excerpt: clip(row.cells[0] ?? '', 160), why: clip(row.cells[2] ?? '', 200), owner: me });
    }
    for (const [id, n] of [...notes]) {
      if (n.owner !== me || fresh.has(id)) continue;
      notes.delete(id);
      positions.delete(id);
      published.delete(id);
      wall.ready((g) => g.remove(id));
      if (live()) {
        sharedSet(['n', id], null);
        sharedSet(['p', id], null);
      }
    }
    for (const [id, n] of fresh) {
      const before = notes.get(id);
      if (before && before.code === n.code && before.excerpt === n.excerpt && before.why === n.why) continue;
      const isNew = !before;
      notes.set(id, n);
      wall.ready((g) => {
        placeNote(g, n);
        if (isNew || live()) paintLegend();
        if (live()) publishNote(n);
      });
    }
    paintLegend();
  };
  codeTable.onChange(syncOwn);
  syncOwn();
  wall.ready((g) => {
    g.onMoved((id, pos) => {
      positions.set(id, pos);
      sharedSet(['p', id], posText(pos));
    });
    repaintAll(g);
  });

  // Joining a room: offer our notes (and where they sit) to the group.
  const stopRoom = onRoom(() => {
    if (!cardHost.isConnected) {
      stopRoom();
      return;
    }
    if (!live()) return;
    for (const n of notes.values()) if (n.owner === me && !published.has(n.id)) {
      published.add(n.id);
      publishNote(n);
    }
  });

  // Groupmates' notes and positions arrive through the shared channel.
  const stopShared = onShared((tree) => {
    if (!cardHost.isConnected) {
      stopShared();
      return;
    }
    const nNode = typeof tree.n === 'object' && tree.n ? tree.n : {};
    const pNode = typeof tree.p === 'object' && tree.p ? tree.p : {};
    const remoteIds = new Set<string>();
    for (const [id, raw] of Object.entries(nNode)) {
      if (typeof raw !== 'string') continue;
      try {
        const r = JSON.parse(raw) as { c: string; e: string; w: string; m: string };
        if (typeof r.c !== 'string' || !r.c) continue;
        remoteIds.add(id);
        const local = notes.get(id);
        if (local && local.owner === me) continue; // our own note: the table is the source of truth
        const next: CodeNote = { id, code: clip(r.c, 60), excerpt: clip(String(r.e ?? ''), 160), why: clip(String(r.w ?? ''), 200), owner: String(r.m || 'x') };
        const changed = !local || local.code !== next.code || local.excerpt !== next.excerpt || local.why !== next.why || local.owner !== next.owner;
        if (!changed) continue;
        notes.set(id, next);
        const p = typeof pNode[id] === 'string' ? (pNode[id] as string).split(',').map(Number) : null;
        const at = p && p.length === 2 && p.every(Number.isFinite) ? (p as WallPos) : undefined;
        wall.ready((g) => {
          placeNote(g, next, at);
          repaintAll(g);
        });
      } catch {
        /* ignore a malformed note */
      }
    }
    for (const [id, n] of [...notes]) {
      if (n.owner === me || remoteIds.has(id)) continue;
      notes.delete(id);
      positions.delete(id);
      wall.ready((g) => g.remove(id));
      paintLegend();
    }
    for (const [id, raw] of Object.entries(pNode)) {
      if (typeof raw !== 'string' || !notes.has(id)) continue;
      const p = raw.split(',').map(Number);
      if (p.length === 2 && p.every(Number.isFinite)) {
        positions.set(id, p as WallPos);
        wall.ready((g) => g.setPosition(id, p as WallPos));
      }
    }
  });

  // Big stage with the reading card beside it; "Full screen" is for projecting or a closer look.
  const wallWrap = h('div', { class: 'galaxy-wrap' }, wallPanel.el, h('div', { class: 'galaxy-side' }, cardHost, legend));
  const fsBtn = h('button', { type: 'button', class: 'btn btn-small galaxy-fs', 'aria-pressed': 'false' }, 'Full screen');
  const setFull = (on: boolean): void => {
    fsBtn.textContent = on ? 'Exit full screen' : 'Full screen';
    fsBtn.setAttribute('aria-pressed', String(on));
    wallWrap.classList.toggle('is-expanded', on && !document.fullscreenElement);
    window.dispatchEvent(new Event('resize'));
  };
  fsBtn.addEventListener('click', () => {
    const on = fsBtn.getAttribute('aria-pressed') !== 'true';
    if (on && wallWrap.requestFullscreen) {
      wallWrap.requestFullscreen().then(() => setFull(true)).catch(() => setFull(true));
    } else if (!on && document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      setFull(on);
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (!wallWrap.isConnected) return;
    setFull(document.fullscreenElement === wallWrap);
  });
  wallPanel.el.querySelector('h3')?.after(fsBtn);

  /* quick add: a new code lands in the Step 1 table and therefore on the wall */
  const quickCode = h('input', { id: 'qa-code', type: 'text', placeholder: 'A short label', autocomplete: 'off', maxlength: 60 });
  const quickExcerpt = h('input', { id: 'qa-excerpt', type: 'text', placeholder: 'e.g. Sarah 4:00, Sinclair reminds her to drink water', autocomplete: 'off' });
  const quickMsg = h('p', { class: 'small', role: 'status', 'aria-live': 'polite' });
  const quickForm = h(
    'form',
    { class: 'add-form', novalidate: true },
    h('div', { class: 'form-grid' }, h('div', { class: 'field' }, h('label', { for: 'qa-code' }, 'Code'), quickCode), h('div', { class: 'field field-wide' }, h('label', { for: 'qa-excerpt' }, 'Moment (with timestamp)'), quickExcerpt)),
    h('button', { type: 'submit', class: 'btn btn-primary' }, 'Add to my codes'),
    quickMsg,
  );
  quickForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!quickCode.value.trim()) {
      quickMsg.textContent = 'Give the code a short label.';
      quickCode.focus();
      return;
    }
    const row = codeTable.fillRow([quickExcerpt.value.trim(), quickCode.value.trim(), '']);
    quickMsg.textContent = `Added as row ${row} of your Step 1 table and put on the wall.`;
    quickCode.value = '';
    quickExcerpt.value = '';
  });

  const clusterTable = editableTable({
    key: 't1.cluster',
    cols: t1ClusterCols,
    caption: 'Group clusters: related observations and codes, what connects them, what they suggest',
    defaultRows: [['', '', ''], ['', '', '']],
    addLabel: 'Add a cluster',
  });

  const step2 = [
    h('p', { class: 'instruction' }, 'Your codes from Step 1 are on the wall. Take turns explaining yours, drag related codes together, then name each cluster below. Join a group room to see everyone\'s codes on one wall.'),
    wallWrap,
    h('h3', null, 'Cluster table'),
    clusterTable.el,
    collapsible('Discussion prompts', [h('ol', { class: 'prompt-list' }, t1Discussion.map((p, i) => h('li', null, h('p', null, p), boundTextarea(`t1.d${i + 1}`, p, 2))))]),
    collapsible('Add a code from here', [quickForm]),
  ];

  /* ---------------- Step 3 ---------------- */
  const step3 = [
    h('p', { class: 'instruction' }, 'Draft one candidate theme together. You will test it in Task 2 and build on it in Task 3, so keep it.'),
    textField({ key: 't1.themeName', label: 'Working name for the theme', single: true, placeholder: 'A short phrase that carries the idea' }),
    textField({ key: 't1.themeConcept', label: 'Central organising concept', hint: 'The one idea that ties the observations together.', rows: 2 }),
    textField({ key: 't1.themeObs', label: '2-3 supporting observations', hint: 'Ideally from different videos, with timestamps.', rows: 3 }),
    textField({ key: 't1.themeHelps', label: 'What does this theme help us understand?', rows: 3 }),
    collapsible('What makes it a theme?', [quoteBox('A pattern of shared meaning organised around a central concept. It interprets what people said rather than summarising it.')]),
  ];

  root.append(
    stepper(
      'task1',
      [
        { title: 'Code', minutes: 10, mode: 'Individual', body: step1 },
        { title: 'Share and cluster', minutes: 8, mode: 'Group', body: step2 },
        { title: 'Candidate theme', minutes: 7, mode: 'Group', body: step3 },
      ],
      h('a', { class: 'btn btn-primary', href: '#/task-2' }, 'On to Task 2'),
    ),
  );

  return root;
}
