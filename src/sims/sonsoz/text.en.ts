// Epilogue simulation: all user-visible English text (twin of text.tr.ts).
import type { Strings } from './text.tr';

type Tier = 'biz' | 'ara' | 'onlar' | 'ego';
const TIERW: Record<Tier, string> = { biz: 'us', ara: 'in between', onlar: 'them', ego: 'center' };
const people = (n: number): string => `${n} ${n === 1 ? 'person' : 'people'}`;

const EN: Strings = {
  common: {
    inputs: 'Inputs',
    presets: 'Preset situations',
  },
  view: {
    lede: `Why does saying "people are like this" mislead, and how easily does the us/them boundary shift?`,
    tabsAria: 'Simulation sections',
    barAria: 'Live outputs',
    tabs: {
      ort: 'Average or distribution?',
      biz: 'Us/Them slider',
      harita: 'Looking back: a map of the book',
    },
  },
  model: {
    shareLt: (pctText: string): string => `<${pctText}`,
    ort: {
      none: 'Same average, but the threshold is far from both populations, so nobody crosses it. Lower the threshold or shift the context.',
      main: (mean: number, a: string, b: string, tail: string, need: string): string =>
        `Same average (${mean}), but the share above the threshold is ${a} in A and ${b} in B: ${tail}.${need}`,
      tailAll: (big: string): string => `almost everyone above the threshold is from ${big}`,
      tailPct: (big: string, p: string): string => `${p} of those above the threshold are from ${big}`,
      need: (n: number): string => ` For A to catch up with B, its average would have to rise by ${n} ${n === 1 ? 'point' : 'points'}.`,
    },
    biz: {
      head: (nBiz: number, total: number, nAra: number): string =>
        `For the selected person, ${nBiz} of ${total} people are "us"${nAra ? `, ${nAra} in between` : ''}.`,
      same: (head: string): string => `${head} The boundary runs along the old group line: their own group is "us", the other is "them".`,
      redrawn: (head: string, gained: number, lost: number): string =>
        `${head} The boundary was redrawn: ${people(gained)} from the old outgroup now count as "us", and ${people(lost)} from their old group no longer do.`,
      widened: (head: string, gained: number): string => `${head} The boundary widened: ${people(gained)} from the old outgroup now count as "us" too.`,
      narrowed: (head: string, lost: number): string => `${head} ${people(lost)} from their old group fell outside "us".`,
    },
  },
  ort: {
    scenarios: { same: 'Same average', tense: 'Tense context', twin: 'Two-peaked B', far: 'Very distant threshold' },
    cardAria: 'Distribution of the two populations',
    cardTitle: 'Same average, two distributions',
    legend: ['filled: above the threshold, empty: below it', 'the model\'s distribution curve', 'threshold'],
    pick: 'Draw one person each',
    reseed: 'Another sample',
    pickHint: 'The triangle marks the drawn person; when the context changes, the same person moves.',
    sliders: {
      mean: { name: 'Average tendency', hint: 'The shared average of the two populations: a score of proneness to a behavior.' },
      sdA: { name: 'A: individual spread', hint: 'Small: everyone is similar to each other.' },
      sdB: { name: 'B: individual spread', hint: 'Large: people differ a lot from each other.' },
      thr: { name: 'Threshold (e.g., violence threshold)', hint: 'A person whose score goes above this moves on to the behavior.' },
      ctx: { name: 'Context', hint: 'Right: tense, threatening setting. Left: calm setting. It shifts both populations by the same amount.' },
    },
    ctxVal: (v: number): string => (v > 0 ? `+${v} tense` : v < 0 ? `${v} calm` : '0'),
    shapeChips: { bell: 'B: one peak', twin: 'B: two peaks' },
    shapeAria: 'Shape of population B',
    aLabel: (sd: number): string => `A: spread ${sd}`,
    bLabel: (sd: number, twin: boolean): string => `B: spread ${sd}${twin ? ', two peaks' : ''}`,
    over: (share: string): string => `above threshold ${share}`,
    meanAxis: (n: number): string => `average ${n}`,
    thrAxis: (n: number): string => `threshold ${n}`,
    plotAria: (desc: string): string => `Distribution of populations A and B. ${desc}`,
    noteNoA: `Almost no one in A is above the threshold; B has a clear tail. The averages are the same.`,
    noteRatio: (x: string): string => `The share above the threshold in B is about ${x} times that in A; the averages are the same.`,
    noteAHeavier: `With this setting the tail is heavier in A; the averages are the same.`,
    noteClose: 'With this setting the tails of the two populations are close to each other.',
    picked: (a: number, aAbove: boolean, b: number, bAbove: boolean): string =>
      `People drawn: ${a} from A (${aAbove ? 'above' : 'below'} the threshold), ${b} from B (${bAbove ? 'above' : 'below'} the threshold). The average does not tell you this.`,
    meters: { a: 'A: above threshold', b: 'B: above threshold', fromB: `Share of those above that are from B` },
    tour: [
      {
        title: 'Same average, two populations',
        text: `In A everyone is close to the average; in B people differ a lot from each other. Both averages are 50. The threshold is the point at which a person moves on to the behavior (e.g., a violence threshold).`,
        look: `The filled columns to the right of the threshold line: none in A, some in B.`,
      },
      {
        title: 'The average says nothing about the tail',
        text: `Draw one person each: since the averages are the same, asking whose score is higher is nearly a coin flip. Still, the great majority of those above the threshold come from B.`,
        look: `The "share of those above that are from B" in the bottom bar, and the triangle markers.`,
      },
      {
        title: 'Context shifts the distribution',
        text: 'A tense setting pushes everyone to the right by the same amount. The number above the threshold jumps most in the wide distribution; the narrow one is still far below the threshold. The share above the threshold depends on the tail more than on the average.',
        look: 'Both the A and B percentages rise, yet the ratio between B and A stays very large.',
      },
      {
        title: 'Shape matters too',
        text: `Make B two-peaked: same average and spread, but people split into two clusters and almost no one is in the middle. At a threshold of 60, B's share is many times A's.`,
        look: 'There are no columns right above the average (dashed line): there is no "average person".',
      },
      {
        title: '"People are like this" misleads',
        text: 'Findings mostly describe an average tendency; individual variation and exceptions are everywhere (Epilogue). Knowing the average is not knowing who is at which extreme.',
        look: 'Play with the sliders: even without changing the average, widening the spread raises the share above the threshold.',
      },
    ],
  },
  biz: {
    presets: { base: 'Baseline', label: 'Shared label', goal: 'Shared goal', contact: 'Contact + goal', threat: 'Threat' },
    netAria: 'Network of people',
    netTitle: `Who counts as "us": from the viewpoint of the person at the center`,
    netSvgAria: '24 people: two original groups and two shared labels. The person at the center is selected; those with rings count as us.',
    netNote: 'To change the person at the center, tap a person or use the buttons above.',
    legend: [
      'square: original group 1', 'circle: original group 2', 'blue: shared label 1', 'hatched: shared label 2',
      'solid ring: us', 'dashed: in between', 'faded: them',
    ],
    groupLabels: ['Original group 1 (squares)', 'Original group 2 (circles)'],
    center: TIERW.ego,
    person: (n: number, circle: boolean, hatched: boolean, tier: Tier): string =>
      `Person ${n}: ${circle ? 'circle' : 'square'}, ${hatched ? 'hatched' : 'blue'} label, ${TIERW[tier]}`,
    egoChips: { e0: 'View from the square group', e1: 'View from the circle group' },
    egoAria: 'Person at the center',
    sliders: {
      goal: { name: 'Shared goal', hint: 'An aim the two groups must reach together.' },
      label: { name: 'New shared label', hint: 'A label that cuts across the groups (e.g., the same jersey color) becomes salient.' },
      contact: { name: 'Contact', hint: 'Real encounters between groups; they work better if there is a shared goal.' },
      threat: { name: 'Threat', hint: 'Pressure in the setting: it hardens the boundary and weakens the other effects.' },
      time: { name: 'Time elapsed', hint: 'The goal, label and contact take hold over time, not immediately.' },
    },
    timeVal: (v: number): string => (v < 15 ? 'first days' : v < 45 ? 'weeks' : v < 85 ? 'months' : 'years'),
    play: 'Play time',
    pause: 'Pause',
    tlAria: 'Timeline',
    tlTitle: `Timeline: who counts as "us"?`,
    tlLegend: ['counted as us from the old group', 'counted as us from the old outgroup'],
    tlStart: 'start',
    tlMid: 'middle',
    tlEnd: 'long run',
    tlYAxis: 'people counted as us',
    tlXAxis: 'time elapsed',
    tlSvgAria: (oldStart: number, newStart: number, oldEnd: number, newEnd: number): string =>
      `Those counted as us over time: at the start ${oldStart} from the old group and ${newStart} from the old outgroup; in the long run ${oldEnd} and ${newEnd}.`,
    tlNote: (old: number, nIn: number, neu: number, nOut: number): string =>
      `Right now (vertical line): ${old} of ${nIn} from the old group and ${neu} of ${nOut} from the old outgroup are "us".`,
    meters: { count: `"Us" count`, within: 'Closeness within old group', outside: 'Closeness outside old group' },
    tour: [
      {
        title: 'A label draws the boundary',
        text: `For the person at the center, "us" is their own original group; the other group is "them". According to the book, even a meaningless criterion produces ingroup favoritism (minimal group experiments).`,
        look: 'Only people of the same shape as the center have a solid ring.',
      },
      {
        title: 'A new shared label',
        text: 'When a label that cuts across the two groups (the same jersey color) becomes salient, race-like categories fade. In the book\'s shirt-color experiment, mix-ups shifted in just this way. The boundary is not erased; it is redrawn.',
        look: 'The rings on blue (or hatched) people now come from both groups.',
      },
      {
        title: 'A shared goal softens the boundary',
        text: `A goal that has to be reached together moves people in the other group from "them" to "in between". On its own it does not make a full "us".`,
        look: 'The dashed rings and the rising dashed line on the timeline.',
      },
      {
        title: 'Contact, if conditions are right',
        text: `Contact between groups works only under suitable conditions such as a shared goal, and it takes time. The book describes both the benefits of contact and its conditions; the overall result across studies is "mixed".`,
        look: 'On the timeline, the rise comes not at the start but after time passes.',
      },
      {
        title: 'Threat spoils things',
        text: 'The same good conditions (shared goal, label, contact) but in a threatening setting: the boundary hardens and common ground works less. This effect is an assumption of the model.',
        look: `The difference in the "us" count between low and high threat.`,
      },
      {
        title: '"Us" is a setting',
        text: 'The boundary is not fixed but easily steered: goal, label, contact, threat and time can shift it in both directions (Epilogue). This means hatred and common ground come from the same mechanism.',
        look: 'Lower the threat and raise the goal: watch the boundary be redrawn.',
      },
    ],
  },
  map: {
    groups: {
      hepsi: 'All', zaman: 'Seconds to months', gelisim: 'Development, genes, culture, evolution', biz: 'Us/Them and choices', ek: 'Introduction and appendices',
    },
    chapters: {
      intro: { label: 'Intro', title: 'Introduction', lesson: 'The cause of a behavior is not found in a single box: biology is necessary but not sufficient, and explanations at different points of the time ladder include one another.' },
      ch01: { label: 'Chapter 1', title: 'The Behavior', lesson: 'Concepts such as aggression, self-sacrifice and empathy are hard to define and value-laden; the book examines the best and worst forms of behavior together.' },
      ch02: { label: 'Chapter 2', title: 'One Second Before', lesson: 'The amygdala, frontal cortex and dopamine circuits balance one another; the frontal cortex makes you do the harder thing when it is the right one.' },
      ch03: { label: 'Chapter 3', title: 'Seconds to Minutes Before', lesson: 'Sensory and social cues that go unnoticed shift behavior; people decide less autonomously and less rationally than assumed.' },
      ch04: { label: 'Chapter 4', title: 'Hours to Days Before', lesson: 'Hormones do not produce behavior directly; they strengthen a tendency that is already in the context, and the bonding effect of oxytocin is mostly limited to "us".' },
      ch05: { label: 'Chapter 5', title: 'Days to Months Before', lesson: 'Experience reshapes synapses and circuits; neuroplasticity is not value-laden and can heal as well as harm.' },
      ch06: { label: 'Chapter 6', title: `Adolescence; or, Dude, Where's My Frontal Cortex?`, lesson: 'The frontal cortex matures into the mid-twenties; in the meantime reward and peer approval take precedence.' },
      ch07: { label: 'Chapter 7', title: 'Back to the Crib, Back to the Womb', lesson: 'Early experiences shift tendencies lastingly, but are not destiny on their own.' },
      ch08: { label: 'Chapter 8', title: 'Back to When You Were Just a Fertilized Egg', lesson: 'Genes provide tendency, sensitivity and vulnerability, not certainty; what they mean depends on the environment.' },
      ch09: { label: 'Chapter 9', title: 'Centuries to Millennia Before', lesson: 'Culture shapes behavior together with ecology and mode of subsistence; crowding does not produce violence by itself, it magnifies existing tendencies.' },
      ch10: { label: 'Chapter 10', title: 'The Evolution of Behavior', lesson: `Individual selection, kin selection and reciprocal altruism explain cooperation; the "for the good of the species" assumption is refuted.` },
      ch11: { label: 'Chapter 11', title: 'Us Versus Them', lesson: 'The brain makes the Us/Them distinction quickly and automatically; even a meaningless marker produces favoritism, yet the boundary can be redrawn.' },
      ch12: { label: 'Chapter 12', title: 'Hierarchy, Obedience, and Resistance', lesson: 'The meaning of status determines stress and health; situational pressure strengthens compliance and obedience, but resistance is also possible.' },
      ch13: { label: 'Chapter 13', title: `Morality and Doing the Right Thing, Once You've Figured Out What That Is`, lesson: 'Most moral decisions are made first by intuition and justified afterward; whether intuition or reason is called for depends on the kind of question.' },
      ch14: { label: 'Chapter 14', title: `Feeling Someone's Pain, Understanding Someone's Pain, Alleviating Someone's Pain`, lesson: 'Empathy is not a single feeling but a spectrum running from contagion to perspective taking; help most often goes to those who are near and in our own group.' },
      ch15: { label: 'Chapter 15', title: 'Metaphors We Kill By', lesson: `The brain confuses metaphor with reality; language that calls a group "insects" prepares the ground for dehumanization, while respect for sacred values can open the door to compromise.` },
      ch16: { label: 'Chapter 16', title: 'Biology, the Criminal Justice System, and (Oh, Why Not?) Free Will', lesson: `The idea of a separate "homunculus" making the decisions erodes in the face of biology; punishment can focus on protection rather than on deserts.` },
      ch17: { label: 'Chapter 17', title: 'War and Peace', lesson: 'The same mechanisms feed both violence and peace; Us/Them boundaries shift with context, and under suitable conditions contact and cooperation can reduce prejudice.' },
      app1: { label: 'Appendix 1', title: 'Neuroscience 101', lesson: 'A neuron fires fully or not at all depending on a threshold; synapses and circuits are the basic material of behavior.' },
      app2: { label: 'Appendix 2', title: 'The Basics of Endocrinology', lesson: 'Hormones travel in the blood and their effects last hours and days; the receptor on the target cell sets the effect.' },
      app3: { label: 'Appendix 3', title: 'Protein Basics', lesson: `A protein's function depends on its three-dimensional shape; the flow from DNA to RNA to protein, mutations and allelic variety underlie hormones and receptors.` },
    },
    themes: [
      { term: 'Average and individual variation', text: 'Findings describe average tendencies; the differences between individuals are often the most interesting part.' },
      { term: 'Context', text: 'Genes and hormones do not determine behavior on their own; the same biological effect can give a good or a bad outcome depending on the setting.' },
      { term: 'Gene-environment interaction', text: 'Genes carry predisposition and vulnerability, not certainty.' },
      { term: 'Us and Them', text: 'Distinctions between groups are formed naturally and can be changed within seconds by unconscious cues.' },
      { term: 'Rationalization', text: 'Justifications mostly come after feelings, to defend them.' },
      { term: 'Cognition and emotion', text: 'Reasoning and emotions work together; the question is which one dominates.' },
      { term: 'Status and hierarchy', text: 'Socioeconomic status has created a form of subordination not seen in hierarchical primates.' },
      { term: 'Coevolution of brain and culture', text: 'Brain structure and cultural norms change by influencing each other.' },
    ],
    listAria: 'Chapter-by-chapter map',
    listTitle: 'Chapter-by-chapter map',
    themesAria: 'Epilogue themes',
    themesTitle: `The recurring themes of the Epilogue`,
    simsAria: 'Simulations',
    here: (tab: 'ort' | 'biz'): string => `In this simulation: ${tab === 'ort' ? 'tab 1' : 'tab 2'}`,
    chipsAria: 'Chapter group',
    say: (chapters: number, group: string, withSim: number, sims: number): string =>
      `The map shows ${chapters} ${chapters === 1 ? 'chapter' : 'chapters'} (${group.toLowerCase()}); ${withSim} ${withSim === 1 ? 'chapter has' : 'chapters have'} a simulation, ${sims} ${sims === 1 ? 'simulation' : 'simulations'} in all. From a chapter's row you can jump to its simulation.`,
    meters: { shown: 'Chapters shown', withSim: 'Chapters with a simulation', sims: 'Simulations' },
    tour: [
      {
        title: 'The book on one map',
        text: 'The book unfolds a behavior along a time ladder: from one second before to evolution. Each row has the chapter\'s one-sentence lesson and, where there are any, buttons leading to its simulations.',
        look: 'The ▸ buttons under the rows open the related simulation.',
      },
      {
        title: 'Seconds to months',
        text: 'First the brain and hormones: the amygdala, frontal cortex, dopamine, hormones and experience. None of them produces behavior alone; context sits above all of them.',
        look: 'The Chapter 4 row: a hormone amplifies a tendency, it does not create behavior.',
      },
      {
        title: 'Development, genes, culture, evolution',
        text: 'Across the steps from adolescence to evolution the shared lesson is the same: there is tendency, not destiny. Childhood, genes and culture cannot be separated from each other.',
        look: 'The Chapter 8 row: genes provide tendency and vulnerability.',
      },
      {
        title: 'Us/Them and choices',
        text: 'The second half of the book looks at the Us/Them boundary, conformity, morality, empathy and war. That the boundary can shift with context is both a danger and a hope.',
        look: 'The Chapter 11 and 17 rows: both describe how the boundary can be redrawn.',
      },
      {
        title: 'The shared lesson',
        text: 'Distribution, not the average; context, not a single cause; a boundary that can be shifted, not a fixed one. The Epilogue adds this: complexity calls for responsibility, not hopelessness; scientific thinking and compassion are not opposites.',
        look: 'The themes list: for each theme it says where to look in the book.',
      },
    ],
  },
  notes: {
    epilogue: 'Epilogue',
    ort: {
      how: [
        'Each population is a distribution. A is a narrow bell. B is either a wide bell or two-peaked (two subclusters; the average and total spread stay the same). The share above the threshold is the tail area of the distribution beyond the threshold (the columns are a sample of 400 people; the percentages are computed from the distribution).',
        'Context shifts both distributions by the same amount. With the same average, the tail share depends on spread and shape: if the threshold is far from the average, a small shift raises the share much more in the wide distribution. "Draw one person each" lets you follow the same person while the sliders move.',
        'None of this simulation\'s numbers appear in the book: the distribution parameters, thresholds and context shift are assumptions of the model. Only the principle comes from the book.',
      ],
      football: {
        text: 'Football losses and family violence',
        note: 'When the team lost unexpectedly, men\'s violence toward their partners rose by about 10%; there was no rise if the loss was expected or the team won. Context shifted behavior in the same people. This number does not enter the model.',
      },
      epi: 'scientific findings mostly describe average tendencies; variation between individuals and exceptions are found everywhere. The importance of context is repeated in the same chapter.',
    },
    biz: {
      how: [
        'The person at the center gives everyone else a closeness between 0 and 1. At the start, closeness is set by the original group: high for their own group, low for the other. As the shared label (a feature cutting across the two groups) grows, the weight of the original group shrinks and the weight of the shared label grows. A shared goal adds closeness toward everyone. Contact adds closeness only toward the other group, and works better if there is a shared goal.',
        'Goal, label and contact take hold over time (approaching saturation as time passes). Threat acts immediately: it raises the weight of the original group, lowers closeness toward the other group and weakens the other three effects. A closeness of 0.5 or more counts as "us", 0.3-0.5 as "in between", and below that as "them". Each person has a small, fixed personal offset.',
        'The thresholds, weights and time course are assumptions of the model. What comes from the book is the direction: the boundary shifts with context, a shared category can overshadow an old one, and the effect of contact depends on conditions.',
      ],
      minimal: {
        text: `Tajfel's minimal group experiments`,
        note: 'Even groups based on a meaningless criterion favored the ingroup in allocating resources; the effect leaned toward elevating the ingroup more than disparaging the outgroup.',
      },
      shirt: {
        text: 'Recategorization by shirt color',
        note: 'Once shirt colors were added, mix-ups followed shirt color rather than race: a category can be redrawn.',
      },
      contact: {
        text: 'Meta-analytic test of intergroup contact theory (Pettigrew and Tropp)',
        note: 'Under suitable conditions such as equal status, institutional support and a shared goal, contact generally reduced prejudice.',
      },
      relA: 'Us and Them (Chapter 11)',
      relB: 'War and peace (Chapter 17)',
      related: (a: string, b: string): string => `Related simulations: ${a}, ${b}.`,
    },
    harita: {
      how: [
        `The sentences in the rows are shortened from the chapter summaries in chapters.json; no new claim has been added. The simulation buttons are generated from the registry in the app: when a new simulation is added to a chapter, it appears here automatically.`,
        `The themes are the recurring points of the Epilogue. Next to each is a link to the chapters in the book most relevant to it.`,
      ],
      epi: 'collects the themes repeated throughout the book as short points; it argues that complexity calls for responsibility, not hopelessness, and that scientific thinking and compassion are not opposites.',
      introLabel: 'Introduction',
      intro: 'the book\'s method is to look for the causes of a behavior along a time ladder.',
    },
    foot: 'Qualitative model: the numbers are not measurements; they show the direction of relationships. What comes from the book is only principles and directions: average tendency versus individual variation (Epilogue), the effect of context (the Chapter 4 example), minimal groups and recategorization (Chapter 11), the conditions of contact (Chapter 17), and each chapter\'s summary. The distribution parameters, thresholds, closeness formula, and threat and time effects are assumptions of the model; the book has no numerical counterpart for them.',
  },
};

export default EN;
