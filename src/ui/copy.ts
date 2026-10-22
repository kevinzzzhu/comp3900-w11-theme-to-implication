import type { Label } from '../types';

export const SITE_TITLE = 'From Theme to Implication';
export const FOOTER_LINE = 'COMP3900/6390 Human Centred Interaction';

export const labelMeaning: Record<Label, { name: string; text: string; shape: string }> = {
  O: { name: 'Observed', text: 'Something you can see or hear happen in the video.', shape: 'sphere' },
  R: { name: 'Reported', text: 'Something the participant says about their own experience.', shape: 'cube' },
  I: { name: 'Interpretation', text: 'Your reading of what it might mean. Treat it as a claim to test.', shape: 'octahedron' },
};

export const t1Discussion = [
  'What similarities and differences do you notice across the experiences in the different videos?',
  'What underlying meanings might connect your observations?',
  'Why might group members have interpreted similar experiences differently?',
  'Which observations challenge the interpretation that is starting to emerge?',
];

export const t1CodeCols = ['Observation or excerpt (with timestamp)', 'Initial code', 'Why did you assign this code?'];
export const t1ClusterCols = [
  'Related observations and codes',
  'What connects or distinguishes them?',
  "What might this suggest about people's relationships with technology?",
];

export const matrixRows = [
  'Central organising concept',
  'Supporting observations',
  'Strengths',
  'Limitations or alternative interpretations',
];

export const t2Prompts = [
  'Does your revised theme explain an underlying pattern, rather than only naming a topic?',
  'What connects the observations across the interviews?',
  'Does it help answer the research question?',
  'Do any differences or contradictions complicate it?',
  'How might another researcher interpret the same observations?',
];

export const t3Checks = [
  'My implication says something the theme does not already say (it is not a restatement).',
  'I could not have written my implication without this data.',
];

export const t4Prompts = [
  'Why might researchers develop different themes from the same qualitative dataset, and why does reflexivity matter?',
  'What did you have to add to get from your theme to your implication?',
];

export const afterChecklist = [
  'Final project specification and requirements: which parts seem fun?',
  'Research questions, or aspects of a standout theme worth following',
  'Prototyping methods you might use',
  'Evaluation plans and data types (you do not need both quantitative and qualitative)',
  'Times and places for future meetings',
];

export const rungDescriptions = [
  { name: 'Observation', text: 'Something seen or said in the data, tied to a moment you can point to.' },
  { name: 'Code', text: 'A short label for what that moment is about. Still close to the data.' },
  { name: 'Theme', text: 'A pattern of shared meaning around a central organising concept. It says what is going on.' },
  { name: 'Implication', text: 'The "so what?": who should do or think differently, and what they should do or think.' },
];

export const GROUP_LABEL: Record<string, string> = {
  course: 'Course materials',
  rta: 'Reflexive thematic analysis',
  implications: 'Writing implications',
  ai: 'AI and qualitative analysis',
  reflexivity: 'Reflexivity and positionality',
  videos: 'Videos',
  examples: 'Published examples',
};
export const GROUP_ORDER = ['course', 'rta', 'implications', 'examples', 'reflexivity', 'ai', 'videos'];

export const LENS_COLORS = ['#2B6672', '#B5527A', '#C48A1F', '#6A5ACD', '#3E8E5A', '#C0563B', '#5B7DB1', '#8C6D31'];

export const flipCards: { topic: string; theme: string; why: string }[] = [
  {
    topic: 'Commuters and phone use',
    theme: 'Phones turn dead time into a private room that commuters actively defend from strangers.',
    why: 'The topic summary lists what people do. The theme names the shared meaning (privacy in public) that explains why they do it.',
  },
  {
    topic: 'Home cooks and recipe apps',
    theme: 'Following a recipe app feels like borrowing someone else\'s confidence, until the cook trusts their own senses.',
    why: 'It claims a movement over time (borrowed to owned confidence) instead of describing app features.',
  },
  {
    topic: 'Parents and screen time rules',
    theme: 'Screen time rules are really negotiations about who gets to define a good family evening.',
    why: 'The organising concept is authority over family life; screens are just where it shows up.',
  },
  {
    topic: 'Gamers and voice chat',
    theme: 'Voice chat is where players decide whether they belong, so muting is a social decision rather than a setting.',
    why: 'A topic summary would say "players use mute". The theme interprets what muting means to them.',
  },
  {
    topic: 'Older adults and online banking',
    theme: 'Online banking is trusted only as far as people can see a human to hold responsible if something goes wrong.',
    why: 'It links many separate remarks (fear of fraud, phone calls to branches) through one organising concept: accountability.',
  },
  {
    topic: 'Remote workers and video calls',
    theme: 'Cameras on is read as proof of commitment, so people perform attention instead of simply feeling it.',
    why: 'It gives a reading of the behaviour that another researcher could challenge, which is a good sign for a theme.',
  },
];

export const drills: { theme: string; weak: string; hint: string; stronger: string }[] = [
  {
    theme: 'Commuters guard their phone time as private space, and get irritated when work messages arrive.',
    weak: 'Designers should make phones less distracting.',
    hint: 'Who exactly changes what, and what in the theme tells you to change it?',
    stronger: 'Work chat tools could hold non-urgent messages until a commuter marks the journey as finished, so the private time the theme describes is not spent on someone else\'s agenda.',
  },
  {
    theme: 'Home cooks lean on recipe apps early on and drop them as they gain confidence.',
    weak: 'Recipe apps should be more user friendly.',
    hint: 'The theme describes change over time. What would an app do differently at different stages?',
    stronger: 'Recipe apps could offer a fading-support mode that replaces exact timings with sensory cues as a user cooks the same dish again, matching the move from borrowed to owned confidence.',
  },
  {
    theme: 'Parents experience screen time rules as arguments about what a good evening looks like.',
    weak: 'Parents should talk to their children about screen time.',
    hint: 'This could have been written without data. What does your theme say that common sense does not?',
    stronger: 'Parental control apps could let families set evening rules together, with a shared "what we want tonight" step, instead of presenting limits as a parent-only settings screen.',
  },
  {
    theme: 'Older adults trust online banking only when a human feels reachable if something goes wrong.',
    weak: 'Banks should improve their online security.',
    hint: 'The theme is about perceived accountability, not technical security.',
    stronger: 'Banks could show a named, reachable contact next to high-value online transfers, since the participants\' trust depended on knowing who to call rather than on how secure the system was.',
  },
];
