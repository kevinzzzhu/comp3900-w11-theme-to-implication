import { lensObservationIds, lenses } from '../../data/lenses';
import { observations } from '../../data/observations';
import { videos } from '../../data/videos';
import { mountGalaxy, type GalaxyHandle } from '../../scenes/galaxy';
import { mountPrism, type PrismHandle } from '../../scenes/prism';
import type { Label, Observation, VideoId } from '../../types';
import {
  boundTextarea, editableTable, mountScene, pageHeader, quoteBox, stepHeader, textField, widgetPanel, type PageCtx,
} from '../components';
import { LENS_COLORS, labelMeaning, t1ClusterCols, t1CodeCols, t1Discussion } from '../copy';
import { fmtTime, h, parseTime, uid } from '../dom';
import { getRows, setRows } from '../state';
import { TimeLink, VideoChip, VideoPanel, personName } from '../video';

const MY_OBS_KEY = 't1.myObs';

function labelBadge(l: Label): HTMLElement {
  return h('span', { class: `label-badge label-${l}`, title: labelMeaning[l].name }, l);
}

function inParticipantWindow(o: Observation): boolean | null {
  const v = videos.find((x) => x.id === o.video);
  if (!v || v.participantWindows.length === 0) return null;
  return v.participantWindows.some(([a, b]) => o.t >= a && o.t <= b);
}

function loadMine(): Observation[] {
  const rows = getRows(MY_OBS_KEY) ?? [];
  const out: Observation[] = [];
  rows.forEach((r, i) => {
    const t = parseTime(r[1] ?? '');
    if (t === null || !['simon', 'sarah', 'stacey'].includes(r[0])) return;
    out.push({ id: `mine-${i + 1}`, video: r[0] as VideoId, t, label: (['O', 'R', 'I'].includes(r[2]) ? r[2] : 'I') as Label, excerpt: r[3] ?? '' });
  });
  return out;
}

