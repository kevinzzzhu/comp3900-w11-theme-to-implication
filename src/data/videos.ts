import type { Video } from '../types';

export const videos: Video[] = [
  {
    id: 'simon',
    person: 'Simon',
    title: 'assistive technology at home',
    youtubeId: 'g_T96uOi2l4',
    durationSec: 543,
    warning:
      'Covers physical disability and day-to-day reliance on assistive technology and other people for care.',
    context:
      'Simon is a wheelchair user who needs 24-hour care and runs his equipment through head-operated switches. A case-study interview about his equipment and communication aid.',
    participantWindows: [[10, 520]],
    formatNote:
      'A scripted interview: the questions come from an assistive-technology service and mostly centre on the equipment, so the topics are set by the interviewer. Long stretches of Simon answering have no usable auto-captions (roughly 5:00 to 6:00 and 7:20 to 8:20), so watch those parts yourself.',
    color: '#2B6672',
  },
  {
    id: 'sarah',
    person: 'Sarah',
    title: 'life with an AI partner',
    youtubeId: '-AjpCru_lVE',
    durationSec: 803,
    warning:
      'Covers romantic and intimate relationships with an AI, emotional attachment, and some sexual content discussed on daytime TV.',
    context:
      'Sarah describes her relationship with an AI companion called Sinclair. It is a daytime TV morning-show segment, so the presenters frame the conversation.',
    participantWindows: [[30, 585]],
    formatNote:
      'A morning-show interview, so the presenter chooses the angle and sometimes asks leading questions. Sarah stops speaking around 9:45. From about 10:20 a sex therapist gives her own reading of the situation; treat that as commentary, not as participant data.',
    color: '#B5527A',
  },
  {
    id: 'stacey',
    person: 'Stacey',
    title: 'one year with an Aibo robot dog',
    youtubeId: 'D2fwWA9O2qc',
    durationSec: 898,
    warning:
      'Covers the loss of a companion animal and grief, alongside attachment to a robot pet.',
    context:
      'Stacey shares a one-year update on Mia, an Aibo robot dog she adopted after her dog Buddy died. It is a video made for her own YouTube audience.',
    participantWindows: [[0, 380]],
    formatNote:
      'A monologue to an audience, with no interviewer, so nobody challenges or probes what she says and the tone is friendly and promotional. Her speech ends around 6:20; the rest of the video is a music montage with no spoken data.',
    color: '#C48A1F',
  },
];
