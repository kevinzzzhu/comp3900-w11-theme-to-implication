import type { Resource } from '../types';

const doi = (d: string) => `https://doi.org/${d}`;

export const resources: Resource[] = [
  // Course
  {
    group: 'course',
    title: 'Reflexive thematic analysis lecture',
    cite: 'COMP3900 lecture 6',
    url: 'https://smcclab.au/thirty-nine-hundred-hci/lectures/06-reflexive-thematic-analysis.html',
    why: 'Start here for the six RTA phases; the write-up phase (anchor #/phase-6-write-up-a-report) is the one to revisit before your report.',
    verified: true,
  },
  {
    group: 'course',
    title: 'Week 7 workshop: thematic analysis',
    cite: 'COMP3900 workshop 6 (Week 7)',
    url: 'https://smcclab.au/thirty-nine-hundred-hci/workshops/06-thematic-analysis.html',
    why: 'The first pass at coding and theme building that today builds on.',
    verified: true,
  },
  {
    group: 'course',
    title: 'Week 11 workshop page',
    cite: 'COMP3900 workshop 10',
    url: 'https://smcclab.au/thirty-nine-hundred-hci/workshops/10-analysis-2.html',
    why: 'The official task descriptions this site follows, with the published examples.',
    verified: true,
  },
  {
    group: 'course',
    title: 'A worked example of reflexive thematic analysis',
    cite: 'Byrne, D. (2022). Quality & Quantity.',
    url: doi('10.1007/s11135-021-01182-y'),
    why: 'Walks through coding and theme development on real data, which helps when you are stuck between codes and themes.',
    verified: false,
  },

  // RTA
  {
    group: 'rta',
    title: 'Thematic analysis: a reflexive approach',
    cite: 'Braun & Clarke, thematicanalysis.net',
    url: 'https://www.thematicanalysis.net/',
    why: 'The authors’ own hub for the approach, with guidance and further reading.',
    verified: true,
  },
  {
    group: 'rta',
    title: 'Thematic analysis FAQs',
    cite: 'Braun & Clarke, thematicanalysis.net/faqs',
    url: 'https://www.thematicanalysis.net/faqs/',
    why: 'Short answers to common confusions such as themes versus topics and what counts as a good theme.',
    verified: true,
  },
  {
    group: 'rta',
    title: 'Reflecting on reflexive thematic analysis',
    cite: 'Braun, V. & Clarke, V. (2019). Qualitative Research in Sport, Exercise and Health, 11(4).',
    url: doi('10.1080/2159676X.2019.1628806'),
    why: 'Clarifies what makes RTA reflexive and why themes are built by the researcher rather than found in the data.',
    verified: true,
  },
  {
    group: 'rta',
    title: 'One size fits all? What counts as quality practice in (reflexive) thematic analysis?',
    cite: 'Braun, V. & Clarke, V. (2021). Qualitative Research in Psychology, 18(3).',
    url: doi('10.1080/14780887.2020.1769238'),
    why: 'Use it to check your themes against quality criteria and to avoid common RTA mistakes.',
    verified: true,
  },

  // Implications
  {
    group: 'implications',
    title: 'Implications for design',
    cite: 'Dourish, P. (2006). CHI 2006.',
    url: doi('10.1145/1124772.1124855'),
    why: 'Argues that implications are more than design recommendations and can concern research and practice too.',
    verified: true,
  },
  {
    group: 'implications',
    title: 'Generating implications for design through design research',
    cite: 'Sas, C., Whittaker, S., Dow, S., Forlizzi, J. & Zimmerman, J. (2014). CHI 2014.',
    url: doi('10.1145/2556288.2557357'),
    why: 'Shows how researchers actually get from findings to implications, which is the step Task 3 practises.',
    verified: true,
  },

  // AI
  {
    group: 'ai',
    title: 'We reject the use of generative artificial intelligence for reflexive qualitative research',
    cite: 'Jowsey, T., Braun, V., Clarke, V., Lupton, D. & Fine, M. (2025). Qualitative Inquiry.',
    url: doi('10.1177/10778004251401851'),
    why: 'Sets out why the originators of RTA think generative AI cannot do reflexive interpretation.',
    verified: true,
  },
  {
    group: 'ai',
    title: 'Performing an inductive thematic analysis of semi-structured interviews with a large language model',
    cite: 'De Paoli, S. (2024). Social Science Computer Review, 42(4), 997-1019.',
    url: doi('10.1177/08944393231220483'),
    why: 'The counter-position: an exploration of what an LLM can produce, useful to compare against Jowsey et al.',
    verified: false,
  },

  // Reflexivity
  {
    group: 'reflexivity',
    title: 'Reliability and inter-rater reliability in qualitative research',
    cite: 'McDonald, N., Schoenebeck, S. & Forte, A. (2019). Proc. ACM HCI (CSCW).',
    url: doi('10.1145/3359174'),
    why: 'Explains why HCI qualitative work often needs a different standard than inter-rater agreement, which frames why your themes can differ.',
    verified: true,
  },
  {
    group: 'reflexivity',
    title: 'Exploring positionality in HCI',
    cite: 'Singh et al. (2025). CHI 2025.',
    url: doi('10.1145/3706598.3713280'),
    why: 'Looks at how HCI researchers write about their positionality; check the paper before relying on any detail.',
    verified: false,
  },

  // Videos
  {
    group: 'videos',
    title: 'In the shadow of misperception',
    cite: 'Shinohara, K. & Wobbrock, J. (2011). CHI 2011.',
    url: doi('10.1145/1978942.1979044'),
    why: 'Optional background for Simon’s video on how assistive technology shapes social interactions.',
    verified: false,
  },
  {
    group: 'videos',
    title: 'My chatbot companion',
    cite: 'Skjuve, M. et al. (2021). International Journal of Human-Computer Studies, 149.',
    url: doi('10.1016/j.ijhcs.2021.102601'),
    why: 'Optional background for Sarah’s video on how people build relationships with chatbot companions.',
    verified: true,
  },
  {
    group: 'videos',
    title: 'Hardware companions?',
    cite: 'Friedman, B., Kahn, P. & Hagman, J. (2003). CHI 2003.',
    url: doi('10.1145/642611.642660'),
    why: 'Optional background for Stacey’s video on how owners talk about relationships with Aibo; a duplicate DOI exists, so check you have the right record.',
    verified: false,
  },

  // Examples
  {
    group: 'examples',
    title: 'Published example: Deng et al. (2022)',
    cite: 'Deng et al. (2022), pp. 11-16.',
    url: doi('10.1145/3491102.3501926'),
    why: 'Read pp. 11-16 to see how themes are turned into implications.',
    verified: true,
  },
  {
    group: 'examples',
    title: 'Published example: Tahmidul Karim et al. (2025)',
    cite: 'Tahmidul Karim et al. (2025), pp. 3-5.',
    url: doi('10.1145/3706599.3719895'),
    why: 'Read pp. 3-5 for a compact example of reporting themes alongside implications.',
    verified: true,
  },
  {
    group: 'examples',
    title: 'Published example: Choi, Andres & Martin (2024)',
    cite: 'Choi, Andres & Martin (2024), pp. 221-224.',
    url: doi('10.1145/3678299.3678321'),
    why: 'Read pp. 221-224 for how a short paper states what the findings mean for design.',
    verified: true,
  },
  {
    group: 'examples',
    title: 'Published example: Adiwangsa et al. (2024)',
    cite: 'Adiwangsa et al. (2024), pp. 5-8.',
    url: doi('10.1145/3613904.3641897'),
    why: 'Read pp. 5-8 to compare how implications are worded and tied back to the data.',
    verified: true,
  },
];
