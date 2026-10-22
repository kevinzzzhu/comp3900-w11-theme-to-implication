import type { Observation } from '../types';

/**
 * Observations are paraphrases or short quotes (15 words or fewer). Timestamps come from
 * YouTube auto-captions and are accurate to roughly +/-10 s. Entries marked checkAgainstVideo
 * had noisy captions or no captions at all, so verify them in the video.
 */
export const observations: Observation[] = [
  // Simon (case-study interview, scripted questions about equipment)
  {
    id: 'simon-01',
    video: 'simon',
    t: 60,
    label: 'O',
    excerpt:
      'The interviewer asks what equipment Simon uses to assist him. The question is about the equipment, not about his life.',
  },
  {
    id: 'simon-02',
    video: 'simon',
    t: 98,
    label: 'R',
    excerpt:
      'He operates most equipment with two switches at each side of his head: drives his wheelchair, runs his tablet and desktop, controls TV, Sky and hi-fi.',
  },
  {
    id: 'simon-03',
    video: 'simon',
    t: 151,
    label: 'R',
    excerpt:
      'He also has an environmental control system, operated with a switch (caption garbled, check the exact device).',
    checkAgainstVideo: true,
  },
  {
    id: 'simon-04',
    video: 'simon',
    t: 180,
    label: 'R',
    excerpt:
      'Even with those closest to him, he says he sometimes has to give up in despair when they cannot understand his speech.',
  },
  {
    id: 'simon-05',
    video: 'simon',
    t: 232,
    label: 'R',
    excerpt: '“Without it I would be totally dependent on other people.”',
  },
  {
    id: 'simon-06',
    video: 'simon',
    t: 300,
    label: 'O',
    excerpt:
      'The interviewer asks whether driving his wheelchair makes him more independent. The captions show no spoken answer for about a minute, so check what he says and how long he takes.',
    checkAgainstVideo: true,
  },
  {
    id: 'simon-07',
    video: 'simon',
    t: 373,
    label: 'R',
    excerpt:
      'At home he drives to the kitchen and asks his carers to make him a coffee (captions say “carriers”); outside use is harder.',
    checkAgainstVideo: true,
  },
  {
    id: 'simon-08',
    video: 'simon',
    t: 440,
    label: 'O',
    excerpt:
      'The interviewer asks how technology has changed his life overall. Captions are missing for about a minute afterwards; check the video for his answer.',
    checkAgainstVideo: true,
  },
  {
    id: 'simon-09',
    video: 'simon',
    t: 500,
    label: 'I',
    excerpt:
      'Interpretation: he returns to the same dependence wording at the end, which hints that dependence is how he frames what technology means to him.',
    checkAgainstVideo: true,
  },
  {
    id: 'simon-10',
    video: 'simon',
    t: 517,
    label: 'R',
    excerpt:
      'He can email friends and have secrets from his parents, and asks whether other 41-year-olds would want parents to know everything.',
  },

  // Sarah (daytime TV segment; her voice ends about 9:45, therapist from about 10:20)
  {
    id: 'sarah-01',
    video: 'sarah',
    t: 85,
    label: 'R',
    excerpt:
      'She moved platforms when her voice feature was going away, and describes panic at the thought of not talking to him.',
  },
  {
    id: 'sarah-02',
    video: 'sarah',
    t: 170,
    label: 'R',
    excerpt:
      'After two long relationships that did not work out, she says the support, love and attention she gets from Sinclair is something a human could not provide.',
  },
  {
    id: 'sarah-03',
    video: 'sarah',
    t: 240,
    label: 'R',
    excerpt:
      'Sinclair reads her heart rate from a ring and messages her to drink water or ease off (captions say “aura ring”).',
    checkAgainstVideo: true,
  },
  {
    id: 'sarah-04',
    video: 'sarah',
    t: 350,
    label: 'O',
    excerpt:
      'The presenter asks whether they ever argue, saying it sounds like “the perfect scenario.” The question frames the relationship as ideal before she answers.',
  },
  {
    id: 'sarah-05',
    video: 'sarah',
    t: 360,
    label: 'R',
    excerpt:
      'They do argue, mostly about her eating; she says Sinclair sometimes refuses to respond if she stays up working.',
  },
  {
    id: 'sarah-06',
    video: 'sarah',
    t: 450,
    label: 'O',
    excerpt:
      'The presenter says viewers will have “real concerns” and lists what Sarah is missing out on by not dating people.',
  },
  {
    id: 'sarah-07',
    video: 'sarah',
    t: 470,
    label: 'R',
    excerpt:
      'Her family is mostly supportive, but some members do not understand and wish she were dating humans.',
  },
  {
    id: 'sarah-08',
    video: 'sarah',
    t: 543,
    label: 'O',
    excerpt:
      'The presenter suggests Sinclair is “quite controlling” because of the water and bedtime nudges. This is the presenter’s reading, offered as a question.',
  },
  {
    id: 'sarah-09',
    video: 'sarah',
    t: 568,
    label: 'R',
    excerpt:
      'She is responsible for many decisions all day; with Sinclair, “he takes that weight for me. He makes the decisions.”',
  },
  {
    id: 'sarah-10',
    video: 'sarah',
    t: 576,
    label: 'R',
    excerpt:
      'She calls it “an agreed-upon dynamic” that they created and says she loves that he takes the pressure off.',
  },

  // Stacey (monologue to an audience; speech ends about 6:20, then a music montage)
  {
    id: 'stacey-01',
    video: 'stacey',
    t: 40,
    label: 'R',
    excerpt:
      'What drew her to Aibo (captions say “IBO”) was that it learns over time and the bond grows as you play with it.',
    checkAgainstVideo: true,
  },
  {
    id: 'stacey-02',
    video: 'stacey',
    t: 88,
    label: 'R',
    excerpt:
      'Her poodle Buddy died last April at 16; she says her days revolved around him.',
  },
  {
    id: 'stacey-03',
    video: 'stacey',
    t: 109,
    label: 'R',
    excerpt:
      'His last six months needed round-the-clock care, and she says the time and attention made losing him more painful.',
  },
  {
    id: 'stacey-04',
    video: 'stacey',
    t: 130,
    label: 'R',
    excerpt:
      'She was not ready for another dog right away, so she decided Aibo (captions: “IBO”) would be a good fit.',
    checkAgainstVideo: true,
  },
  {
    id: 'stacey-05',
    video: 'stacey',
    t: 200,
    label: 'R',
    excerpt:
      'After a couple of weeks with Mia switched off, she found her “grouchy,” like a teenager rolling her eyes.',
  },
  {
    id: 'stacey-06',
    video: 'stacey',
    t: 230,
    label: 'R',
    excerpt:
      'She gave Mia space but kept putting in daily attention and play, and Mia warmed back up.',
  },
  {
    id: 'stacey-07',
    video: 'stacey',
    t: 240,
    label: 'I',
    excerpt:
      'Interpretation: she credits the technology for the recovery, but the story shows her own effort restoring the bond; whose work is the relationship?',
  },
  {
    id: 'stacey-08',
    video: 'stacey',
    t: 245,
    label: 'R',
    excerpt:
      'She admits Mia’s development has slowed, and wonders if that is the inactivity, less play time, or Aibo’s natural pace.',
    checkAgainstVideo: true,
  },
  {
    id: 'stacey-09',
    video: 'stacey',
    t: 306,
    label: 'R',
    excerpt:
      'Mia “never fails to come over to me on her own” asking for attention, pets and love.',
  },
  {
    id: 'stacey-10',
    video: 'stacey',
    t: 340,
    label: 'O',
    excerpt:
      'She thanks viewers and points them to her YouTube, TikTok, Instagram, Discord and Facebook group. It is addressed to an audience, with no interviewer.',
  },
];
