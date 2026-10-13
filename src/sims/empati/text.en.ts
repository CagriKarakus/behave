import type { Strings } from './text.tr';

const EN: Strings = {
  lede: 'Does feeling another’s pain lead us to help, or lock us into our own distress?',
  tabs: ['Contagion and compassion', 'Whom to help?', 'Giving and reward'],
  tablistLabel: 'Sections',
  barLabel: 'Live outputs',
  inputs: 'Inputs',
  groups: ['Cagemate', 'Light stranger', 'Dark stranger'],
  targetName: { cage: 'cagemate', light: 'light-colored stranger', dark: 'dark-colored stranger' },
  strainName: { light: 'light', dark: 'dark' },

  e: {
    chipsLabel: 'Training conditions',
    presets: ['Empathy training', 'Compassion training', 'Baseline'],
    stageLabel: 'On the left, the person in pain; on the right, the observer. The red fill on the observer’s body shows their own distress, the amber circle their compassion. Arrows show whether attention is directed at the self or at the other person.',
    attnOther: 'attention: on the other',
    attnSelf: 'on the self',
    sufferer: 'person in pain',
    observer: 'observer',
    legendSelf: 'red fill and line: own distress',
    legendComp: 'amber: compassion',
    legendArrow: 'arrow: direction of attention',
    chartSection: 'Distress and compassion over time',
    chartTitle: 'Distress and compassion in the observer',
    chartLabel: 'Distress and compassion of the average observer over time, with the avoidance threshold',
    timeAxis: 'time (seconds, schematic)',
    threshold: 'avoidance threshold',
    distress: 'distress',
    compassion: 'compassion',
    dotsSection: 'Responses of forty observers',
    dotsTitle: 'What did the forty observers do?',
    dotsLabel: 'Responses of forty observers: those who helped, those who stayed passive and those who avoided the distress',
    legHelp: 'helps',
    legIdle: 'stays passive',
    legAvoid: 'avoids the distress',
    tally: (n, help, idle, avoid, r) =>
      `Of ${n} observers, ${help} helped, ${idle} stayed passive and ${avoid} avoided the distress. The relationship between distress and the probability of helping is r = ${r}.`,
    play: 'Play',
    stop: 'Stop',
    rerun: 'New observers',
    inputsSection: 'Contagion inputs',
    meters: ['Distress', 'Compassion', 'Helping'],
    sliders: {
      pain: ['Intensity of the observed pain', 'High: the person in pain is more distressed.'],
      self: ['Self-oriented perspective', 'High: thinking “what if it were me.” Low: thinking “what is it like for them.”'],
      train: ['Compassion training', 'A focus on warmth and care; it soothes distress.'],
      stress: ['Stress level', 'High stress strengthens contagion and reduces helping.'],
    },
    say: (focus, kind, avoid, help) => {
      const f = focus === 'self' ? 'Attention is mostly on the observer’s own distress'
        : focus === 'other' ? 'Attention is on the person in pain' : 'Attention is split between the self and the person in pain';
      const tail = kind === 'over' ? `distress is above the threshold; ${avoid} avoid it and only ${help} help.`
        : kind === 'warm' ? `compassion rises and distress stays below the threshold; ${help} help.`
          : `distress is below the threshold but compassion is weak; ${help} help.`;
      return `${f}: ${tail}`;
    },
  },

  b: {
    chipsLabel: 'Rat to be rescued',
    stageLabel: 'Left: the free rat. Middle: the rat waiting to be freed in the closed compartment. Right: chocolate. Arrows show the probability of rescuing and sharing.',
    observerBorn: 'observer (born light)',
    rearedBy: (strain) => `caregiver: ${strain} strain`,
    chocolate: 'chocolate',
    legRescue: 'rescue',
    legShare: 'sharing the chocolate',
    legArrow: 'arrow thickness: probability',
    chartSection: 'Rescue and sharing by target',
    chartTitle: 'How much help does each get?',
    chartLabel: 'Probabilities of rescue and chocolate sharing for the three targets, with the chocolate reference',
    legShare2: 'chocolate sharing',
    legChoc: (p) => `opening the chocolate door (${p}, reference)`,
    mouseSection: 'Pain contagion in mice',
    mouseTitle: 'Does a mouse feel the pain it watches?',
    mouseLabel: 'The observer mouse’s own pain response as a function of the watched mouse’s pain, for a cagemate and a stranger',
    mouseY: 'observer’s own pain response',
    mouseAlone: 'alone',
    few: 'low',
    many: 'high',
    mouseX: 'pain of the watched mouse (licking)',
    mouseCage: 'cagemate',
    mouseStranger: 'stranger',
    mouseTally: (familiar, resp, alone, gc) =>
      `Own pain response of a mouse watching ${familiar ? 'a cagemate' : 'a stranger'}: ${resp} (${alone} when alone). ` +
      (gc ? 'Glucocorticoid blocked: contagion also occurs with a stranger.' : 'Apart from the cagemate, there is almost no contagion.'),
    rearLabel: 'Strain that raised the observer',
    rear: ['Light-colored caregiver (own strain)', 'Dark-colored caregiver (cross-fostering)'],
    inputsSection: 'Inputs for the target of help',
    meters: ['Rescue', 'Chocolate sharing', 'Pain contagion'],
    days: ['Time living with the other strain', 'Days the observer has spent with a strain different from the one that raised it (model scale).'],
    daysVal: (v) => `${v} ${v === 1 ? 'day' : 'days'}`,
    cost: ['Cost of rescue', 'High: opening the door is hard or risky; help for those who are not “us” drops first.'],
    pp: ['Pain of the watched mouse', 'Watching a mouse that licks less reduces the pain response; watching one that licks more increases it.'],
    gc: ['Stress hormone (glucocorticoid) blocked', 'When on, pain contagion also appears with a stranger (Martin et al.).'],
    say: (target, rescue, share, contagious) =>
      `Target: ${target}. Rescue ${rescue}; if rescued, chocolate sharing ${share}.` +
      (contagious ? ' If the mouse is familiar, the watched pain is transmitted.' : ' If the mouse is a stranger, the watched pain is almost not transmitted.'),
  },

  g: {
    chipsLabel: 'Reward structure',
    presets: ['Mostly pure benefit', 'Mixed', 'Warm glow only'],
    barsSection: 'Reward circuit activity',
    barsTitle: 'Reward circuit: receiving money, taxation, giving',
    barsLabel: 'Average reward circuit activity when receiving money, under mandatory taxation and during voluntary giving',
    barNames: ['Receiving', 'Mandatory tax', 'Voluntary gift'],
    scSection: 'Tax reward and generosity',
    scTitle: 'If the reward under taxation is high, is giving high too?',
    scLabel: 'Reward circuit activity during taxation and voluntary generosity for forty participants',
    scX: 'reward circuit activity during taxation',
    scY: 'voluntary generosity',
    scTally: (r) => `Those whose reward circuit responded more strongly during taxation are more generous voluntarily: r = ${r} (the direction in the book).`,
    dunnSection: 'Spending money on oneself or on others',
    dunnTitle: 'Where does spending money make you happy?',
    dunnLabel: 'Change in happiness from spending $5 and $20 on oneself and on others, together with the outside forecast',
    dunnCond: ['On self $5', 'On self $20', 'On others $5', 'On others $20'],
    legBar: 'filled bar: the spender’s actual change',
    legForecast: 'line: forecast by outside observers',
    inputsSection: 'Reward inputs',
    meters: ['Reward: tax', 'Reward: gift', 'r: reward–gift'],
    altru: ['Sensitivity to others’ benefit', 'High: even under taxation, the reward circuit responds to the charity’s gain.'],
    warm: ['Warm glow (the reward of giving itself)', 'High: voluntary giving and spending on others make the person happier in addition.'],
    amount: ['Amount of the tax or gift', 'How much of the unexpected money goes to the food bank.'],
    rep: ['Preregistered replication level', 'When on, the effect of spending on others shrinks (Aknin et al. 2020; ×0.4 is a model assumption).'],
    say: (pts, level, r) =>
      `In voluntary giving the reward circuit is ${pts > 0 ? `${pts} points higher` : 'about the same'} than under mandatory taxation; ` +
      `the relationship between reward during taxation and generosity is ${level === 'strong' ? 'strong' : level === 'moderate' ? 'moderate' : 'weak'} (r = ${r}).`,
  },

  how: [
    '<b>Contagion and compassion.</b> There are two state variables. Distress rises with the intensity of the pain and with how self-directed attention is; compassion rises as attention turns to the other person and with compassion training. Compassion soothes distress. Once personal distress passes the threshold, the probability of avoidance climbs steeply. An observer who does not avoid helps with a probability proportional to the shared feeling and the compassion. The forty observers differ slightly in sensitivity and threshold.',
    '<b>Whom to help?</b> Each target has a degree of being counted as “one of us”: complete for the cagemate; for a stranger, the observer’s familiarity with that strain is decisive. There is full familiarity with the strain that raised the observer, and a familiarity with the other strain that grows with time spent together. Rescue is set by a soft threshold on this degree minus the cost; chocolate sharing rises with the bond with the rescued rat. In the mouse section, pain contagion is weighted by familiarity.',
    '<b>Giving and reward.</b> Under mandatory taxation, the reward comes only from sensitivity to the benefit of others. In voluntary giving, a warm glow (the reward of giving itself) is added. Generosity is a mixture of the two. The happiness from spending on others comes from the same warm glow and does not depend on the amount.',
    'Assumptions: the coefficients, the threshold and the scales are assumptions of the model; the virtual participants are independent; rats and mice are summarized by a single “us” weight.',
  ],

  book: {
    items: [
      (s) => `<a href="#/bolum/ch14?deney=ch14-e9">Empathy training versus compassion training (Klimecki and Ricard studies)</a> (replication: ${s.bilinmiyor}; small sample, expert meditators). Empathy training produced intense amygdala activity and an anxious mood; compassion training produced activity linked to the dopamine circuit, positive emotion and more prosociality. The training conditions were calibrated in this direction only.`,
      (s) => `<a href="#/bolum/ch14?deney=ch14-e7">Heart rate and helping behavior (Eisenberg et al.)</a> (${s.bilinmiyor}). People whose heart rate rose markedly on seeing pain helped less. <a href="#/bolum/ch14?deney=ch14-e8">Empathy for strangers when glucocorticoids are blocked (Martin et al.)</a> (${s.bilinmiyor}; single study, small human sample): when glucocorticoids were blocked, empathy toward strangers appeared.`,
      (s) => `<a href="#/bolum/ch14?deney=ch14-e4">Rat rescue experiments (Bartal et al.)</a> (replication: ${s.karışık}). Freeing a cagemate was as strong a motivation as chocolate; when both were possible, the chocolate was shared more than half the time. A rat raised with a different strain helped that strain. Whether the behavior is empathy, a reduction of one’s own distress or a wish for social contact is contested.`,
      (s) => `<a href="#/bolum/ch14?deney=ch14-e2">Social modulation of pain in mice (Langford et al., Mogil)</a> (${s.sağlam}; but the label “empathy” is contested). A mouse watching one that licked more licked more itself. This was seen only between cagemates.`,
      (s) => `<a href="#/bolum/ch14?deney=ch14-e12">Taxation and voluntary giving: brain reward (Harbaugh, Tricomi et al.)</a> (${s.bilinmiyor}; a single fMRI study, 19 participants). Dopamine activity and satisfaction were higher in voluntary giving than under mandatory taxation; that is, there is a self-interest component. <a href="#/bolum/ch14?deney=ch14-e11">Spending money on others promotes happiness (Dunn et al.)</a> (${s.karışık}): only spending on others increased happiness, and the amount made no difference; a preregistered replication (Aknin et al. 2020) found the effect markedly smaller.`,
      (s) => `<a href="#/bolum/ch14?deney=ch14-e5">Social class and the candy bowl experiment (Piff, Keltner et al.)</a> (replication: ${s.tartışmalı}). Studies with large, representative samples (Trautmann et al. 2013; Korndörfer et al. 2015) could not replicate the finding that the upper class behaves less ethically. For this reason it was not included in the model; it does not show that social class determines a person’s morality.`,
    ],
    moreTitle: 'Not simulated here',
    more: (s) => `<a href="#/bolum/ch14?deney=ch14-e3">Consolation behavior in prairie voles (Burkett, Young et al.)</a> (${s.bilinmiyor}): licking and grooming a stressed partner depends on oxytocin in the ACC; it was not directed at a stressed stranger. <a href="#/bolum/ch14?deney=ch14-e6">Discovery of mirror neurons (Rizzolatti and the Parma group)</a> (the macaque finding is ${s.sağlam}; the claim that they explain empathy is weakly supported). <a href="#/bolum/ch14?deney=ch14-e10">Response to seeing needles in acupuncturists (Cheng et al.)</a> (${s.bilinmiyor}): repeated exposure may reduce the response to another’s pain.`,
  },

  foot: 'Qualitative model: the numbers are not measurements; they show the direction of the relationships. What comes from the book: distress and avoidance after empathy training, positive emotion and helping after compassion training (Klimecki/Singer); people with high distress helping less; rescuing a cagemate being as strong a motivation as chocolate, with sharing more than half the time; helping the strain that raised the rat; pain contagion being specific to familiar individuals; higher reward in voluntary giving than under taxation; the happiness from spending on others being independent of the amount. The threshold (55%), the coefficients, the day scale, the percentages, the reward units and the ×0.4 shrinkage of the effect in the replication are assumptions of the model. The rat strains are not counterparts of human groups; they show that “us” is built through experience.',

  tour: [
    {
      title: 'Watching pain',
      text: 'The observer watches someone in pain. The feeling of the pain passes to them: the red line is their own distress, the amber line is compassion for the person in pain.',
      look: 'Press “Play” and watch how the two curves separate over time.',
    },
    {
      title: 'Locked into one’s own distress',
      text: 'When attention turns to “what if it were me” (the empathy training condition), distress crosses the threshold. Most observers who cross it avoid, and fewer help.',
      look: 'The red curve crossing the threshold line, and the crosses among the dots.',
    },
    {
      title: 'Turning toward the other',
      text: 'The same pain gives a different result when attention is turned to the other person and to warmth (the compassion training condition): distress stays below the threshold, compassion rises and helping increases.',
      look: 'The amber curve rising and the filled blue dots multiplying.',
    },
    {
      title: 'Whom does help go to?',
      text: 'A rat works as hard to free its cagemate as to get chocolate. In the model, it works much less for a rat it does not know and that comes from another strain.',
      look: 'The rescue bar of the “Dark stranger” group in the bar chart.',
    },
    {
      title: '“Us” widens with experience',
      text: 'As the days spent with the other strain increase, so does help for strangers of that strain. According to the finding in the book, a rat helps the strain that raised it, not its biological strain.',
      look: 'The rescue bar of the dark stranger with the days slider at 14. Also try the cross-fostering chip.',
    },
    {
      title: 'The reward of giving itself',
      text: 'Under mandatory taxation the reward circuit responds only to the benefit of others; in voluntary giving the reward of giving itself is added. Spending on others also makes people happier than spending on themselves, though outside forecasts say the opposite.',
      look: 'The voluntary gift bar being higher than the tax bar; in the Dunn chart, the filled bar and the forecast line pointing in opposite directions.',
    },
  ],
};

export default EN;
