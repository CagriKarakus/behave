// English text for the neuroplasticity simulation. Same shape as text.tr.ts (checked by src/sims/i18n.test.ts).
import type { Strings } from './text.tr';

const dayWord = (n: number): string => (n === 1 ? 'day' : 'days');

const EN: Strings = {
  lede: 'How does experience change the physical structure of the brain over days and months?',
  tabsAria: 'Simulation sections',
  tabs: { syn: 'Synapse', prac: 'Practice and map', str: 'Stress and structure' },
  sayAria: 'Live description',
  inputs: 'Inputs',

  /* ---------- Formatter units ---------- */
  fmt: {
    hz: (f: string): string => `${f} Hz`,
    sec: (s: number): string => `${s} s`,
    min: (m: string): string => `${m} min`,
    now: 'right after',
    afterMin: (m: number): string => `${m} min later`,
    afterHr: (h: string): string => `${h} h later`,
    afterDay: (d: string): string => `${d} ${d === '1' ? 'day' : 'days'} later`,
    days: (d: number): string => `${d} ${dayWord(d)}`,
    daysWeeks: (d: number, w: number): string => `${d} days (${w} wk)`,
    daysMonths: (d: number, m: number): string => `${d} days (≈${m} mo)`,
    daysYears: (d: number, y: string): string => `${d} days (≈${y} yr)`,
    dayN: (d: number): string => `day ${d}`,
  },

  /* ---------- 1) Synapse ---------- */
  synNote: 'A single synapse. The presynaptic terminal releases glutamate, and glutamate binds to AMPA and NMDA receptors. At rest the NMDA channel is closed by an Mg²⁺ plug; enough depolarization pushes the plug out, and calcium (Ca²⁺) enters. The Ca²⁺ level decides the fate of the synapse.',
  synChipsAria: 'Preset stimulation examples',
  synPresets: ['Weak: 1 Hz', 'Moderate: 5 Hz', 'Intense: 100 Hz', 'Hebb: 1 Hz + firing'],
  synSvgAria: 'Synapse diagram: the presynaptic terminal and glutamate on top, the postsynaptic spine with AMPA and NMDA receptors below; the green level in the spine shows the calcium level',
  synLegend: { glu: 'Glutamate', ampa: 'AMPA receptor', nmda: 'NMDA channel', mg: 'Mg²⁺ plug', ca: 'Ca²⁺' },
  synLab: {
    pre1: 'Presynaptic', pre2: 'terminal', cleft1: 'Synaptic', cleft2: 'cleft', spine1: 'Spine', spine2: '(postsyn.)',
    ampa: 'AMPA', nmda: 'NMDA', mg: 'Mg²⁺ plug', dend: 'Dendrite', release: 'Glutamate release',
    thrD: 'LTD threshold', thrP: 'LTP threshold',
    dendFiring: (p: string): string => `Dendrite: postsynaptic neuron is firing (${p})`,
    dendPlain: 'Dendrite (postsynaptic neuron)',
  },
  synRun: 'Replay stimulation',
  synRunning: 'Stimulation in progress…',
  synChartAria: 'Synaptic strength chart',
  synChartH: 'Synaptic strength over time',
  synChartSvgAria: 'Course of synaptic strength during stimulation and in the minutes, hours and days afterward',
  synInputsAria: 'Stimulation inputs',
  synChart: {
    stim: 'stimulation',
    ticks: ['10 min', '1 h', '1 day', '1 wk'],
    axis: 'time after stimulation (logarithmic)',
    ltp: 'LTP', ltd: 'LTD', none: 'no change',
  },
  synSliders: {
    f: { name: 'Presynaptic stimulation frequency', hint: 'Pulses per second. Sparse stimulation does not affect the synapse; very frequent stimulation depolarizes the dendrite.' },
    d: { name: 'Stimulation duration', hint: 'Total pulses = frequency × duration. The effect grows with the number of pulses and then saturates.' },
    p: { name: 'Postsynaptic neuron fires at the same time', hint: 'Hebb: if the receiving neuron also fires, the membrane is depolarized further and the Mg²⁺ plug is removed.' },
    a: { name: 'Look after stimulation', hint: 'Move forward in time: the early-phase change fades within hours, while a change that becomes consolidated lasts.' },
  },
  zoneText: { ltp: 'above the LTP threshold', ltd: 'between the two thresholds (LTD zone)', yok: 'below the lower threshold' },
  synHead: (f: string, d: string, pulses: number, post: string, unblock: string, zone: string): string =>
    `${f} × ${d} (${pulses} pulses)${post ? `, postsynaptic firing ${post}` : ''}: Mg²⁺ plug ${unblock} removed, Ca²⁺ ${zone}.`,
  synNoChange: 'Synaptic strength does not change noticeably.',
  synTail: {
    stays: 'The change becomes consolidated.',
    fades: 'The change does not become consolidated and fades within hours.',
    part: 'Part of the change becomes consolidated.',
  },
  synUp: (base: string, to: string, now: string): string => `Synaptic strength ${base} → ${to}${now ? ` (now ${now})` : ''}; new AMPA receptors are being inserted.`,
  synDown: (base: string, to: string, now: string): string => `Synaptic strength ${base} → ${to}${now ? ` (now ${now})` : ''}; AMPA receptors are being removed.`,
  synMeters: { unblock: 'Mg²⁺ plug removed', ca: 'Ca²⁺ level', w: 'Synaptic strength', ltp: 'LTP', ltd: 'LTD', sub: 'subthreshold' },
  hebb: {
    base: 'Hebb: neurons that fire together wire together. If the neuron stimulating the synapse and the receiving neuron are active at the same time, the connection gets stronger.',
    ltpPost: 'Hebb’s rule is at work: the receiving neuron also fires while the synapse is stimulated. The connection between two neurons that fire together gets stronger.',
    ltpFreq: 'This time the strengthening comes not from postsynaptic firing but from very frequent glutamate, which on its own lets in enough sodium to depolarize the membrane.',
    ltd: 'Moderate Ca²⁺ entry: the synapse weakens (LTD). Erasing unneeded signals makes the important signal stand out; this is not general forgetting.',
    postOnly: 'There is postsynaptic firing, but calcium entry is still below the threshold.',
  },

  /* ---------- 2) Practice and map ---------- */
  pracNote: 'On the motor cortex map, the area that controls a skill expands with practice. The fast component (Hebbian-type strengthening) is built by practice and fades in less than a day once practice stops. The slow component (structural, new connections) accumulates and lasts for weeks.',
  pcChipsAria: 'Preset scenarios',
  pracPresets: [
    { n: 'Piano, 5 days',
      note: 'Pascual-Leone: non-musicians practiced piano finger exercises for 2 hours a day for a few days; the hand area expanded, and when practice stopped the increase vanished in less than a day.' },
    { n: 'Imagining only',
      note: 'Remapping was also seen in the group that only imagined the same exercise in their minds. In this model the contribution of mental practice is taken as half that of physical practice (finding in the book: there is an effect; replication note: generally smaller).' },
    { n: 'Piano, 4 weeks',
      note: 'In the four-week exercise, the expansion lasted for days after practice: long practice leaves a lasting (structural) share.' },
    { n: 'Juggling, 3 months',
      note: 'Draganski: in people who learned juggling for three months, a region involved in the visual processing of movement expanded; the increase partly regressed once they stopped. 60 min a day is an assumption of this model.' },
    { n: 'London taxi, ≈3 years',
      note: 'Maguire: the posterior hippocampus was larger in taxi drivers. The measured region is the hippocampus (volume), not a motor map; here the same two-component logic (fast + lasting) is applied.' },
    { n: 'Taxi candidate quits at 4 months',
      note: 'Woollett and Maguire: the hippocampus grew only in candidates who passed the exam. In a candidate who quits early, the lasting share fades over time (here too, the same logic is applied in place of hippocampal volume).' },
  ],
  pcSvgAria: 'Motor cortex map: the hand and finger area expands with practice and neighboring areas shrink',
  pcLegend: { base: 'Starting area', slow: 'Lasting (structural) expansion', fast: 'Fast, temporary expansion' },
  pcPlay: { pause: 'Pause', replay: 'Replay', play: 'Play' },
  pcStop: 'Stop practicing now',
  pcReset: 'Restart',
  pcChartAria: 'Map area chart',
  pcChartH: 'Map area over time',
  pcChartSvgAria: 'Course of the map area during practice and after it stops',
  pcInputsAria: 'Practice inputs',
  terr: ['Trunk', 'Shoulder, arm', 'Wrist', 'Hand', 'Face'],
  map: {
    title: 'Motor cortex (schematic section)',
    baseSize: 'starting size',
    area: (s: string): string => `${s}% area`,
    imagine: 'imagine',
    ongoing: (day: number, total: number): string => `Practice in progress: day ${day} / ${total}`,
    stopped: (n: number): string => `Practice stopped: ${n} ${dayWord(n)} ago`,
    none: 'No practice',
  },
  pcChart: { practice: 'practice', days: 'days', total: 'total', slow: 'lasting share' },
  pcSliders: {
    m: { name: 'Daily practice time', hint: 'All of the time may be physical or imagined practice. The effect saturates as time increases.' },
    x: { name: 'Share of imagined practice', hint: 'Mental rehearsal: picturing the exercise in the mind without moving the fingers. Its effect is taken as half that of physical practice.' },
    d: { name: 'Number of days of practice', hint: 'Practice is then stopped. Short practice fills the fast component, long practice fills the lasting share.' },
    t: { name: 'Time', hint: 'Pause playback and drag to look at any day.' },
  },
  pracSay: {
    none: 'No practice is being done.',
    ongoing: (mental: string): string => `Practice in progress${mental ? ` (${mental} imagined)` : ''}.`,
    stopped: (n: number): string => `Practice has been stopped for ${n} ${dayWord(n)}.`,
    line: (day: number, gain: string, slow: string, state: string): string => `Day ${day}: hand area ${gain}% (lasting share ${slow}%). ${state}`,
  },
  pracMeters: { area: 'Map area', slow: 'Lasting share', dose: 'Effective daily dose' },

  /* ---------- 3) Stress and structure ---------- */
  strNote: 'The same stress leaves opposite marks in two regions. Dendrites and spines of the hippocampus shorten; dendrites of the basolateral amygdala (BLA) lengthen. When the stress ends, the hippocampus recovers; the change in the amygdala is far more lasting.',
  stChipsAria: 'Stress type',
  stressKinds: [
    { n: 'Chronic stress', note: 'Chronic stress: hippocampal dendrites shrink and basolateral amygdala (BLA) dendrites expand (Vyas et al.).' },
    { n: 'Single dose of glucocorticoid', note: 'Mitra and Sapolsky: even a single dose of corticosterone was enough to increase anxiety and BLA dendrite growth; the result was measured 12 days later.' },
    { n: 'Voluntary running', note: 'Context: according to the book, glucocorticoid released with fear shrinks hippocampal dendrites, whereas a similar amount released with voluntary running enlarges them. Whether the amygdala is engaged seems to determine the difference.' },
  ],
  stSvgAria: 'Drawing of the dendrites of two neurons: a hippocampal neuron on the left, an amygdala neuron on the right',
  stLegend: { hip: 'Hippocampal dendrite', amy: 'Amygdala (BLA) dendrite', spine: 'Dendritic spine' },
  stNeurons: { hip: 'Hippocampal neuron', amy: 'Amygdala (BLA) neuron' },
  stTxtH: (d: string, s: string): string => `dendrite ${d} · spine ${s}`,
  stTxtA: (d: string): string => `dendrite ${d}`,
  stChartAria: 'Dendrite chart',
  stChartH: 'Dendrite length over time',
  stChartSvgAria: 'Course of hippocampal and amygdala dendrite length during and after stress',
  stInputsAria: 'Stress inputs',
  stChart: { run: 'running', stress: 'stress', days: 'days', amy: 'Amygdala', hip: 'Hippocampus (dashed: spines)' },
  stSliders: {
    d: { name: 'Duration of chronic stress', hint: 'The longer the stress lasts, the more hippocampal dendrites shorten and the more amygdala dendrites lengthen.' },
    r: { name: 'Time elapsed after the stress ends', hint: 'When the stress is lifted the hippocampus recovers; the change in the amygdala reverses far more slowly.' },
    t: { name: 'Time', hint: 'Pause playback and drag to look at any day.' },
  },
  strSay: {
    runOn: 'Voluntary running in progress',
    runOff: (n: number): string => `Running ended ${n} ${dayWord(n)} ago`,
    stOn: 'Stress in progress',
    stOff: (n: number): string => `Stress ended ${n} ${dayWord(n)} ago`,
    line: (day: number, phase: string, hipPct: string, hipShort: boolean, amyPct: string, amyLong: boolean): string =>
      `Day ${day}: ${phase}. Hippocampal dendrites are ${hipShort ? `${hipPct} shorter` : `${hipPct} longer`}, amygdala dendrites are ${amyPct} ${amyLong ? 'longer' : 'shorter'}.`,
  },
  strMeters: { hip: 'Hippocampal dendrite', spine: 'Hippocampal spine', amy: 'Amygdala dendrite' },

  /* ---------- Guided tour ---------- */
  tour: [
    {
      title: 'Insufficient stimulation: the synapse does not change',
      text: 'A single synapse and one pulse per second. Glutamate binds to AMPA receptors, but the membrane is not depolarized enough, the Mg²⁺ plug stays in place and almost no calcium enters through the NMDA channel.',
      look: 'the green Ca²⁺ level inside the spine stays below the lower threshold; the chart is flat.',
    },
    {
      title: 'Moderate calcium: LTD',
      text: 'When the frequency rises to a moderate level, Ca²⁺ stays between the two thresholds. This moderate level weakens the synapse: AMPA receptors are removed (long-term depression, LTD). In this way unneeded signals are erased.',
      look: 'the number of AMPA receptors (blue bars) decreases and the chart goes down.',
    },
    {
      title: 'Intense stimulation: LTP',
      text: 'With intense stimulation of the Lømo and Bliss type (100 pulses per second), glutamate arrives so often that the membrane is depolarized, the Mg²⁺ plug is lifted and Ca²⁺ crosses the high threshold. New AMPA receptors are inserted and the synapse stays strong for hours.',
      look: 'the Mg²⁺ plug leaves the channel; the curve on the chart rises and stays high for a long time.',
    },
    {
      title: 'Hebb: neurons that fire together wire together',
      text: 'The frequency is again one pulse per second, but the receiving neuron fires at the same time. The depolarization removes the plug; a stimulus that was ineffective on its own now strengthens the synapse.',
      look: 'the result of the same 1 Hz stimulation: flat in the first step, LTP now.',
    },
    {
      title: 'Practice enlarges the map, stopping reverses it',
      text: 'Piano practice for 2 hours a day over 5 days enlarges the hand area. When practice stops, most of the growth disappears in less than a day: brief practice leaves only a temporary, Hebbian-type expansion.',
      look: 'the amber (fast) band shrinking quickly when practice stops.',
    },
    {
      title: 'Stress changes two regions in opposite directions',
      text: 'Four weeks of chronic stress: hippocampal dendrites and spines shorten, and amygdala dendrites lengthen. When the stress ends, the hippocampus recovers, but the change in the amygdala lasts for months. Plasticity is neither good nor bad: it can make both learning and anxiety lasting.',
      look: 'at the end of playback the blue curve returns to 100%, while the red curve is still high.',
    },
  ],

  /* ---------- Notes below the simulation ---------- */
  notes: {
    syn: {
      how: [
        'Each presynaptic pulse lets sodium in through AMPA receptors; as pulses arrive more often they sum and the membrane is depolarized. Depolarization pushes the Mg²⁺ plug out of the NMDA channel. If the postsynaptic neuron fires at the same time, depolarization increases further (Hebbian pairing).',
        'Ca²⁺ entry = pulses per second × the fraction of the plug removed. The Ca²⁺ level is read against two thresholds: below the lower threshold there is no change, between the two thresholds there is LTD (AMPA receptors are removed), and above the upper threshold there is LTP (new AMPA receptors are inserted). The size of the change grows with the total number of pulses and then saturates.',
        'Assumption (not in the book): with insufficient stimulation the change stays in the early phase and fades within hours; if strong enough, it becomes consolidated. The thresholds, rates and time courses are qualitative settings.',
      ],
      book: [
        { text: 'Lømo (1966), Bliss and Lømo (1973): after intense stimulation the synapse stays strong for a long time (LTP)', note: 'The debate is not over whether the phenomenon exists but over its share in natural learning.' },
      ],
      foot: "Qualitative model: the numbers are not measurements; they show the direction of the relationships. From the book: Hebb’s rule, the NMDA threshold, Ca²⁺-mediated LTP, and LTD sharpening the signal. Not from the book: the detail of the Mg²⁺ plug, and the frequency values and durations themselves. The Bliss and Lømo experiment was a setup in which high-frequency stimulation was delivered to the perforant path of an anesthetized rabbit and monitored for hours (information from outside the book).",
    },
    prac: {
      how: [
        'Effective daily practice = physical minutes + 0.5 × imagined minutes. The fast component rises with this dose, saturating (half-saturation: ≈ 60 min a day), and fades with a time constant of a few hours once practice stops. The slow component accumulates for as long as the fast component persists and fades slowly with a time constant of ≈ 160 days. Map area = 1 + fast + slow; neighboring areas shrink so that the total surface stays constant.',
        'All coefficients are qualitative settings; they were chosen to capture the direction and order of the findings in the book.',
      ],
      book: [
        { text: 'Pascual-Leone (1995): piano exercise, imagined practice and fast loss after stopping', note: 'An effect of mental practice has been reported, but it is generally smaller than that of physical practice.' },
        { text: 'Draganski (2004): three months of juggling and gray matter', note: 'However, the cellular meaning of MRI volume measurements and small sample sizes have been criticized.' },
        { text: 'Maguire et al.: the hippocampus in London taxi drivers', note: 'Samples are relatively small, and large independent replications are limited.' },
      ],
      foot: 'Qualitative model. From the book: piano exercise for 2 hours a day, the few-day and four-week conditions, imagining, loss in less than a day after stopping; three months of juggling and partial regression; taxi drivers. The 60-minute daily juggling time and all coefficients are assumptions from outside the book.',
    },
    str: {
      how: [
        'While stress continues, hippocampal dendrite length approaches a lower bound (≈ 68% of baseline) with a time constant of ≈ 2 weeks; spine loss is somewhat greater than dendrite loss. When the stress ends, it recovers with a time constant of ≈ 3 weeks.',
        'In the amygdala, glucocorticoid triggers a hidden program that is built quickly and fades slowly (it can be thought of as something like a BDNF increase). Dendrite growth follows the square root of this program; this is why even a single dose produces visible growth. Growth is quick, and retraction is very slow.',
        'With voluntary running, hippocampal dendrites grow and the amygdala is not engaged. The coefficients are qualitative settings; BLA spines do not change in the model.',
      ],
      book: [
        { text: 'Vyas et al. (2002), Mitra and Sapolsky (2008): stress shrinks hippocampal dendrites and enlarges BLA dendrites', note: 'Replicated in many laboratories. Context matters: glucocorticoid that comes with running has a different effect.' },
      ],
      foot: 'Qualitative model. From the book: the direction (the hippocampus shrinks, the BLA grows), even a single dose being enough (measurement on day 12), the link between the amygdala effect and lasting anxiety, and the warning about context. Not from the book: the recovery time constants and the percentage values. The drawings are schematic, not real morphology.',
    },
  },
};

export default EN;
