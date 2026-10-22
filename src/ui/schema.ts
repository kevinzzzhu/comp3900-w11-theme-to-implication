import { criteria } from '../data/themes';
import * as copy from './copy';

export type FieldKind = 'text' | 'table' | 'checks';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  cols?: string[];
  items?: () => string[];
  /** Shared live with a group room when one is joined. Everything else stays on this device. */
  group?: boolean;
}

export interface SectionDef {
  id: string;
  title: string;
  fields: FieldDef[];
}

const text = (key: string, label: string, group = false): FieldDef => ({ key, label, kind: 'text', group });
const table = (key: string, label: string, cols: string[], group = false): FieldDef => ({ key, label, kind: 'table', cols, group });
const checks = (key: string, label: string, items: () => string[], group = false): FieldDef => ({ key, label, kind: 'checks', items, group });
const crit = () => criteria.map((c) => c.label);

/** Single source of truth for every saved field; drives Markdown export. */
export const schema: SectionDef[] = [
  {
    id: 'task-1',
    title: 'Task 1: From observations to themes',
    fields: [
      text('t1.assumptions', 'Step 1: My assumptions before coding'),
      table('t1.codes', 'Step 1: Initial codes', copy.t1CodeCols),
      text('t1.lensNote', 'Step 1: Lens reflection'),
      table('t1.myObs', 'Step 2: Observations I added', ['Video', 'Time', 'Label', 'Excerpt']),
      text('t1.d1', `Step 2 discussion: ${copy.t1Discussion[0]}`, true),
      text('t1.d2', `Step 2 discussion: ${copy.t1Discussion[1]}`, true),
      text('t1.d3', `Step 2 discussion: ${copy.t1Discussion[2]}`, true),
      text('t1.d4', `Step 2 discussion: ${copy.t1Discussion[3]}`, true),
      table('t1.cluster', 'Step 2: Clusters', copy.t1ClusterCols, true),
      text('t1.themeName', 'Step 3: Candidate theme, working name', true),
      text('t1.themeConcept', 'Step 3: Central organising concept', true),
      text('t1.themeObs', 'Step 3: Supporting observations', true),
      text('t1.themeHelps', 'Step 3: What the theme helps us understand', true),
    ],
  },
  {
    id: 'task-2',
    title: 'Task 2: Critiquing and refining themes',
    fields: [
      table('t2.matrix', 'Step 1: Critique matrix', ['Criterion', 'Theme A', 'Theme B'], true),
      text('t2.positionality', 'Step 1: How our assumptions affect which theme we find convincing', true),
      checks('t2.crystalA', 'Step 1: Theme A, criteria I judge it meets', crit, true),
      checks('t2.crystalB', 'Step 1: Theme B, criteria I judge it meets', crit, true),
      checks('t2.crystalMine', "Step 1: My group's theme, criteria I judge it meets", crit, true),
      text('t2.weaker', 'Step 2: The weaker theme', true),
      text('t2.revName', 'Step 2: Revised theme name', true),
      text('t2.revConcept', 'Step 2: Central organising concept', true),
      text('t2.revEvidence', 'Step 2: Evidence', true),
      text('t2.revInterp', 'Step 2: Interpretation', true),
      text('t2.q1', `Step 2 prompt: ${copy.t2Prompts[0]}`, true),
      text('t2.q2', `Step 2 prompt: ${copy.t2Prompts[1]}`, true),
      text('t2.q3', `Step 2 prompt: ${copy.t2Prompts[2]}`, true),
      text('t2.q4', `Step 2 prompt: ${copy.t2Prompts[3]}`, true),
      text('t2.q5', `Step 2 prompt: ${copy.t2Prompts[4]}`, true),
      text('t2.keepChange', 'Step 3: One change that strengthens my original theme', true),
      text('t2.keepWhy', 'Step 3: Why this change helps', true),
      text('t2.keepShift', 'Step 3: Has my understanding of the interviews, or my assumptions, changed?', true),
    ],
  },
  {
    id: 'task-3',
    title: 'Task 3: Beyond the theme: implications',
    fields: [
      text('t3.implication', 'Step 1: My implication (2-3 sentences)'),
      checks('t3.checks', 'Step 1: Self-checks', () => copy.t3Checks),
      text('t3.shareTheme', 'Step 2: Group theme for the share card', true),
      text('t3.shareImplication', 'Step 2: Group implication for the share card', true),
    ],
  },
  {
    id: 'task-4',
    title: 'Task 4: Reflection post',
    fields: [text('t4.post', 'Ed post draft')],
  },
  {
    id: 'after',
    title: 'After the workshop',
    fields: [
      checks('t5.checklist', 'Research cluster meeting checklist', () => copy.afterChecklist),
      text('t5.notes', 'Notes from the cluster meeting'),
    ],
  },
  {
    id: 'extensions',
    title: 'Extensions',
    fields: [
      text('ext.drill1', 'Rewrite drill 1'),
      text('ext.drill2', 'Rewrite drill 2'),
      text('ext.drill3', 'Rewrite drill 3'),
      text('ext.drill4', 'Rewrite drill 4'),
      text('ext.positionality', 'Positionality sentence'),
    ],
  },
];

/** Fields shared through a group room, by store key. */
export const groupFields: FieldDef[] = schema.flatMap((sec) => sec.fields.filter((f) => f.group));
