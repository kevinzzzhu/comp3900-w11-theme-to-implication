import { copyButton, pageHeader, stepHeader, textField, type PageCtx } from '../components';
import { t4Prompts } from '../copy';
import { h } from '../dom';
import { ladderPanel } from '../ladder';
import { getText } from '../state';

export function renderTask4(ctx: PageCtx): HTMLElement {
  const ladder = ladderPanel(ctx, { initial: 3 });
  const root = h(
    'div',
    { class: 'page' },
    pageHeader('Task 4: Reflection post', 'Write a short post for the course Ed board that answers both prompts, using examples from your own analysis. About 10 minutes.'),
    h(
      'div',
      { class: 'split split-ladder' },
      h(
        'div',
        { class: 'split-main' },
        h(
          'section',
          { class: 'section' },
          stepHeader('Step 1', 'Ed post', 10, 'Individual'),
          h('ol', { class: 'prompt-list simple' }, t4Prompts.map((p) => h('li', null, p))),
          textField({
            key: 't4.post',
            label: 'Your Ed post (100 to 150 words)',
            hint: 'Counted by words. Under 100 is amber, 100 to 150 is green, over 150 is red.',
            rows: 10,
            counter: { kind: 'words', min: 100, max: 150 },
            big: true,
          }),
          h('div', { class: 'btn-row' }, copyButton('Copy post', () => getText('t4.post'))),
          h('p', { class: 'small muted' }, 'Copy the text and paste it into Ed yourself; this site does not post anything for you.'),
        ),
      ),
      h('div', { class: 'split-side sticky' }, ladder.el),
    ),
    h('p', null, h('a', { class: 'btn btn-primary', href: '#/after' }, 'On to what happens after')),
  );
  ctx.afterMount(() => ladder.start());
  return root;
}
