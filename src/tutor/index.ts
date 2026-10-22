// TUTOR_ONLY: loaded only when __TUTOR__ is true. Imported solely from main.ts under `if (__TUTOR__)`.
import './tutor.css';
import { segments } from '../data/plan';
import { videos } from '../data/videos';
import { mountRing, type RingHandle } from '../scenes/ring';
import type { VideoId } from '../types';
import { copyButton } from '../ui/components';
import { h } from '../ui/dom';
import { TimeLink, VideoChip } from '../ui/video';
import { runSheet, sessionDecisions, themeDiagnosis, TUTOR_ONLY_MARK, videoTutorNotes } from './content';
import { generateCode, prettyCode } from '../sync/config';
import { buildGroups, groupsToText, parseRoster, type Student } from './groups';
import { SessionTimer, type TimerView } from './timer';

function mmss(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${ms < 0 ? '+' : ''}${m}:${String(s).padStart(2, '0')}`;
}

function bullets(items: string[]): HTMLElement {
  return h('ul', null, items.map((t) => h('li', null, t)));
}

function personOf(v: VideoId | null): string {
  if (!v) return 'unassigned';
  return videos.find((x) => x.id === v)?.person ?? v;
}

export function mountTutor(_root: HTMLElement): void {
  const drawerId = 'tutor-drawer';

  /* ---------- timer ---------- */
  const ringHost = h('div', { class: 'td-ring' });
  const readout = h('p', { class: 'td-readout', 'aria-hidden': 'true' }, '0:00');
  const readoutSr = h('span', { class: 'sr-only', role: 'timer' });
  const segLabel = h('p', { class: 'td-seglabel' });
  const startBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Start');
  const plusBtn = h('button', { type: 'button', class: 'btn' }, '+1 min');
  const prevBtn = h('button', { type: 'button', class: 'btn' }, 'Previous');
  const nextBtn = h('button', { type: 'button', class: 'btn' }, 'Next');
  const projectorBtn = h('button', { type: 'button', class: 'btn btn-small', 'aria-pressed': 'false' }, 'Projector view');

  let ring: RingHandle | null = null;
  const runCards: HTMLDetailsElement[] = [];
  let lastSeg = -1;

  const onTimer = (v: TimerView): void => {
    readout.textContent = mmss(v.remainingMs);
    readout.classList.toggle('is-over', v.remainingMs < 0);
    startBtn.textContent = v.running ? 'Pause' : 'Start';
    segLabel.textContent = `${v.segIndex + 1}/${segments.length}: ${segments[v.segIndex]?.label ?? ''}`;
    const sec = Math.floor(Math.abs(v.remainingMs) / 1000);
    if (sec % 30 === 0) readoutSr.textContent = `${v.remainingMs < 0 ? 'Over time by ' : ''}${mmss(v.remainingMs)}`;
    ring?.setState({ segIndex: v.segIndex, fraction: v.fraction, paused: !v.running });
    if (v.segIndex !== lastSeg) {
      lastSeg = v.segIndex;
      runCards.forEach((d, i) => {
        d.classList.toggle('is-current', i === v.segIndex);
        d.open = i === v.segIndex;
      });
    }
  };
  const timer = new SessionTimer(segments, onTimer);
  startBtn.addEventListener('click', () => timer.toggle());
  plusBtn.addEventListener('click', () => timer.addMinute());
  prevBtn.addEventListener('click', () => timer.prev());
  nextBtn.addEventListener('click', () => timer.next());

  /* ---------- run sheet ---------- */
  const runPanel = h('div', { class: 'td-panel' });
  segments.forEach((s) => {
    const entry = runSheet.find((r) => r.segmentId === s.id);
    const d = h(
      'details',
      { class: 'td-seg' },
      h('summary', null, `${s.label} (${s.minutes} min)`),
      entry
        ? [h('h4', null, 'Tutor moves'), bullets(entry.tutorMoves), h('h4', null, 'Watch for'), bullets(entry.watchFor)]
        : h('p', { class: 'muted' }, 'No run sheet entry for this segment.'),
    );
    runCards.push(d);
    runPanel.append(d);
  });

  /* ---------- theme diagnosis ---------- */
  const diagPanel = h('div', { class: 'td-panel' });
  (['A', 'B'] as const).forEach((id) => {
    const d = themeDiagnosis[id];
    diagPanel.append(
      h(
        'section',
        { class: 'td-seg is-current' },
        h('h3', null, `Theme ${id}`),
        h('p', null, h('strong', null, 'Verdict: '), d.verdict),
        h('h4', null, 'Strengths'),
        bullets(d.strengths),
        h('h4', null, 'Limitations'),
        bullets(d.limitations),
        h('h4', null, 'Counter-evidence'),
        h(
          'ul',
          null,
          d.counterEvidence.map((c) => h('li', null, VideoChip(c.video), ' ', TimeLink(c.video, c.t), ' ', c.text)),
        ),
        h('h4', null, 'Improvement path'),
        h('p', null, d.improvementPath),
      ),
    );
  });

  /* ---------- group builder ---------- */
  const rosterId = 'td-roster';
  const roster = h('textarea', {
    id: rosterId,
    rows: 8,
    placeholder: 'Alex, simon\nBen, sarah\nChloe, stacey',
    autocomplete: 'off',
    spellcheck: false,
  });
  const groupWarn = h('div', { class: 'td-warn', role: 'status', 'aria-live': 'polite' });
  const groupOut = h('div', { class: 'td-groups', 'aria-live': 'polite' });
  let currentGroups: Student[][] = [];
  let currentCodes: string[] = [];
  const buildBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Build groups');
  const reshuffleBtn = h('button', { type: 'button', class: 'btn' }, 'Reshuffle');
  const copyGroups = copyButton('Copy groups', () => groupsToText(currentGroups, personOf, currentCodes));

  const renderGroups = (): void => {
    groupOut.replaceChildren(
      ...currentGroups.map((g, i) => {
        const mix = new Map<string, number>();
        g.forEach((s) => mix.set(personOf(s.video), (mix.get(personOf(s.video)) ?? 0) + 1));
        return h(
          'section',
          { class: 'td-group' },
          h('h4', null, `Group ${i + 1} (${g.length})`, currentCodes[i] ? h('span', { class: 'td-code' }, ` Room code ${currentCodes[i]}`) : null),
          h('ul', null, g.map((s) => h('li', null, s.name, ' ', s.video ? VideoChip(s.video) : h('span', { class: 'muted' }, '(no video)')))),
          h('p', { class: 'small muted' }, [...mix.entries()].map(([k, n]) => `${k} ${n}`).join(', ')),
          g.length > 5 ? h('p', { class: 'td-warn' }, 'Over 5 members: no split into groups of 4-5 is possible with this class size.') : null,
        );
      }),
    );
  };
  const build = (): void => {
    const { students, warnings } = parseRoster(roster.value);
    groupWarn.replaceChildren(...warnings.map((w) => h('p', null, w)));
    currentGroups = buildGroups(students);
    currentCodes = currentGroups.map(() => prettyCode(generateCode()));
    renderGroups();
  };
  buildBtn.addEventListener('click', build);
  reshuffleBtn.addEventListener('click', build);

  const groupPanel = h(
    'div',
    { class: 'td-panel' },
    h('label', { for: rosterId, class: 'small' }, 'One student per line: name, simon|sarah|stacey. Names stay in this page only and are never saved.'),
    roster,
    h('div', { class: 'btn-row' }, buildBtn, reshuffleBtn, copyGroups),
    groupWarn,
    groupOut,
  );

  /* ---------- video notes ---------- */
  const videoPanel = h('div', { class: 'td-panel' });
  (Object.keys(videoTutorNotes) as VideoId[]).forEach((id) => {
    videoPanel.append(h('section', { class: 'td-seg is-current' }, h('h3', null, VideoChip(id)), bullets(videoTutorNotes[id])));
  });

  /* ---------- decisions ---------- */
  const decisionPanel = h('div', { class: 'td-panel' }, h('p', { class: 'small muted' }, 'Settle these before class.'), bullets(sessionDecisions));

  /* ---------- tabs ---------- */
  const panels: [string, HTMLElement][] = [
    ['Run sheet', runPanel],
    ['Themes', diagPanel],
    ['Groups', groupPanel],
    ['Videos', videoPanel],
    ['Decisions', decisionPanel],
  ];
  const tabBar = h('div', { class: 'pill-tabs td-tabs', role: 'group', 'aria-label': 'Tutor sections' });
  const tabBtns: HTMLButtonElement[] = [];
  const selectTab = (i: number): void => {
    panels.forEach(([, p], k) => (p.hidden = k !== i));
    tabBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  };
  panels.forEach(([label], i) => {
    const b = h('button', { type: 'button', class: 'pill-tab', 'aria-pressed': 'false', onClick: () => selectTab(i) }, label);
    tabBtns.push(b);
    tabBar.append(b);
  });
  selectTab(0);

  /* ---------- drawer shell ---------- */
  const closeBtn = h('button', { type: 'button', class: 'btn btn-small' }, 'Close');
  const fab = h('button', { type: 'button', class: 'tutor-fab', 'aria-expanded': 'false', 'aria-controls': drawerId }, 'Tutor');
  const drawer = h(
    'aside',
    { id: drawerId, class: 'tutor-drawer', 'aria-label': 'Tutor drawer', inert: true },
    h('div', { class: 'td-head' }, h('h2', null, 'Tutor'), h('span', null, projectorBtn, ' ', closeBtn)),
    h(
      'div',
      { class: 'td-body' },
      h(
        'div',
        { class: 'td-timer' },
        ringHost,
        h(
          'div',
          null,
          readout,
          readoutSr,
          segLabel,
          h('div', { class: 'td-controls' }, startBtn, plusBtn, prevBtn, nextBtn),
          h('p', { class: 'small muted' }, 'Keys: Space start/pause, Right next, Left previous.'),
        ),
      ),
      h('div', { class: 'td-tabs-wrap' }, tabBar),
      h('div', { class: 'td-panels' }, panels.map(([, p]) => p)),
    ),
    h('p', { class: 'td-foot' }, `${TUTOR_ONLY_MARK}, never deployed`),
  );

  const setOpen = (open: boolean): void => {
    drawer.classList.toggle('is-open', open);
    if (open) drawer.removeAttribute('inert');
    else drawer.setAttribute('inert', '');
    fab.setAttribute('aria-expanded', String(open));
    if (open) closeBtn.focus();
    else if (drawer.classList.contains('is-projector')) setProjector(false);
  };
  const setProjector = (on: boolean): void => {
    drawer.classList.toggle('is-projector', on);
    projectorBtn.setAttribute('aria-pressed', String(on));
    projectorBtn.textContent = on ? 'Exit projector view' : 'Projector view';
  };
  fab.addEventListener('click', () => setOpen(!drawer.classList.contains('is-open')));
  closeBtn.addEventListener('click', () => {
    setOpen(false);
    fab.focus();
  });
  projectorBtn.addEventListener('click', () => setProjector(!drawer.classList.contains('is-projector')));

  document.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('is-open')) return;
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable);
    if (e.key === 'Escape') {
      if (drawer.classList.contains('is-projector')) setProjector(false);
      else {
        setOpen(false);
        fab.focus();
      }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = !!t && (t.tagName === 'BUTTON' || t.tagName === 'A');
    if (e.key === ' ' && !onButton) {
      e.preventDefault();
      timer.toggle();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      timer.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      timer.prev();
    }
  });

  document.body.append(fab, drawer);

  try {
    ring = mountRing(ringHost, segments);
  } catch (err) {
    console.error('ring failed to mount', err);
  }
  onTimer(timer.view());
  void _root;
}
