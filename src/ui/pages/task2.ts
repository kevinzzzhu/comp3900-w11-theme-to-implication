import { criteria, themes } from '../../data/themes';
import { videos } from '../../data/videos';
import { mountCrystal } from '../../scenes/crystal';
import type { CandidateTheme } from '../../types';
import {
  boundTextarea, checkList, collapsible, editableTable, mountWhenVisible, pageHeader, stepper, textField, widgetPanel, type PageCtx,
} from '../components';
import { labelMeaning, matrixRows, t2Prompts } from '../copy';
import { h } from '../dom';
import { getChecks } from '../state';
import { TimeLink, VideoChip, VideoPanel } from '../video';

function themeCard(label: string, t: CandidateTheme | undefined): HTMLElement {
  if (!t) return h('article', { class: 'card' }, h('h3', null, label), h('p', { class: 'muted' }, 'This theme has not loaded.'));
  return h(
    'article',
    { class: 'card theme-card' },
    h('p', { class: 'eyebrow' }, label),
    h('h3', null, t.name),
    h(
      'ul',
      { class: 'evidence' },
      t.evidence.map((e) =>
        h(
          'li',
          { style: `--vc:${videos.find((v) => v.id === e.video)?.color ?? '#888'}` },
          h('div', { class: 'ev-head' }, VideoChip(e.video), ' ', TimeLink(e.video, e.t, { endSec: e.tEnd }), ' ', h('span', { class: `label-badge label-${e.label}`, title: labelMeaning[e.label].name }, e.label)),
          h('p', null, e.text),
        ),
      ),
    ),
  );
}

export function renderTask2(ctx: PageCtx): HTMLElement {
  const themeA = themes.find((t) => t.id === 'A');
  const themeB = themes.find((t) => t.id === 'B');
  const root = h('div', { class: 'page' });

  const themesPanel = collapsible(
    'The two themes (O observed, R reported, I interpretation)',
    [h('div', { class: 'grid-2' }, themeCard('Theme A', themeA), themeCard('Theme B', themeB))],
    { open: true },
  );
  root.append(pageHeader('Task 2: Critiquing and refining themes', 'Judge two themes, strengthen the weaker one, then go back to your own.'), VideoPanel(), themesPanel);

  /* ---------- Step 1 ---------- */
  const matrix = editableTable({
    key: 't2.matrix',
    cols: ['Criterion', 'Theme A', 'Theme B'],
    caption: 'Critique matrix comparing Theme A and Theme B',
    lockFirstCol: true,
    fixedRows: true,
    defaultRows: matrixRows.map((r) => [r, '', '']),
  });

  const crystalPanel = widgetPanel('Theme Crystal', 'Tick the criteria a theme meets and its layers light up. A thin theme stays a flat slab.');
  type Which = 'A' | 'B' | 'mine';
  const keyOf: Record<Which, string> = { A: 't2.crystalA', B: 't2.crystalB', mine: 't2.crystalMine' };
  const labelOf: Record<Which, string> = { A: 'Theme A', B: 'Theme B', mine: "My group's theme" };
  let which: Which = 'A';
  const checkHost = h('div');
  const tabButtons = new Map<Which, HTMLButtonElement>();
  const tabs = h('div', { class: 'pill-tabs', role: 'group', 'aria-label': 'Choose which theme to rate' });
  const crystal = mountWhenVisible(ctx, crystalPanel, (el) => mountCrystal(el, criteria.map((c) => c.label)));

  const select = (w: Which): void => {
    which = w;
    tabButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === w)));
    const c = crystal.get();
    c?.setTheme(w);
    c?.setLit(getChecks(keyOf[w], criteria.length));
    checkHost.replaceChildren(
      criteria.length
        ? checkList(keyOf[w], criteria.map((c2) => c2.label), {
            legend: `Criteria met by ${labelOf[w]}`,
            describe: (i) => criteria[i].prompt,
            onChange: (state) => crystal.get()?.setLit(state),
          })
        : h('p', { class: 'muted' }, 'Criteria have not loaded.'),
    );
  };
  (['A', 'B', 'mine'] as Which[]).forEach((w) => {
    const b = h('button', { type: 'button', class: 'pill-tab', 'aria-pressed': 'false', onClick: () => select(w) }, labelOf[w]);
    tabButtons.set(w, b);
    tabs.append(b);
  });
  crystalPanel.el.append(tabs, checkHost);
  crystal.ready(() => select(which));
  select('A');

  const step1 = [
    h('p', { class: 'instruction' }, 'Fill the matrix for both themes. Cite timestamps, and say how else the evidence could be read.'),
    matrix.el,
    textField({ key: 't2.positionality', label: 'How might your own assumptions affect which theme you find convincing?', rows: 3 }),
    collapsible('Optional: rate each theme against six criteria', [crystalPanel.el]),
  ];

  /* ---------- Step 2 ---------- */
  const step2 = [
    h('p', { class: 'instruction' }, 'Revise the weaker theme: its name, central concept, evidence or interpretation.'),
    textField({ key: 't2.weaker', label: 'Which theme did your group judge weaker?', single: true, placeholder: 'Theme A or Theme B' }),
    textField({ key: 't2.revName', label: 'Revised theme name', single: true }),
    textField({ key: 't2.revConcept', label: 'Central organising concept', rows: 2 }),
    textField({ key: 't2.revEvidence', label: 'Evidence (with timestamps)', rows: 3 }),
    textField({ key: 't2.revInterp', label: 'Interpretation: what does the theme say is going on?', rows: 3 }),
    collapsible('Test your revision against five questions', [h('ol', { class: 'prompt-list' }, t2Prompts.map((p, i) => h('li', null, h('p', null, p), boundTextarea(`t2.q${i + 1}`, p, 2))))]),
  ];

  /* ---------- Step 3 ---------- */
  const step3 = [
    h('p', { class: 'instruction' }, 'Go back to your Task 1 theme. What did Theme A, Theme B and your revision teach you about it?'),
    textField({ key: 't2.keepChange', label: 'One change that would strengthen your original theme', rows: 2 }),
    textField({ key: 't2.keepWhy', label: 'Why would that change help?', rows: 2 }),
    textField({ key: 't2.keepShift', label: 'Has your understanding of the interviews, or of your own assumptions, changed?', rows: 3 }),
  ];

  root.append(
    stepper(
      'task2',
      [
        { title: 'Critique', minutes: 10, mode: 'Group', body: step1 },
        { title: 'Refine', minutes: 10, mode: 'Group', body: step2 },
        { title: 'Revisit yours', minutes: 5, mode: 'Group', body: step3 },
      ],
      h('a', { class: 'btn btn-primary', href: '#/task-3' }, 'On to Task 3'),
      // Themes are open for the critique and tucked away once you move on to your own theme.
      (i) => {
        themesPanel.open = i < 2;
      },
    ),
  );

  return root;
}
