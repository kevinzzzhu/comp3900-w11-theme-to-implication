import { resources } from '../data/resources';
import { themes } from '../data/themes';
import type { Resource } from '../types';
import { boundTextarea } from './components';
import { drills, flipCards } from './copy';
import { h } from './dom';
import { resourceItem } from './resourceItem';

function findResource(needle: string): Resource | undefined {
  const n = needle.toLowerCase();
  return resources.find((r) => `${r.title} ${r.cite}`.toLowerCase().includes(n));
}

function sourceLine(needle: string, fallback: string): HTMLElement {
  const r = findResource(needle);
  if (!r) return h('li', null, h('strong', null, fallback), h('span', { class: 'muted' }, ' (not found in the resources list, ask your tutor for the reference)'));
  return resourceItem(r);
}

function flipCard(c: { topic: string; theme: string; why: string }, i: number): HTMLElement {
  const face = h('div', { class: 'flip-face' });
  const btn = h('button', { type: 'button', class: 'flip-card', 'aria-pressed': 'false' }, face);
  let flipped = false;
  const paint = (): void => {
    face.replaceChildren(
      flipped
        ? h('span', null, h('span', { class: 'eyebrow' }, 'Rewritten as a theme'), h('strong', null, c.theme), h('span', { class: 'small' }, c.why))
        : h('span', null, h('span', { class: 'eyebrow' }, `Topic summary ${i + 1}`), h('strong', null, c.topic), h('span', { class: 'small muted' }, 'Press to see it rewritten as a theme')),
    );
    btn.setAttribute('aria-pressed', String(flipped));
    btn.classList.toggle('is-flipped', flipped);
  };
  btn.addEventListener('click', () => {
    flipped = !flipped;
    paint();
  });
  paint();
  return btn;
}

function drill(d: (typeof drills)[number], i: number): HTMLElement {
  const reveal = h('div', { class: 'drill-reveal', hidden: true }, h('p', null, h('strong', null, 'One stronger version: ')), h('p', null, d.stronger), h('p', { class: 'small muted' }, 'Yours does not need to match. Check that yours names who changes what, and could not be written without the theme.'));
  const hint = h('p', { class: 'hint' }, `Hint: ${d.hint}`);
  const btn = h('button', { type: 'button', class: 'btn btn-small', 'aria-expanded': 'false' }, 'Reveal a stronger version');
  btn.addEventListener('click', () => {
    reveal.hidden = !reveal.hidden;
    btn.setAttribute('aria-expanded', String(!reveal.hidden));
    btn.textContent = reveal.hidden ? 'Reveal a stronger version' : 'Hide the stronger version';
  });
  return h(
    'article',
    { class: 'card drill' },
    h('h4', null, `Drill ${i + 1}`),
    h('p', null, h('strong', null, 'Theme: '), d.theme),
    h('p', null, h('strong', null, 'Weak implication: '), d.weak),
    hint,
    h('p', { class: 'small' }, 'Rewrite it in 2-3 sentences:'),
    boundTextarea(`ext.drill${i + 1}`, `Your rewrite of drill ${i + 1}`, 3),
    btn,
    reveal,
  );
}

export function renderExtensions(): HTMLElement {
  const themeA = themes.find((t) => t.id === 'A');
  const videoReading = resources.filter((r) => r.group === 'videos');

  return h(
    'section',
    { class: 'section extensions' },
    h('h2', null, 'Extensions'),
    h('p', { class: 'muted' }, 'Optional practice for after the workshop, or for fast finishers.'),

    h(
      'details',
      { class: 'panel' },
      h('summary', null, 'Theme or topic summary? Six flip cards'),
      h('p', null, 'Each card starts as a topic summary (it names an area). Press it to see the same material rewritten as a theme (it claims a shared meaning). The examples are unrelated to the three workshop videos.'),
      h('div', { class: 'flip-grid' }, flipCards.map(flipCard)),
    ),

    h(
      'details',
      { class: 'panel' },
      h('summary', null, 'Rewrite this weak implication: four drills'),
      h('p', null, 'Each drill gives a theme and a weak implication. Rewrite the implication so it says who does or thinks what differently, and could only follow from this theme.'),
      h('div', { class: 'grid-2' }, drills.map(drill)),
    ),

    h(
      'details',
      { class: 'panel' },
      h('summary', null, 'Why do LLM-style themes read as superficial?'),
      h('p', null, 'Themes produced by prompting a language model often read like lists of topics: frequent subjects, tidy labels, no claim about what holds them together. A reflexive analysis expects a researcher to interpret, and to be accountable for the position they interpret from. Three CHI papers look at this from different angles: how researchers weigh up LLMs, what ChatGPT-assisted thematic analysis looked like in a user study, and how often themes in published CHI work are thin with no AI involved. Read them yourself before you cite any of them.'),
      h('ul', { class: 'resource-list' }, sourceLine('Uses, Tensions', 'Schroeder et al. 2025'), sourceLine('Human-AI Collaboration in Thematic', 'Yan et al. 2024'), sourceLine('Reflexive Thematic Analysis in HCI', 'Rigby and Iacovides 2026')),
      h(
        'p',
        null,
        themeA
          ? h('span', null, 'Try this test on Task 2\'s Theme A, named "', h('em', null, themeA.name), '": cover the label and read only its evidence. Could the evidence be summarised as a topic, or does the theme claim a pattern of shared meaning?')
          : 'Try this test on Theme A in Task 2: cover the label and read only its evidence. Could it be summarised as a topic, or does the theme claim a pattern of shared meaning?',
      ),
    ),

    h(
      'details',
      { class: 'panel' },
      h('summary', null, 'Positionality sentence starter'),
      h('p', null, 'Complete the sentence in your own words. It is a short step towards the reflexive statements that qualitative papers include.'),
      h('p', { class: 'starter' }, 'When I code interviews about technology, I tend to notice ___ because ___, and I may overlook ___ because ___.'),
      boundTextarea('ext.positionality', 'Your positionality sentence', 3),
    ),

    h(
      'details',
      { class: 'panel' },
      h('summary', null, 'Optional reading about each video'),
      videoReading.length
        ? h('ul', { class: 'resource-list' }, videoReading.map(resourceItem))
        : h('p', { class: 'muted' }, 'No per-video reading has been listed.'),
    ),
  );
}
