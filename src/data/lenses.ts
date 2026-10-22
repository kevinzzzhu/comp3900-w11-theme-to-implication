import type { Lens } from '../types';

/** The four observations every lens codes, so the same moment gets visibly different codes. */
export const lensObservationIds: string[] = ['simon-05', 'sarah-03', 'sarah-09', 'stacey-05'];

export const lenses: Lens[] = [
  {
    id: 'optimist',
    name: 'The optimist',
    assumption: 'I assume technology mostly extends what people can do and improves their lives.',
    codes: {
      'simon-05': 'Independence gained',
      'sarah-03': 'Health support',
      'sarah-09': 'Burden lifted',
      'stacey-05': 'Bond recovers',
    },
  },
  {
    id: 'sceptic',
    name: 'The sceptic',
    assumption: 'I assume technology creates new dependencies and people may be fooled about what they are getting.',
    codes: {
      'simon-05': 'Reliance on one system',
      'sarah-03': 'Being monitored',
      'sarah-09': 'Handing over decisions',
      'stacey-05': 'Projecting moods onto a robot',
    },
  },
  {
    id: 'designer',
    name: 'The designer',
    assumption: 'I assume the interesting question is what features and interactions shape the experience.',
    codes: {
      'simon-05': 'Switch access as lifeline',
      'sarah-03': 'Proactive nudges',
      'sarah-09': 'Delegation interface',
      'stacey-05': 'Re-engagement after absence',
    },
  },
  {
    id: 'carer',
    name: 'The carer',
    assumption: 'I assume what matters is who gives and receives care, and who is left doing the work.',
    codes: {
      'simon-05': 'People still needed',
      'sarah-03': 'Care without a person',
      'sarah-09': 'Emotional labour shifted',
      'stacey-05': 'Owner does the caring',
    },
  },
];
