import { money, percent } from '../../i18n/fmt';
import type { Strings } from './text.tr';

const EN: Strings = {
  info: {
    insula: ['Insula', 'A region that processes bodily feelings of aversion, disgust and pain. It becomes active for an unfair offer from a human, and the higher its activity, the more likely the offer is to be rejected. It is less active for the same offer from a computer. Whether the insula reflects disgust here or a more general violation of expectations is debated.'],
    amy: ['Amygdala', 'Evaluates threat and social vigilance. The more active it is after an unfair offer, the higher the probability of rejection. People with amygdala damage behave unusually generously and do not increase their rejection rate for unfair offers; the book interprets this as the amygdala adding an implicit suspicion to social decisions (an interpretation, not a measurement).'],
    caud: ['Caudate nucleus', 'Part of the reward circuit. Punishing someone who violates a norm activates this region, and more strongly when the punishment is costly. This is the "satisfaction" of rejecting: even when a cost is paid, it yields something. What is measured is blood flow in the region, not dopamine release directly.'],
    dlpfc: ['Dorsolateral prefrontal cortex (dlPFC)', 'Its general role is long-term interest and impulse control. This game holds a surprise: when the right dlPFC was silenced, people accepted unfair offers more often, yet still judged the offers to be unfair. The region behaved less like a brake on impulse and more like the part that turns a fairness goal into action. Only against a human; the left dlPFC had no effect.'],
    vm: ['vmPFC/OFC (value)', 'Binds the value of options to the social context. In the model it represents the monetary value of the offer and pulls toward accepting: the larger the share, the greater its activity. This role of the region in the Ultimatum Game rests on an assumption of the model, not on a measurement reported in the book.'],
  },

  nodes: {
    tek: { ab: 'OFFER' },
    amy: { ab: 'AMY', cap: 'amygdala · suspicion' },
    insula: { ab: 'INS', cap: 'insula · unfairness' },
    caud: { ab: 'CAU', cap: 'caudate · reject reward' },
    dlpfc: { ab: 'dlPFC', cap: 'fairness goal' },
    vm: { ab: 'vmPFC', cap: 'value · OFC' },
    dec: { ab: 'REJ', cap: 'rejection drive' },
  },
  nodeOffer: 'Offer',
  nodeReject: 'Rejection drive',

  lede: 'Why do we reject an unfair offer even when it costs us, and which parts of the brain pull on that decision?',
  chipsAria: 'Conditions',
  barAria: 'Live outputs',
  meterReject: 'Probability of rejection',
  meterJudge: 'Judges it unfair',
  meterThreshold: 'Acceptance threshold',
  thresholdAll: 'all',
  thresholdFrom: (t: number): string => `≥ ${money(t)}`,

  gameAria: 'Game',
  gameRule: (zero: number): string => `If you accept, you both get the share in the offer. If you reject, you both get ${money(zero)}.`,
  accept: 'Accept',
  reject: 'Reject',
  logAria: 'Round log',
  whoHuman: 'Human',
  whoComputer: 'Computer',
  round: (n: number, total: number): string => `Round ${n} / ${total}`,
  proposerLine: (who: string): string => `Proposer: ${who}`,
  offerText: (pot: number, offer: number): string => `Offers you <b>${money(offer)}</b> out of ${money(pot)}`,
  splitAria: (me: number, them: number): string => `Split: you ${money(me)}, other player ${money(them)}`,
  labMe: (me: number): string => `You ${money(me)}`,
  labThem: (them: number): string => `Other player ${money(them)}`,
  verdict: (rejected: boolean, me: number, them: number, p: number, kind: 'unsure' | 'same' | 'diff'): string => {
    const head = rejected ? 'You rejected.' : 'You accepted.';
    const got = rejected ? `You both got ${money(0)}.` : `You got ${money(me)}, the other player got ${money(them)}.`;
    const pp = percent(String(p));
    const cmp = kind === 'unsure' ? `An undecided offer for the average person too (probability of rejection ${pp}).`
      : kind === 'same' ? `You went the same way as the average person: probability of rejection ${pp}.`
        : `You behaved differently from the average person: their probability of rejection is ${pp}.`;
    return `${head} ${got} ${cmp}`;
  },
  satisfactionNote: (pctValue: number): string => `The caudate ("satisfaction of rejecting") is ${percent(String(pctValue))} active for this offer.`,
  replay: 'Play again',
  nextOffer: 'Next offer',
  logLeft: (i: number, who: string, offer: number): string => `${i}. ${who} · ${money(offer)}`,
  logRight: (rejected: boolean, p: number): string => `${rejected ? 'Rejected' : 'Accepted'} · model ${percent(String(p))}`,
  score: (n: number, rejectedCount: number, expected: string): string => `You rejected ${rejectedCount} of ${n} offers. The model expected about ${expected} rejections from an average person.`,
  scoreDone: 'The difference comes from individual variation and chance; one person\'s responses do not match the average curve exactly.',

  brainAria: 'Brain panel',
  brainH: 'Brain panel',
  netAria: 'Tappable diagram of the brain circuit: offer, insula, amygdala, caudate, dlPFC, vmPFC and rejection drive',
  legendInsula: 'Insula',
  legendAmy: 'Amygdala',
  legendCaud: 'Caudate',
  legendDlpfc: 'dlPFC',
  legendVm: 'vmPFC/OFC',
  legendReject: 'toward rejecting',
  legendAccept: 'toward accepting',
  legendOff: 'disabled',
  serotoninTag: 'low serotonin: weaker impulse brake',

  detailHint: 'Tap a region to see its role, how active it is in this condition and what it adds to the rejection drive. The darker the fill, the more active the region; the thicker the lines, the stronger the influence.',
  lesionRemove: 'Remove the damage',
  lesionApply: 'Apply amygdala damage',
  tmsRemove: 'Remove TMS',
  tmsApply: 'Apply TMS to the right dlPFC',
  detailOff: 'disabled',
  contribution: 'Contribution to the rejection drive',
  pullAccept: 'Pulls toward accepting',
  pullReject: 'Pulls toward rejecting',
  none: 'none',
  leftSilenced: 'Left dlPFC silenced: no effect',
  computerOpposite: 'Computer on the other side: the fairness goal does not engage',

  chartAria: 'Rejection probability curve',
  chartH: 'Probability of rejection by offer',
  chartLabel: 'How the probability of rejection falls as the offer grows; the current condition and the average-person curve',
  axisOffer: 'share offered',
  legendAvg: 'average person (human)',
  legendCur: 'selected condition',
  legendYourReject: 'your rejection',
  legendYourAccept: 'your acceptance',

  inputsAria: 'Inputs',
  inputsH: 'Inputs',
  offerName: 'Offer ($)',
  sliderHint: (fair: number): string => `The share the other player offers you. ${money(fair)} is an equal split, ${money(0)} means nothing`,
  offerValueText: (offer: number): string => `${offer} dollars`,
  session2: 'Second session',
  sessHint2: 'Later session: the tryptophan effect was seen in the book only in the first session, so it goes away.',
  sessHint1: 'First session: low serotonin raises the probability of rejection only here.',

  chips: {
    human: 'Proposer: human',
    computer: 'Proposer: computer',
    tmsR: 'TMS right dlPFC',
    tmsL: 'TMS left dlPFC',
    amy: 'Amygdala damage',
    trp: 'Low serotonin',
  },

  how: [
    (fair: number): string => `As the offer drops below ${money(fair)}, "unfairness" grows. Each region's activity depends on it: the insula and amygdala engage fully against a human and only partly against a computer; the caudate, following the insula, prepares the satisfaction of rejecting; the dlPFC applies the fairness goal only against a human; the vmPFC/OFC carries the monetary value of the offer and pulls toward accepting.`,
    (): string => 'The regions\' contributions are summed and converted into a probability of rejection by an S-shaped (logistic) curve. The output is the behavioral tendency of an average person; a single individual\'s response is subject to chance and personal differences, so your response does not have to match the model.',
    (): string => 'The "judges it unfair" gauge comes only from the arithmetic of the share. That it does not change under TMS is the finding in the book (they judged the bad offers as unfair as the controls did); in the other conditions this is an assumption.',
    (): string => 'The round offers are shuffled with a seed: the same seed gives the same order, and "Play again" picks a new order.',
  ],

  book: [
    { text: 'Unfair offers and the insula (Ultimatum Game), Sanfey et al., 2003', note: 'an unfair offer from a human activates the insula, one from a computer does so less; the higher the insula activity, the more rejection. Debated: whether the insula reflects disgust or a general violation of expectations.' },
    { text: 'Silencing the right dlPFC with TMS and fairness (Knoch, Fehr et al.), 2006', note: 'when the right dlPFC is suppressed, bad offers are accepted more often; the offers are still judged unfair. Only against a human; the left dlPFC has no effect. Some rTMS studies did not change the acceptance rate and only lengthened decision time.' },
    { text: 'Amygdala damage, generosity and rejection of unfair offers, 2013', note: 'the more active the amygdala after an unfair offer, the more rejection; people with damage are generous and do not increase their rejection rate. The damage finding rests on only three patients.' },
    { text: 'Tryptophan depletion and the iterated prisoner\'s dilemma (Wood et al.), 2006', note: 'when serotonin was reduced, cooperation fell in the first session. The more frequent rejection of unfair offers comes from other studies mentioned in the replication note.' },
    { text: 'Altruistic punishment and dopamine (de Quervain et al.), 2004', note: 'punishment activates the caudate, more strongly when a cost is paid. What is measured is blood flow, not dopamine directly.' },
  ],

  foot: (pot: number): string => `Qualitative model: curve shapes, weights and percentages are not measurements; they show the direction and order of the findings. Only directions were taken from the book (an increasing relationship between insula and amygdala activity and rejection, stronger against a human; more acceptance with TMS; no increase in rejection with amygdala damage; more rejection with serotonin in the first session; caudate activity in punishment). Because the book gives no rejection percentages or threshold values, these were not invented; the ${money(pot)} pot and the order of offers are fictional. The real brain is far more complex than this.`,

  tour: [
    { title: 'A fair offer', text: (): string => `The other player offers ${money(5)} out of ${money(10)}: an equal split. Accepting is both profitable and fair, so for most people there is no problem.`, look: 'The rejection probability bar and the insula are almost dark.' },
    { title: 'A very unfair offer', text: (): string => `Even if ${money(1)} is accepted, something is left in hand. Still, the insula and amygdala light up, and the caudate prepares the satisfaction of rejecting. According to the book, the higher the insula activity, the more rejection.`, look: 'The insula glows and the probability of rejection is high.' },
    { title: 'A computer on the other side', text: (): string => `The same ${money(1)}, but no human is being unfair: it is just a program. The insula engages less and rejection falls. The decision to reject depends not only on the money but also on knowing who made the offer.`, look: 'With the same offer, the insula and the probability of rejection drop.' },
    { title: 'Right dlPFC silenced (TMS)', text: (): string => `The offer is ${money(2)}, again from a human. When the right dlPFC is silenced, the person accepts the same offer more often but still judges it unfair: they cannot turn the fairness goal into action. This effect is absent for the left dlPFC or against a computer. The finding is mixed; some rTMS studies found no difference in the acceptance rate.`, look: '"Judges it unfair" stays the same, the probability of rejection drops, the dlPFC is struck through.' },
    { title: 'Low serotonin (tryptophan depletion)', text: (): string => `The same ${money(2)} offer, this time with serotonin reduced. Rejection rises and the acceptance threshold shifts up. Wood's effect was seen only in the first session: pressing the "Second session" button removes the effect.`, look: 'The probability of rejection rises, the threshold grows.' },
    { title: 'Conclusion', text: (): string => 'Rejection is less a "money or honor" calculation than a tug of war: the insula and amygdala push toward rejecting, the caudate toward satisfaction, the right dlPFC toward the fairness goal; the vmPFC/OFC pulls toward accepting with the value of the money. The conditions shift this balance. Now play without changing the conditions and compare your own responses with the average curve.', look: 'The rejection (red) and acceptance (empty) points on the curve.' },
  ],

  parts: {
    insula: 'Insula',
    amy: 'Amygdala',
    caud: 'Caudate',
    dlpfc: 'dlPFC',
    vm: 'vmPFC/OFC',
    ser: 'Low serotonin',
    base: 'Baseline',
  },
  noteTmsR: 'right dlPFC silenced',
  noteTmsL: 'left dlPFC silenced',
  noteLesion: 'amygdala damaged',
  noteTrpOn: 'low serotonin',
  noteTrpOff: 'the tryptophan effect was seen only in the first session',
  describeFair: (human: boolean, pot: number, offer: number, notes: string[], p: number): string =>
    `${human ? 'A human' : 'The computer'} offers ${money(offer)} out of ${money(pot)}${notes.length ? ` (${notes.join(', ')})` : ''}: an equal split, and an average person almost never rejects it (${percent(String(p))}).`,
  describeUnfair: (human: boolean, pot: number, offer: number, notes: string[], level: 0 | 1 | 2, p: number): string =>
    `${human ? 'A human' : 'The computer'} offers ${money(offer)} out of ${money(pot)}${notes.length ? ` (${notes.join(', ')})` : ''}: ${level === 2 ? 'the insula is clearly active' : level === 1 ? 'the insula is moderately active' : 'the insula is quiet'}, and the average person rejects it with a probability of ${percent(String(p))}.`,
};

export default EN;