export function renderTask1(ctx: PageCtx): HTMLElement {
  const root = h('div', { class: 'page' });
  root.append(
    pageHeader(
      'Task 1: From observations to themes',
      'Start from what you noticed, name it with a code, then work with your group towards a candidate theme. About 25 minutes in total.',
    ),
    VideoPanel(),
  );

  /* ---------------- Step 1 ---------------- */
  const codeTable = editableTable({
    key: 't1.codes',
    cols: t1CodeCols,
    caption: 'Initial codes for your video: observation, code and reason',
    defaultRows: [['', '', ''], ['', '', ''], ['', '', '']],
    minRows: 1,
    addLabel: 'Add a row',
    placeholders: ['e.g. Simon 3:25, says the chair "is part of me"', 'A short label', 'What in the moment led to this code?'],
  });

  const prismPanel = widgetPanel(
    'Lens Prism',
    'A prism that splits one beam of white light into coloured beams, one colour per interpretive lens. It shows that the same observations can be coded differently depending on the assumptions you bring.',
  );
  const lensDetail = h('div', { class: 'lens-detail', 'aria-live': 'polite' });
  const lensRadioName = uid('lens');
  const lensOptions: HTMLElement[] = [];
  let prism: PrismHandle | null = null;

  const showLens = (i: number): void => {
    prism?.setLens(i);
    lensDetail.replaceChildren();
    if (i < 0 || !lenses[i]) {
      lensDetail.append(h('p', { class: 'muted' }, 'No lens selected. Pick one to see what it would make of the same observations.'));
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

  const mkOption = (value: number, title: string, sub?: string, color?: string): HTMLElement => {
    const id = uid('lo');
    const input = h('input', { type: 'radio', name: lensRadioName, id, checked: value === -1 });
    input.addEventListener('change', () => showLens(value));
    return h(
      'div',
      { class: 'radio-row' },
      input,
      h('label', { for: id }, color ? h('span', { class: 'swatch', style: `background:${color}`, 'aria-hidden': 'true' }) : null, h('strong', null, title), sub ? h('span', { class: 'check-desc' }, sub) : null),
    );
  };
  lensOptions.push(mkOption(-1, 'No lens (white light)', 'Code the way you normally would.'));
  lenses.forEach((l, i) => lensOptions.push(mkOption(i, l.name, l.assumption, LENS_COLORS[i % LENS_COLORS.length])));

  const lensPicker = h('fieldset', { class: 'lens-picker' }, h('legend', null, 'Choose a lens'), lensOptions);
  const prismSide = lenses.length ? [lensPicker, lensDetail] : [h('p', { class: 'muted' }, 'Lens details have not loaded.')];
  prismPanel.el.append(...prismSide);
  showLens(-1);

  root.append(
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 1', 'Individual coding', 10, 'Individual'),
      h('p', null, 'Watch your video and note moments that stand out. First write down what you assume going in; then code 3-5 moments. A code is a short label for what a moment seems to be about.'),
      textField({
        key: 't1.assumptions',
        label: 'What assumptions do you bring to this topic?',
        hint: 'About technology, disability, companionship, AI, whatever applies. Be honest; this is for you, and it is the raw material of reflexivity.',
        rows: 3,
      }),
      h(
        'div',
        { class: 'split' },
        h('div', { class: 'split-main' }, h('h3', null, 'Code table'), codeTable.el),
        h('div', { class: 'split-side' }, prismPanel.el),
      ),
      h('h3', null, 'Reflexivity prompt'),
      h('p', null, 'Look at the lens that differs most from your own assumptions. Would it have led you to notice or code something different?'),
      textField({ key: 't1.lensNote', label: 'Which lens is closest to the way you coded, and what might another lens have made you notice?', rows: 3 }),
    ),
  );

  /* ---------------- Step 2 ---------------- */
  const cardHost = h('div', { class: 'obs-card-host', 'aria-live': 'polite' }, h('p', { class: 'muted' }, 'Click an orb, or choose an observation from the list below, to read it here.'));

  const showCard = (o: Observation): void => {
    const v = videos.find((x) => x.id === o.video);
    const inWin = inParticipantWindow(o);
    const m = labelMeaning[o.label];
    const addBtn = h('button', { type: 'button', class: 'btn btn-small' }, 'Copy into my code table');
    addBtn.addEventListener('click', () => {
      codeTable.addRow([`${personName(o.video)} ${fmtTime(o.t)}: ${o.excerpt}`, '', '']);
      addBtn.textContent = 'Added to your code table';
      addBtn.setAttribute('disabled', '');
    });
    cardHost.replaceChildren(
      h(
        'article',
        { class: 'obs-card', style: `--vc:${v?.color ?? '#888'}` },
        h('header', null, VideoChip(o.video), ' ', TimeLink(o.video, o.t), ' ', labelBadge(o.label), h('span', { class: 'small' }, ` ${m.name} (${m.shape})`)),
        quoteBox(o.excerpt),
        h('p', { class: 'small' }, m.text),
        inWin === false ? h('p', { class: 'note-warn small' }, 'Check the format note: this moment may not be the participant speaking, so it may not count as participant data.') : null,
        o.checkAgainstVideo ? h('p', { class: 'note-warn small' }, 'This wording comes from auto-captions. Check it against the video before you rely on it.') : null,
        addBtn,
      ),
    );
  };

  const obsList = h('ul', { class: 'obs-list' });
  const addToList = (o: Observation): void => {
    obsList.append(
      h(
        'li',
        { style: `--vc:${videos.find((x) => x.id === o.video)?.color ?? '#888'}` },
        h('button', { type: 'button', class: 'obs-btn', onClick: () => showCard(o) }, h('span', { class: 'vdot', 'aria-hidden': 'true' }), `${personName(o.video)} ${fmtTime(o.t)} `, labelBadge(o.label), ` ${o.excerpt}`),
      ),
    );
  };
  observations.forEach(addToList);

  const galaxyPanel = widgetPanel(
    'Observation Galaxy',
    'A cloud of floating orbs, one per observation. Colour shows the video (teal Simon, rose Sarah, amber Stacey) and shape shows the label (sphere observed, cube reported, octahedron interpretation). Drag orbs together to cluster them; click one to read it.',
  );
  let galaxy: GalaxyHandle | null = null;

  const mine = loadMine();
  mine.forEach(addToList);

  /* add-my-observation form */
  const formMsg = h('p', { class: 'small', role: 'status', 'aria-live': 'polite' });
  const selVideo = h('select', { id: 'my-video' }, videos.map((v) => h('option', { value: v.id }, v.person)));
  const inTime = h('input', { id: 'my-time', type: 'text', inputmode: 'numeric', placeholder: 'm:ss, e.g. 3:25', autocomplete: 'off' });
  const selLabel = h('select', { id: 'my-label' }, (['O', 'R', 'I'] as Label[]).map((l) => h('option', { value: l }, `${l}: ${labelMeaning[l].name}`)));
  const inText = h('input', { id: 'my-excerpt', type: 'text', placeholder: 'Paraphrase, or a quote of 15 words or fewer', autocomplete: 'off' });
  const form = h(
    'form',
    { class: 'panel add-form', novalidate: true },
    h('h3', null, 'Add my observation'),
    h('p', { class: 'small muted' }, 'Add a moment you noticed that is not in the cloud. It appears as a new orb and is saved with your answers. Orbs you add stay until you reload.'),
    h(
      'div',
      { class: 'form-grid' },
      h('div', { class: 'field' }, h('label', { for: 'my-video' }, 'Video'), selVideo),
      h('div', { class: 'field' }, h('label', { for: 'my-time' }, 'Time'), inTime),
      h('div', { class: 'field' }, h('label', { for: 'my-label' }, 'Label'), selLabel),
      h('div', { class: 'field field-wide' }, h('label', { for: 'my-excerpt' }, 'What happened'), inText),
    ),
    h('button', { type: 'submit', class: 'btn btn-primary' }, 'Add orb'),
    formMsg,
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = parseTime(inTime.value);
    const text = inText.value.trim();
    if (!videos.length) {
      formMsg.textContent = 'Video details have not loaded, so an observation cannot be added yet.';
      return;
    }
    if (t === null) {
      formMsg.textContent = 'Enter the time as m:ss, for example 3:25.';
      inTime.focus();
      return;
    }
    if (!text) {
      formMsg.textContent = 'Add a short description of what happened.';
      inText.focus();
      return;
    }
    const rows = getRows(MY_OBS_KEY) ?? [];
    rows.push([selVideo.value, fmtTime(t), selLabel.value, text]);
    setRows(MY_OBS_KEY, rows);
    const o: Observation = { id: `mine-${rows.length}`, video: selVideo.value as VideoId, t, label: selLabel.value as Label, excerpt: text };
    galaxy?.addOrb(o);
    addToList(o);
    inText.value = '';
    inTime.value = '';
    formMsg.textContent = 'Added. It is now in the list below the cloud' + (galaxy ? ' and in the galaxy.' : '.');
  });

  const clusterTable = editableTable({
    key: 't1.cluster',
    cols: t1ClusterCols,
    caption: 'Group clusters: related observations and codes, what connects them, what they suggest',
    defaultRows: [['', '', ''], ['', '', '']],
    addLabel: 'Add a cluster',
  });

  root.append(
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 2', 'Share and cluster', 8, 'Group'),
      h('p', null, 'Each member introduces their video and shares 2-3 observations and the codes they gave them. Then talk through these prompts, jotting anything worth keeping.'),
      h('ol', { class: 'prompt-list' }, t1Discussion.map((p, i) => h('li', null, h('p', null, p), boundTextarea(`t1.d${i + 1}`, p, 2)))),
      h('h3', null, 'Cluster table'),
      h('p', { class: 'small muted' }, 'Group observations and codes that seem to belong together, then say what holds each cluster together.'),
      clusterTable.el,
      h('div', { class: 'split split-even' }, h('div', { class: 'split-main' }, galaxyPanel.el, h('details', { class: 'panel' }, h('summary', null, 'Browse observations as a list (keyboard friendly)'), observations.length ? obsList : h('p', { class: 'muted' }, 'Observations have not loaded.'))), h('div', { class: 'split-side' }, cardHost, form)),
    ),
  );

  /* ---------------- Step 3 ---------------- */
  root.append(
    h(
      'section',
      { class: 'section' },
      stepHeader('Step 3', 'Candidate theme', 7, 'Group'),
      quoteBox('A theme is a pattern of shared meaning organised around a central concept. It interprets what people said, rather than summarising it.'),
      h('p', null, 'Draft one candidate theme together, ideally supported by observations from different videos. You will test it in Task 2 and build an implication from it in Task 3, so keep it.'),
      textField({ key: 't1.themeName', label: 'Working name for the theme', single: true, placeholder: 'A short phrase that carries the idea' }),
      textField({ key: 't1.themeConcept', label: 'Central organising concept', hint: 'The one idea that ties the observations together.', rows: 2 }),
      textField({ key: 't1.themeObs', label: '2-3 supporting observations', hint: 'Ideally from different videos. Include timestamps.', rows: 3 }),
      textField({ key: 't1.themeHelps', label: 'What does this theme help us understand?', rows: 3 }),
      h('p', null, h('a', { class: 'btn btn-primary', href: '#/task-2' }, 'On to Task 2')),
    ),
  );

  ctx.afterMount(() => {
    prism = mountScene(ctx, prismPanel, (el) => mountPrism(el, lenses.map((_, i) => LENS_COLORS[i % LENS_COLORS.length])));
    galaxy = mountScene(ctx, galaxyPanel, (el) => mountGalaxy(el, observations, { onSelect: showCard }));
    mine.forEach((o) => galaxy?.addOrb(o));
  });

  return root;
}
