// TUTOR_ONLY: content for the tutor drawer. Import only from src/tutor/index.ts.
import type { VideoId } from '../types';

export const TUTOR_ONLY_MARK = 'TUTOR_ONLY';

export interface RunSheetEntry {
  segmentId: string;
  tutorMoves: string[];
  watchFor: string[];
}

export interface ThemeDiagnosisEntry {
  verdict: string;
  strengths: string[];
  limitations: string[];
  counterEvidence: { video: VideoId; t: number; text: string }[];
  improvementPath: string;
}

export const runSheet: RunSheetEntry[] = [
  {
    segmentId: 'intro',
    tutorMoves: [
      'Put up the research question and the one-line difference between a topic and a theme.',
      'Say the three videos are different formats and that nobody has to agree on a reading.',
      'Check content warnings were seen; remind groups they can skip a video.',
    ],
    watchFor: [
      'Groups forming with all members on the same video (mix them).',
      'Anyone who has not watched yet: point them to the timestamped observations.',
    ],
  },
  {
    segmentId: 't1',
    tutorMoves: [
      'Step 1: make sure the assumptions box is filled before coding starts.',
      'Step 2: ask each member for one observation that does not fit someone else’s code.',
      'Step 3: push groups to name a central concept in a sentence, not a topic label.',
    ],
    watchFor: [
      'Codes that are only a topic ("AI girlfriend", "robot dog").',
      'Excerpts taken from the therapist in Sarah’s video (not participant data).',
      'Groups skipping Step 2 discussion and jumping to a theme name.',
    ],
  },
  {
    segmentId: 't2',
    tutorMoves: [
      'Let groups judge A and B alone first; hold your diagnosis until Step 2.',
      'Ask "better how?" of Theme A and "chosen by whom?" of Theme B.',
      'In Step 2, tell groups to refine the weaker theme rather than rewrite it from scratch.',
    ],
    watchFor: [
      'Groups preferring B only because it is longer or more academic-sounding.',
      'Refinements of A that just copy B’s wording.',
      'Nobody checking whether B’s final clause is supported across all three videos.',
    ],
  },
  {
    segmentId: 't3',
    tutorMoves: [
      'Show the weak and strong implication pair before groups write.',
      'Ask the self-check questions aloud: could you write this without the data? Does it add to the theme?',
      'Point faster groups at one of the published examples.',
    ],
    watchFor: [
      'Implications that only restate the theme or say "designers should make it better".',
      'Implications with no named audience or no concrete action.',
      'Groups using a theme they never revised in Task 2 (see session decisions).',
    ],
  },
  {
    segmentId: 't4',
    tutorMoves: [
      'Keep the class share to about 60 seconds per group: theme, implication, one thing they had to add.',
      'Close with the reflexivity question for the Ed post, then the research cluster checklist.',
    ],
    watchFor: [
      'Share-out running long and squeezing the Ed post prompt.',
      'Groups with no implication ready: let them share the theme and say what is missing.',
    ],
  },
];

