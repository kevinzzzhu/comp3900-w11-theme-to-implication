import { criteria, themes } from '../../data/themes';
import { videos } from '../../data/videos';
import { mountCrystal, type CrystalHandle } from '../../scenes/crystal';
import type { CandidateTheme } from '../../types';
import {
  boundTextarea, checkList, editableTable, mountScene, pageHeader, quoteBox, stepHeader, textField, widgetPanel, type PageCtx,
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

  root.append(
    pageHeader(
      'Task 2: Critiquing and refining themes',
      'Two tutor-prepared themes are on the table, built from the same three videos. Judge them, strengthen the weaker one, then go back to your own.',
    ),
    VideoPanel(),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'The two themes'),
      h('p', { class: 'small muted' }, 'Evidence rows show the video, a label (O observed, R reported, I interpretation) and a timestamp you can click to check the moment.'),
      h('div', { class: 'grid-2' }, themeCard('Theme A', themeA), themeCard('Theme B', themeB)),
    ),
  );

  /* ---------- Step 1 ---------- */
  const matrix = editableTable({
    key: 't2.matrix',
    cols: ['Criterion', 'Theme A', 'Theme B'],
    caption: 'Critique matrix comparing Theme A and Theme B',
    lockFirstCol: true,
    fixedRows: true,
    defaultRows: matrixRows.map((r) => [r, '', '']),
  });

  const crystalPanel = widgetPanel(
    'Theme Crystal',
    'A stack of six layers, one per quality criterion. A layer lights up and turns solid when you tick the matching criterion, so a well-supported theme grows into a tall crystal and a thin one stays a flat slab.',
  );
  let crystal: CrystalHandle | null = null;
  type Which = 'A' | 'B' | 'mine';
  const keyOf: Record<Which, string> = { A: 't2.crystalA', B: 't2.crystalB', mine: 't2.crystalMine' };
  const labelOf: Record<Which, string> = { A: 'Theme A', B: 'Theme B', mine: "My group's theme" };
  let which: Which = 'A';
  const checkHost = h('div');
  const tabButtons = new Map<Which, HTMLButtonElement>();
  const tabs = h('div', { class: 'pill-tabs', role: 'group', 'aria-label': 'Choose which theme to rate' });

  const select = (w: Which): void => {
    which = w;
    tabButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === w)));
    crystal?.setTheme(w);
    crystal?.setLit(getChecks(keyOf[w], criteria.length));
    checkHost.replaceChildren(
      criteria.length
        ? checkList(keyOf[w], criteria.map((c) => c.label), {
            legend: `Criteria met by ${labelOf[w]}`,
            describe: (i) => criteria[i].prompt,
            onChange: (state) => crystal?.setLit(state),
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
  select('A');

  root.append(
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 1', 'Critique the themes', 10, 'Group'),
      h('p', null, 'Fill the matrix for both themes. Quote timestamps when you cite evidence, and say what an alternative reading of that evidence could be.'),
      matrix.el,
      h('p', { class: 'hint' }, 'As you decide which theme is more convincing, consider how your own assumptions (see Task 1) affect that judgement.'),
      textField({ key: 't2.positionality', label: 'How might your own assumptions affect which theme you find convincing?', rows: 3 }),
      crystalPanel.el,
    ),
  );

  /* ---------- Step 2 ---------- */
  root.append(
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 2', 'Refine the weaker theme', 10, 'Group'),
      textField({ key: 't2.weaker', label: 'Which theme did your group judge weaker?', single: true, placeholder: 'Theme A or Theme B' }),
      textField({ key: 't2.revName', label: 'Revised theme name', single: true }),
      textField({ key: 't2.revConcept', label: 'Central organising concept', rows: 2 }),
      textField({ key: 't2.revEvidence', label: 'Evidence (with timestamps)', rows: 3 }),
      textField({ key: 't2.revInterp', label: 'Interpretation: what does the theme say is going on?', rows: 3 }),
      h('h3', null, 'Test your revision'),
      h('ol', { class: 'prompt-list' }, t2Prompts.map((p, i) => h('li', null, h('p', null, p), boundTextarea(`t2.q${i + 1}`, p, 2)))),
    ),
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 3', 'Revisit your original theme', 5, 'Group'),
      quoteBox('Go back to the candidate theme you wrote in Task 1 and ask what Theme A, Theme B and your revision taught you.'),
      textField({ key: 't2.keepChange', label: 'One change that would strengthen your original theme', rows: 2 }),
      textField({ key: 't2.keepWhy', label: 'Why would that change help?', rows: 2 }),
      textField({ key: 't2.keepShift', label: 'Has your understanding of the interviews, or of your own assumptions, changed?', rows: 3 }),
      h('p', null, h('a', { class: 'btn btn-primary', href: '#/task-3' }, 'On to Task 3')),
    ),
  );

  ctx.afterMount(() => {
    crystal = mountScene(ctx, crystalPanel, (el) => mountCrystal(el, criteria.map((c) => c.label)));
    select(which);
  });

  return root;
}
