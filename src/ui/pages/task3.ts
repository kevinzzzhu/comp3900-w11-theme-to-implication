import { resources } from '../../data/resources';
import { checkList, copyButton, pageHeader, quoteBox, stepHeader, textField, type PageCtx } from '../components';
import { rungDescriptions, t3Checks } from '../copy';
import { h } from '../dom';
import { ladderPanel } from '../ladder';
import { getText, setText } from '../state';

function exampleLink(needle: string, text: string): HTMLElement {
  const r = resources.find((x) => `${x.title} ${x.cite}`.toLowerCase().includes(needle.toLowerCase()));
  if (r && r.url) {
    const url = r.url.startsWith('http') ? r.url : `https://doi.org/${r.url.replace(/^doi:/i, '')}`;
    return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, text);
  }
  return h('span', null, text);
}

export function renderTask3(ctx: PageCtx): HTMLElement {
  const sections = rungDescriptions.map((r, i) =>
    h(
      'section',
      { class: 'rung-block', 'data-rung': i },
      h('h3', null, `${i + 1}. ${r.name}`),
      h('p', null, r.text),
    ),
  );
  const ladder = ladderPanel(ctx, { initial: 0, follow: () => sections });

  const implField = textField({
    key: 't3.implication',
    label: 'Your implication, in 2-3 sentences',
    hint: 'Say who should do or think differently, and what they should do or think. It can concern design, research or practice.',
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

  const fillBtn = h('button', { type: 'button', class: 'btn btn-small' }, 'Fill from my Task 1 theme and implication above');
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

  const root = h(
    'div',
    { class: 'page' },
    pageHeader(
      'Task 3: Beyond the theme: implications',
      'A theme says what is going on. An implication answers "so what?". About 25 minutes.',
    ),
    h(
      'div',
      { class: 'split split-ladder' },
      h(
        'div',
        { class: 'split-main' },
        h(
          'section',
          { class: 'section' },
          h('h2', null, 'Theme versus implication'),
          h('p', null, 'An implication names who should do or think differently, and what they should do or think. It can concern design, research or practice (see Dourish 2006, "Implications for design", for a careful discussion of what implications are). Scroll or use the ladder buttons to see where an implication sits.'),
          sections,
          h(
            'div',
            { class: 'panel worked' },
            h('h3', null, 'Worked example'),
            h('p', null, h('strong', null, 'Theme: '), 'Students accept AI explanations for low-stakes study, but become sceptical and look for a second source when marks are on the line.'),
            h('p', null, h('strong', null, 'Weak implication: '), 'Designers should make AI study tools more trustworthy. ', h('span', { class: 'muted' }, '(You could write this without any data.)')),
            h('p', null, h('strong', null, 'Stronger implication: '), 'AI study tools could show sources and confidence when a student prepares for an assessment, rather than in every interaction.'),
          ),
        ),
      ),
      h('div', { class: 'split-side sticky' }, ladder.el),
    ),
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 1', 'Write one implication', 15, 'Individual'),
      h('p', null, 'Start from your group\'s theme from Task 1 (or your revised one from Task 2). Write one implication. Then run the two checks.'),
      implField,
      checkList('t3.checks', t3Checks, { legend: 'Self-checks (tick when true)' }),
      h('p', { class: 'hint' }, 'If you cannot tick both, ask what the theme tells you that a reader would not already assume, and who could act on it.'),
    ),
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 2', 'Class share', 10, 'Whole class'),
      h('p', null, 'Agree one theme and one implication from your group and put them on the card. The tutor will project cards or you can project your own.'),
      themeField,
      implShare,
      h('div', { class: 'btn-row' }, fillBtn, copyButton('Copy card text', () => `Theme: ${getText('t3.shareTheme').trim()}\nImplication: ${getText('t3.shareImplication').trim()}`), projectBtn),
      cardWrap,
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'See how published papers do it'),
      h('p', null, 'Skim how these papers move from findings to implications. Look at how specific the implication is and which data it leans on.'),
      h(
        'ul',
        { class: 'plain-list' },
        h('li', null, exampleLink('Deng', 'Deng et al. 2022'), ', pp. 11-16'),
        h('li', null, exampleLink('Karim', 'Tahmidul Karim et al. 2025'), ', pp. 3-5'),
        h('li', null, exampleLink('Choi', 'Choi et al. 2024'), ', pp. 221-224'),
        h('li', null, exampleLink('Adiwangsa', 'Adiwangsa et al. 2024'), ', pp. 5-8'),
      ),
      quoteBox('Next: Task 4 turns this into a short Ed post.'),
      h('p', null, h('a', { class: 'btn btn-primary', href: '#/task-4' }, 'On to Task 4')),
    ),
  );

  ctx.afterMount(() => ladder.start());
  return root;
}