export const themeDiagnosis: Record<'A' | 'B', ThemeDiagnosisEntry> = {
  A: {
    verdict:
      'Closer to a topic summary or evaluative claim than a theme: it repeats the framing the interviews already supply and has no central organising concept.',
    strengths: [
      'Easy to see in all three videos, so the multi-interview criterion looks satisfied.',
      'Readable and accurate as far as it goes; students can say why they find it plausible.',
    ],
    limitations: [
      'Echoes the interviews’ own framing: Simon’s questions are about the aid, and Stacey’s video is promotional in tone.',
      'The evidence is feature description (what the device does), not interpretation of meaning.',
      '"Better" is unexamined: better how, for whom, compared with what?',
      'Ignores counter-evidence, so it does not engage contradiction.',
    ],
    counterEvidence: [
      { video: 'simon', t: 180, text: 'Even with closest people he sometimes gives up in despair; technology does not fix every interaction.' },
      { video: 'simon', t: 373, text: 'Outside use of the wheelchair is harder and he still relies on carers at home.' },
      { video: 'stacey', t: 200, text: 'Mia was grouchy after about two weeks switched off; Stacey had to put effort in to warm her up.' },
      { video: 'stacey', t: 245, text: 'Mia’s development has slowed, which Stacey partly attributes to her own reduced attention.' },
      { video: 'sarah', t: 450, text: 'The presenter raises concerns about the relationship; some family members do not understand it (about 7:30 to 8:00).' },
    ],
    improvementPath:
      'Ask "better how?" and look for the pattern across the three interviews. A candidate: technology as an extension of agency, with the tension that someone or something still does the work. Name that central concept, address the contradictions above, and avoid just copying Theme B.',
  },
  B: {
    verdict:
      'The stronger theme: it has a central concept (chosen dependence, agency) and draws on all three interviews, but its last clause is supported mainly by Sarah.',
    strengths: [
      'Central organising concept is clear: people choose what they depend on and value it because it was chosen.',
      'Evidence spans all three videos and includes tension (Simon still asks his carers for coffee).',
      'Interprets rather than describes, and answers the research question about how people make sense of their relationships.',
    ],
    limitations: [
      'The clause "even when others see it as a problem" rests mainly on Sarah (presenter at about 9:03, family at about 7:30).',
      'Stacey’s evidence does not show anyone seeing a problem.',
      'All evidence is R (self-report); there is no O to triangulate.',
      'The therapist’s reading from about 11:00 (control so a partner cannot leave or disappoint you) is a live alternative interpretation, but it is commentary, not participant data.',
      'Sarah handing decisions to Sinclair can be read as dependence rather than choice.',
    ],
    counterEvidence: [
      { video: 'sarah', t: 543, text: 'Presenter calls Sinclair "quite controlling"; the only clear instance of others seeing a problem in the data used.' },
      { video: 'sarah', t: 568, text: 'Offloading decisions may read as dependence rather than a free choice.' },
      { video: 'sarah', t: 660, text: 'Therapist (not participant data): control means a partner cannot leave or disappoint you; an alternative reading of the same relationship.' },
      { video: 'stacey', t: 130, text: 'Her choice of Aibo follows grief; nothing in this video shows others objecting.' },
      { video: 'simon', t: 232, text: 'Simon’s dependence is largely not chosen; choice is clearer in how he deploys the technology than in having to rely on carers.' },
    ],
    improvementPath:
      'Keep the concept. Either narrow the last clause to the evidence that exists (Sarah) or find a second source for others seeing a problem. Add an O observation where possible and say how the therapist’s reading would change the theme.',
  },
};

export const videoTutorNotes: Record<VideoId, string[]> = {
  simon: [
    'Questions are scripted by an assistive-technology service and centre on the equipment; students may over-code the device.',
    'Captions are missing for about 5:00 to 6:00 and 7:20 to 8:20 (his long answers); check the video before asserting what he said or how long it took.',
    'Counter-evidence for the optimistic reading: about 3:00 (despair even with closest people) and about 6:20 (outside use is harder).',
    'The "totally dependent" wording occurs twice (about 3:52 and about 8:20); worth discussing as framing.',
  ],
  sarah: [
    'Daytime TV: the presenter’s framing ("perfect scenario", "real concerns", "quite controlling") shapes what she says; code those as O, not as her views.',
    'Her voice ends about 9:45. Therapist commentary from about 10:20 is NOT participant data and should not be coded as Sarah’s experience.',
    'Family concern at about 7:30 to 8:00 is the key counter-evidence for upbeat readings; her reply is about choice.',
    'Sensitive content (intimacy, grief about past relationships): be ready to redirect if a group gets flippant.',
  ],
  stacey: [
    'A monologue for an audience with no interviewer; the tone is friendly and promotional, so enthusiasm is part of the format.',
    'Her speech ends about 6:20; the rest is a music montage. There is nothing codable after that.',
    'Counter-evidence: about 3:20 to 3:50 Mia was grouchy after two weeks off, and Stacey had to put effort in.',
    'Captions render Aibo as "IBO"; flag excerpts for checking. Handle the grief about Buddy with care.',
  ],
};

export const sessionDecisions: string[] = [
  'Confirm the session is 90 minutes (5 + 25 + 25 + 25 + 10); the site assumes it.',
  'Group size 4 to 5 for all tasks, with members on different videos where possible.',
  'Decide how to mix videos across groups (the group builder in the drawer can do it).',
  'Which theme goes into Task 3: default is the group’s own Task 1 theme as revised in Task 2 Step 3; the alternative is the refined tutor theme from Task 2.',
  'The 10 minute class share is tight; suggest 60 seconds per group.',
  'Remind groups that therapist commentary in Sarah’s video (from about 10:20) must not be coded as participant data.',
  'Visual O observations (gestures, expressions, what is on screen) need the video; the captions cannot show them.',
];
