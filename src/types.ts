// Shared data contracts. Owned by the scaffold; workers import, do not change without telling the integrator.

export type VideoId = 'simon' | 'sarah' | 'stacey';
/** O = directly observed, R = participant reports, I = your interpretation */
export type Label = 'O' | 'R' | 'I';

export interface Video {
  id: VideoId;
  person: string; // "Simon"
  title: string; // short display title
  youtubeId: string;
  durationSec: number;
  warning: string; // content warning, paraphrased from the course page
  context: string; // one or two sentence context
  /** Windows (seconds) where the participant is the one speaking; used to flag non-participant material. */
  participantWindows: [number, number][];
  /** Plain-language note on what the video is (format, framing) for students. */
  formatNote: string;
  color: string; // hex, unique per video, used by scenes and chips
}

export interface Observation {
  id: string; // e.g. "simon-03"
  video: VideoId;
  t: number; // seconds into the video, start of the moment
  label: Label;
  /** Short paraphrase or a quote of at most 15 words. Never a long transcript. */
  excerpt: string;
  /** Wording came from auto-captions and should be checked against the video. */
  checkAgainstVideo?: boolean;
}

export interface ThemeEvidence {
  video: VideoId;
  label: Label;
  t: number; // seconds
  /** Display range end in seconds, if the evidence is a span */
  tEnd?: number;
  text: string;
}

export interface CandidateTheme {
  id: 'A' | 'B';
  name: string;
  evidence: ThemeEvidence[];
}

export interface Lens {
  id: string;
  name: string; // "The sceptic"
  assumption: string; // one sentence, first person
  /** observationId -> the code this lens would plausibly assign */
  codes: Record<string, string>;
}

export interface Resource {
  group: 'course' | 'rta' | 'implications' | 'ai' | 'reflexivity' | 'videos' | 'examples';
  title: string;
  cite: string;
  url: string;
  why: string;
  /** false => render a "check before citing" badge */
  verified: boolean;
}

export interface Segment {
  id: string;
  label: string;
  minutes: number;
}
