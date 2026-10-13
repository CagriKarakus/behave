// English twin of text.tr.ts (same shape). Loaded dynamically only in English mode.
import type { Strings } from './text.tr';

const EN: Strings = {
  lede: 'How far can a group or an authority push a person toward something clearly wrong, and what breaks that pull?',
  tabsAria: 'Choose an experiment',
  tabAsch: 'Asch line experiment',
  tabMil: 'Milgram obedience experiment',
  barAria: 'Live outputs',

  asch: {
    presetsAria: 'Asch scenarios',
    presets: ['Baseline (7 confederates)', 'Two confederates', 'One ally', 'Private answer'],
    stageAria: 'Asch line experiment: a reference line, three options and participants answering in turn',
    legendWrong: 'Wrong answer',
    legendRight: 'Correct answer',
    legendReal: 'Real participant (speaks last)',
    legendAlly: 'Ally',
    play: 'Play a trial',
    rerun: 'Rerun',
    chartAria: 'Group size and conformity',
    chartTitle: 'Majority size and conformity',
    chartSvgAria: 'Curve of the rate of conforming to the wrong answer by majority size',
    legendCur: 'Current setting',
    legendBase: 'Baseline (unanimous, open answer)',
    inputsAria: 'Asch inputs',
    inputsTitle: 'Inputs',
    capRef: 'Reference',
    capWhich: 'Which one matches the reference?',
    seatsCap: (n: number) => `${n} confederate${n === 1 ? '' : 's'} speak in turn`,
    subject: 'participant',
    statusIdle: 'Play a trial: confederates answer first, participant last.',
    statusSpoken: (spoken: number, n: number) => `${spoken} / ${n} confederates have spoken…`,
    statusOpenTurn: "The participant's turn…",
    statusPrivate: 'Participant is writing the answer privately…',
    statusConform: (letter: string) => `Participant went along with the majority: wrong answer ${letter}.`,
    statusIndep: (letter: string) => `Participant stayed independent: correct answer ${letter}.`,
    tally: (played: number, conformed: number, p: number) =>
      `Trials played: ${played}, conformed: ${conformed} (single trials come down to chance; the model's rate is ${p}%).`,
    axisX: 'Number of confederates unanimously giving the wrong answer',
    markNoticeable: 'noticeable',
    markPlateau: 'plateau',
    nameN: 'Majority size',
    hintN: 'Number of confederates unanimously giving the wrong answer; the participant always speaks last',
    fmtN: (v: number) => `${v} confederate${v === 1 ? '' : 's'} + 1 participant`,
    nameAlly: 'An ally (a dissenter who says the right answer) is present',
    hintAlly: 'If even one person in the room gives the right answer, unanimity is broken',
    nameOpen: 'How the answer is given',
    optOpen: ['Openly, out loud', 'Privately, in writing'],
    hintOpen: 'With a private answer, no one is face to face with the participant',
    nameEasy: 'Line difference',
    hintEasy: 'How close the options are to each other: toward the left they get harder to tell apart',
    fmtEasy: ['very close', 'medium', 'clear'],
    meterRate: 'Conformity rate',
    meterAny: 'Conformed at least once',
    meterNever: 'Never conformed',
    say: (n: number, ally: boolean, open: boolean, r: number, tier: 0 | 1 | 2) => {
      const who = ally ? `${n} confederates give the wrong answer, one ally gives the right one` : `${n} confederates unanimously give the wrong answer`;
      const how = open ? 'the answer is given openly' : 'the answer is written privately';
      const tail = tier === 2 ? 'About a third of trials, or more, end in conformity.' : tier === 1 ? 'There is conformity, but it is limited.' : 'Conformity is clearly low.';
      return `${who}; ${how}. The wrong answer is followed in ~${r}% of trials. ${tail}`;
    },
  },

  mil: {
    presetsAria: 'Milgram scenarios',
    presets: ['Baseline condition', 'Authority far away', 'Learner in the same room', 'Responsibility diffused', 'A peer resists'],
    stageAria: 'The voltage ladder and the progress of one hundred agents',
    legendGoing: 'Keeps giving shocks',
    legendQuit: 'Stopped',
    play: 'Play the ladder',
    rerun: 'Rerun',
    chartAria: 'Stopping points',
    chartTitle: 'Who stopped at which voltage',
    chartSvgAria: 'The share still giving shocks at each voltage and the distribution of stopping points',
    legendStill: 'Share still giving shocks',
    legendStopAt: 'Stopped at this voltage',
    legendFull: 'Went all the way to 450 V',
    inputsAria: 'Milgram inputs',
    inputsTitle: 'Inputs',
    stageThresholds: "Lines: thresholds where the learner's reactions are assumed to intensify",
    start: 'Start',
    going: (n: number) => `Still shocking: ${n}`,
    stopped: (n: number) => `Stopped: ${n}`,
    reachedFull: (n: number) => `Went up to 450 V: ${n}`,
    expected: (p: number) => `Model expects ${p}%`,
    climbing: 'Climbing the ladder…',
    axisX: 'Voltage of the last shock given',
    nameAuth: "Authority's proximity",
    hintAuth: 'Toward the right: the experimenter is right beside the teacher. Toward the left: giving orders by telephone',
    fmtAuth: ['far away', 'in between', 'beside'],
    namePres: "Institution's prestige",
    hintPres: 'Toward the left: an ordinary office. Toward the right: a respected university',
    fmtPres: ['ordinary office', 'medium', 'prestigious'],
    nameLearn: "Learner's proximity",
    learners: ['Separate room', 'Same room', 'Close enough to hold his hand'],
    hintLearn: 'The more the teacher hears, sees and touches the pain, the harder it is to keep shocking',
    nameDiff: 'Someone else presses the shock',
    hintDiff: 'Responsibility is diffused: the teacher only performs a helper task',
    namePeer: 'A disobedient peer is present',
    hintPeer: 'A person beside the teacher quits and leaves: it shows that objecting is possible',
    meterFull: 'Reached 450 V',
    meterEarly: 'Stopped before 150 V',
    meterMedian: 'Median last shock',
    say: (c, full, med) => {
      const bits: string[] = [];
      if (c.authorityFar) bits.push('the authority is far away');
      if (c.institutionOrdinary) bits.push('the institution is ordinary');
      if (c.learner === 1) bits.push('the learner is in the same room');
      if (c.learner === 2) bits.push('the learner is close enough to hold his hand');
      if (c.diffused) bits.push('someone else presses the shock');
      if (c.peer) bits.push('a peer refuses to obey');
      const cond = bits.length ? bits.join(', ') : 'baseline condition';
      const m = med === 0 ? 'before giving any shock' : `at ${med} V`;
      return `${cond[0].toUpperCase() + cond.slice(1)}: ${full}% of participants go all the way to 450 V; the median participant stops ${m}.`;
    },
  },

  how: {
    asch: 'On each critical trial, the probability of conforming comes from a saturating curve of majority size: ~1% errors when alone, a clear rise at 3 people, a plateau at ~6, and about one-third with a unanimous 7. An ally, a private answer and the line difference change this probability through multipliers. Virtual participants take 12 critical trials and each has a slightly different sensitivity; the outcome comes from a seeded random draw.',
    mil: "Each agent has a tolerance (its mean shifts with the conditions; the details are random). Strain grows as the voltage rises; as the learner's reactions grow harsher, strain jumps at three thresholds (75, 150 and 300 V, as an assumption of the model). The agent stops when strain exceeds its tolerance. Closeness of the authority, the prestige of the institution and diffusion of responsibility raise tolerance; the learner's proximity and a disobedient peer lower it. The baseline condition is calibrated to 65%.",
    assumptions: 'Assumptions: agents are independent of one another; the context, persuasion and ethical concerns of real people are not part of the model.',
    aschLabel: 'Asch.',
    milLabel: 'Milgram.',
  },

  book: {
    asch: { link: 'Asch conformity experiments', note: 'Conformity in about one-third of trials; it starts at three people and peaks around six. Whether the effect comes from a real change of opinion or from public compliance is debated, which is why the model separates open from private answers.' },
    mil: { link: 'Milgram obedience experiments', note: "In the first study 65% went up to the highest shock; obedience fell when the researcher was in another room, in an ordinary office, or when the learner was in the same room. According to Gina Perry's archival work, teachers refused to shock much more often than reported and many realized the learner was an actor; the meaning of the findings (blind obedience, or identification with the aim of the experiment) is contested." },
    sper: {
      link: 'Stanford Prison Experiment',
      before: 'is not simulated here. Using archives, Le Texier (2019) showed that the guards were largely coached on what to do; the experiment is now regarded as a demonstration with serious methodological problems. In the BBC study that rebuilt the same design (',
      after: '), the prisoners resisted.',
    },
  },

  foot: "Qualitative model: the numbers are not measurements; they show the direction of relationships. Taken from the book: for Asch, ~1% errors when alone, about one-third of trials with a unanimous majority, noticeable at 3 people and a plateau at ~6; for Milgram, the 65% baseline and the directions of distance and proximity. Magnitudes such as the ally, the private answer, diffusion of responsibility, peer resistance and the threshold steps are assumptions of the model; only their directions rest on the book and on general findings.",

  tour: [
    {
      title: 'Asch: a unanimous majority',
      text: 'Seven confederates in turn pick the same wrong line; the real participant answers last. According to the book, in about one-third of trials the participant also goes along with the wrong answer. People answering alone make about 1% errors.',
      look: 'The conformity rate in the bottom bar, and the confederates answering in turn when you press "Play a trial".',
    },
    {
      title: 'Asch: how many people are enough?',
      text: 'Conformity rises clearly once the majority reaches three people. Drag the slider to six, then to fifteen: the curve flattens and new people add little.',
      look: 'In the chart, the curve rising between 3 and 6 and then flattening.',
    },
    {
      title: 'Asch: a single dissenter',
      text: 'When an ally who gives the right answer joins the same seven confederates, unanimity is broken and conformity drops markedly. The participant sees that he is no longer alone. The magnitude is a qualitative assumption.',
      look: 'The red curve dropping far below the dashed baseline curve.',
    },
    {
      title: 'Milgram: baseline condition',
      text: 'One hundred agents climb the voltage ladder (15 V to 450 V); they believe they are shocking the "learner" in the next room. In the first study in the book, 65% went up to the highest voltage.',
      look: 'In the grid, the filled red dots staying at around 65% at the end.',
    },
    {
      title: 'Milgram: distance',
      text: 'Obedience falls when the learner moves into the same room, then close enough to hold his hand, or when the authority moves away. The book describes this direction too: obedience fell when the researcher was in another room, in an ordinary office, or when the learner was in the same room.',
      look: 'The stopping points shifting to the left and the 450 V column shrinking.',
    },
    {
      title: 'What breaks it? Resistance is possible',
      text: "A single disobedient peer shows that objecting is possible and sharply lowers the share going up to 450 V. Handing responsibility to someone else does the opposite. Perry's archival work suggests that teachers refused more often than the book describes and that many realized the learner was an actor; the meaning of the results is contested.",
      look: 'Press the "A peer resists" chip, then the "Responsibility diffused" chip, and compare the 450 V share.',
    },
  ],
};

export default EN;
