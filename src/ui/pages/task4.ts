import { collapsible, copyButton, pageHeader, stepHeader, textField, type PageCtx } from '../components';
import { t4Prompts } from '../copy';
import { h } from '../dom';
import { ladderPanel } from '../ladder';
import { getText } from '../state';

export function renderTask4(ctx: PageCtx): HTMLElement {
  const ladder = ladderPanel(ctx, { initial: 3 });
  return h(
    'div',
    { class: 'page' },
    pageHeader('Task 4: Reflection post', 'Answer both prompts for the course Ed board, with examples from your own analysis.'),
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 1', 'Ed post', 10, 'Individual'),
      h('ol', { class: 'prompt-list simple' }, t4Prompts.map((p) => h('li', null, p))),
      textField({
        key: 't4.post',
        label: 'Your Ed post (100 to 150 words)',
        rows: 10,
        counter: { kind: 'words', min: 100, max: 150 },
        big: true,
      }),
      h('div', { class: 'btn-row' }, copyButton('Copy post', () => getText('t4.post'))),
      h('p', { class: 'small muted' }, 'Paste it into Ed yourself; this site does not post for you.'),
      collapsible('Reminder: what you added at each rung', [ladder.el]),
    ),
    h('p', null, h('a', { class: 'btn btn-primary', href: '#/after' }, 'On to what happens after')),
  );
}
