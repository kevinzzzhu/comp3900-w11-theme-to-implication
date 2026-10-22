import type { CandidateTheme } from '../types';

export const themes: CandidateTheme[] = [
  {
    id: 'A',
    name: 'Technology makes everyday life better for people.',
    evidence: [
      {
        video: 'simon',
        label: 'R',
        t: 98,
        tEnd: 151,
        text: 'Simon controls his TV, computer and wheelchair with head-operated switches.',
      },
      {
        video: 'sarah',
        label: 'R',
        t: 240,
        text: 'Sinclair monitors Sarah’s heart rate and reminds her to drink water.',
      },
      {
        video: 'stacey',
        label: 'R',
        t: 306,
        text: 'Mia comes over on her own asking for attention and pets.',
      },
    ],
  },
  {
    id: 'B',
    name: 'People use technology to choose who and what they depend on, and they value that arrangement because they chose it, even when others see it as a problem.',
    evidence: [
      {
        video: 'simon',
        label: 'R',
        t: 232,
        text: 'Simon: “without it I would be totally dependent on other people.”',
      },
      {
        video: 'simon',
        label: 'R',
        t: 373,
        text: 'Yet he still asks his carers to make him a coffee.',
      },
      {
        video: 'simon',
        label: 'R',
        t: 517,
        text: 'Email lets him keep secrets from his parents.',
      },
      {
        video: 'sarah',
        label: 'R',
        t: 568,
        text: 'Sarah: Sinclair “takes that weight” and “makes the decisions.”',
      },
      {
        video: 'sarah',
        label: 'R',
        t: 576,
        text: 'She calls it “an agreed-upon dynamic,” in reply to the presenter calling Sinclair “quite controlling” (9:03).',
      },
      {
        video: 'stacey',
        label: 'R',
        t: 109,
        text: 'Stacey gave months of round-the-clock care to her dying dog, and losing that role hit hard.',
      },
      {
        video: 'stacey',
        label: 'R',
        t: 130,
        text: 'She was not ready for another dog and chose Aibo.',
      },
    ],
  },
];

/** The six quality criteria shown in the Theme Crystal and the critique matrix, bottom to top. */
export const criteria: { id: string; label: string; prompt: string }[] = [
  {
    id: 'named',
    label: 'Has a clear theme name',
    prompt: 'Does the name tell a reader what the theme is about in one glance?',
  },
  {
    id: 'concept',
    label: 'Central organising concept',
    prompt: 'Is there one idea that holds the observations together, rather than a list of topics?',
  },
  {
    id: 'multi',
    label: 'Evidence from 2+ interviews',
    prompt: 'Do the supporting observations come from more than one interview?',
  },
  {
    id: 'interpret',
    label: 'Goes beyond description',
    prompt: 'Does it say what the observations mean, rather than only what the people said or did?',
  },
  {
    id: 'contradiction',
    label: 'Engages contradiction',
    prompt: 'Does it deal with observations that complicate or cut against it?',
  },
  {
    id: 'rq',
    label: 'Addresses the RQ',
    prompt: 'Does it help answer how people experience and make sense of their relationships with technology?',
  },
];
