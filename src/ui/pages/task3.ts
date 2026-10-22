import { resources } from '../../data/resources';
import { checkList, collapsible, copyButton, pageHeader, stepper, textField, type PageCtx } from '../components';
import { t3Checks } from '../copy';
import { h } from '../dom';
import { ladderPanel } from '../ladder';
import { getText, setText, subscribeKey } from '../state';

function exampleLink(needle: string, text: string): HTMLElement {
  const r = resources.find((x) => `${x.title} ${x.cite}`.toLowerCase().includes(needle.toLowerCase()));
  if (r && r.url) {
    const url = r.url.startsWith('http') ? r.url : `https://doi.org/${r.url.replace(/^doi:/i, '')}`;
    return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, text);
  }
  return h('span', null, text);
}

export function renderTask3(ctx: PageCtx): HTMLElement {
  const ladder = ladderPanel(ctx, { initial: 0 });

  const implField = textField({
    key: 't3.implication',
    label: 'Your implication, in 2-3 sentences',
    hint: 'Who should do or think differently, and what?',
    rows: 4,
    counter: { kind: 'sentences', min: 2, max: 3 },
    big: true,
  });

  /* share card */
  const themeField = textField({ key: 't3.shareTheme', label: 'Group theme (one line for the card)', rows: 2 });
  const implShare = textField({ key: 't3.shareImplication', label: 'Group implication (the version you will share)', rows: 3 });
  const cardTheme = h('p', { class: 'share-text' });
  const cardImpl = h('p', { class: 'share-text' });
  const card = h(
    'div',
    { class: 'share-card', role: 'group', 'aria-label': 'Share card for the class' },
    h('p', { class: 'eyebrow' }, 'Our theme'),
    cardTheme,
    h('p', { class: 'eyebrow' }, 'So what? Our implication'),
    cardImpl,
  );
  const refreshCard = (): void => {
    cardTheme.textContent = getText('t3.shareTheme').trim() || 'Your group theme appears here.';
    cardImpl.textContent = getText('t3.shareImplication').trim() || 'Your group implication appears here.';
  };
  refreshCard();
  themeField.addEventListener('input', refreshCard);
  implShare.addEventListener('input', refreshCard);
  // A groupmate's edits arrive through the store, not as input events, so the card follows the store too.
  for (const key of ['t3.shareTheme', 't3.shareImplication']) {
    const unsub = subscribeKey(key, () => {
      if (!card.isConnected) unsub();
      else refreshCard();
    });
  }

  const fillBtn = h('button', { type: 'button', class: 'btn btn-small' }, 'Fill from my Task 1 theme and my implication');
  fillBtn.addEventListener('click', () => {
    const name = getText('t1.themeName').trim();
    const concept = getText('t1.themeConcept').trim();
    const theme = [name, concept].filter(Boolean).join(': ');
    const imp = getText('t3.implication').trim();
    if (theme) setText('t3.shareTheme', theme);
    if (imp) setText('t3.shareImplication', imp);
    themeField.querySelector('textarea')!.value = getText('t3.shareTheme');
    implShare.querySelector('textarea')!.value = getText('t3.shareImplication');
    themeField.querySelectorAll('textarea').forEach((t) => t.dispatchEvent(new Event('input')));
    implShare.querySelectorAll('textarea').forEach((t) => t.dispatchEvent(new Event('input')));
    refreshCard();
  });

  const cardWrap = h('div', { class: 'share-wrap' }, card);
  const projectBtn = h('button', { type: 'button', class: 'btn btn-small' }, 'Project this card');
  const closeProject = (): void => {
    cardWrap.classList.remove('is-projected');
    projectBtn.textContent = 'Project this card';
    projectBtn.setAttribute('aria-expanded', 'false');
  };
  projectBtn.setAttribute('aria-expanded', 'false');
  projectBtn.addEventListener('click', () => {
    const on = !cardWrap.classList.contains('is-projected');
    cardWrap.classList.toggle('is-projected', on);
    projectBtn.textContent = on ? 'Close projected view' : 'Project this card';
    projectBtn.setAttribute('aria-expanded', String(on));
  });
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && cardWrap.classList.contains('is-projected')) {
      closeProject();
      projectBtn.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  ctx.onDispose(() => document.removeEventListener('keydown', onKey));

  const examples = collapsible('See how published papers move from findings to implications', [
    h(
      'ul',
      { class: 'plain-list' },
      h('li', null, exampleLink('Deng', 'Deng et al. 2022'), ', pp. 11-16'),
      h('li', null, exampleLink('Karim', 'Tahmidul Karim et al. 2025'), ', pp. 3-5'),
      h('li', null, exampleLink('Choi', 'Choi et al. 2024'), ', pp. 221-224'),
      h('li', null, exampleLink('Adiwangsa', 'Adiwangsa et al. 2024'), ', pp. 5-8'),
    ),
  ]);

  const warmup = [
    h('p', { class: 'instruction' }, 'A theme says what is going on. An implication names who should do or think differently, and what.'),
    h(
      'div',
      { class: 'grid-2 worked' },
      h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, 'Weak'), h('p', null, 'Designers should make AI study tools more trustworthy.'), h('p', { class: 'small muted' }, 'You could write this without any data.')),
      h('div', { class: 'card' }, h('p', { class: 'eyebrow' }, 'Stronger'), h('p', null, 'AI study tools could show sources and confidence when a student prepares for an assessment, rather than in every interaction.')),
    ),
    h('p', { class: 'small muted' }, h('strong', null, 'Theme behind both: '), 'Students accept AI explanations for low-stakes study, but look for a second source when marks are on the line.'),
    collapsible('Where does an implication sit? (Implication Ladder)', [ladder.el]),
  ];

  const write = [
    h('p', { class: 'instruction' }, 'Start from your group\'s theme (Task 1, or your revision from Task 2). Write one implication, then run the two checks.'),
    implField,
    checkList('t3.checks', t3Checks, { legend: 'Self-checks (tick when true)' }),
    examples,
  ];

  const share = [
    h('p', { class: 'instruction' }, 'Agree one theme and one implication and put them on the card to share.'),
    themeField,
    implShare,
    h('div', { class: 'btn-row' }, fillBtn, copyButton('Copy card text', () => `Theme: ${getText('t3.shareTheme').trim()}\nImplication: ${getText('t3.shareImplication').trim()}`), projectBtn),
    cardWrap,
  ];

  return h(
    'div',
    { class: 'page' },
    pageHeader('Task 3: Beyond the theme: implications', 'Turn your theme into a "so what?" for design, research or practice.'),
    stepper(
      'task3',
      [
        { title: 'So what?', body: warmup },
        { title: 'Write one implication', minutes: 15, mode: 'Individual', body: write },
        { title: 'Class share', minutes: 10, mode: 'Whole class', body: share },
      ],
      h('a', { class: 'btn btn-primary', href: '#/task-4' }, 'On to Task 4'),
    ),
  );
}
