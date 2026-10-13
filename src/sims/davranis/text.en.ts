import type { Strings } from './text.tr';

// English twin of text.tr.ts. Same shape; read at run time through L() (see text.ts).
const EN: Strings = {
  /* ---- General frame (view.ts) ---- */
  lede: 'Why is the same movement sometimes heroism and sometimes murder, and is aggression a single thing?',
  tabsLabel: 'Simulation sections',
  barLabel: 'Live summary',
  tabs: { harita: 'Aggression map', baglam: 'Context gate', yer: 'Displacement' },

  /* ---- Chapter links (bars.ts) ---- */
  chapterNames: {
    ch01: 'The Behavior', ch02: 'One Second Before', ch03: 'Seconds to Minutes Before', ch04: 'Hours to Days Before',
    ch12: 'Hierarchy, Obedience, and Resistance', ch17: 'War and Peace',
  } as Record<string, string>,
  chapterLink: (n: number, name: string): string => `Chapter ${n}, ${name}`,
  chapterShort: (n: number): string => `Ch${n}`,

  /* ---- Model: axes, types, systems, actions ---- */
  axes: [
    { lo: 'Reactive', hi: 'Proactive', name: 'Trigger', loL: 'reactive', hiL: 'proactive' },
    { lo: 'Hot-blooded', hi: 'Cold-blooded', name: 'Emotion', loL: 'hot-blooded', hiL: 'cold-blooded' },
    { lo: 'Impulsive', hi: 'Planned', name: 'Planning', loL: 'impulsive', hiL: 'planned' },
  ],
  poleMid: 'intermediate',
  blurPair: (hot: string[], cold: string[]): string => `${hot.join(' and ')} but ${cold.join(' and ')}`,
  scenarios: [
    { name: 'Defense', desc: 'An immediate response under threat.', where: ['the amygdala and the threat circuit', 'the fast but low-accuracy amygdala route'] },
    { name: 'Hunting', desc: 'Calm and goal-directed; no anger or fear.', where: ['fear and aggression are not always linked'] },
    { name: 'Status fight', desc: 'A conflict over rank that mixes anger with intent.', where: ['testosterone amplifies status competition', 'the status hierarchy'] },
    { name: 'Displacement', desc: 'A stressed animal attacks an available target weaker than itself.', where: ['stress and displaced aggression', 'stress flowing down the hierarchy'] },
    { name: 'Planned cold-blooded', desc: 'Premeditated, emotionless, instrumental violence.', where: ['the prefrontal cortex and dopamine', 'distance and the barrier to killing'] },
    { name: 'Sport', desc: 'A rule-bound, deliberate encounter that is also emotionally charged.', where: ['the challenge hypothesis and testosterone'] },
    { name: 'Fiction', desc: 'Violence in a film or game; there is no real victim.', where: ['the context gate (virtual room experiment)'] },
  ],
  systems: [
    'Amygdala, threat circuit',
    'Frontal cortex, inhibition and planning',
    'Dopamine, reward anticipation',
    'Testosterone, status context',
    'Glucocorticoid, stress',
  ],
  actions: [
    { name: 'Cutting with a knife', motor: 'Hand holding a knife, cutting movement', good: 'Surgery: healing', mid: 'Unclear: emergency aid or assault?', bad: 'Assault: wounding',
      presets: ['Surgeon', 'Attacker', 'Bystander, emergency'] },
    { name: 'Pulling the trigger', motor: 'Hand holding a gun, finger bending', good: 'Duty or legitimate self-defense', mid: 'Contested: proportionality and authority unclear', bad: 'Murder',
      presets: ['Soldier, against an enemy', 'Killer', 'Civilian, defending self'] },
    { name: 'Hugging', motor: 'Two arms wrapping around another person', good: 'Comfort', mid: 'Unclear: wish or consent not clear', bad: 'Unwanted contact',
      presets: ['Grieving friend', 'Stranger, unwilling'] },
    { name: 'Applying a bandage', motor: 'Wrapping movement, hand reaching to the body', good: 'Help', mid: 'Unclear: is help needed?', bad: 'Unwarranted intervention',
      presets: ['Injured person', 'Hostile alien'] },
  ],
  roomTargets: ['Injured person', 'Hostile alien'],
  verdictWord: { good: 'appropriate', mid: 'contested', bad: 'inappropriate' },

  /* ---- Tab 1: Aggression map ---- */
  harita: {
    axCap: [
      'Reactive: in response to a stimulus. Proactive: spontaneous, toward a goal.',
      'Hot-blooded: accompanied by anger and excitement. Cold-blooded: emotionless, instrumental.',
      'Impulsive: in the moment, without thinking. Planned: premeditated.',
    ],
    mapLabel: 'Position of the aggression types on three axes. Tapping a lane moves the selected type; the sliders do the same.',
    legend: ['Filled circle: selected type (tap a lane or use a slider)', 'Open circle: other types, number = chip order', 'Dashed line: profile of the selected type'],
    sysHeading: 'Related systems (the model’s mapping)',
    placeHeading: 'Place the selected type',
    resetOne: 'Reset this type to its preset position',
    resetAll: 'Reset all to preset positions',
    chipsLabel: 'Aggression type',
    moved: ' (Position was changed by hand.)',
    profile: (prof: string, coh: string, near: string): string => `<b>Profile:</b> ${prof}. <b>Axis agreement:</b> ${coh}. <b>Nearest type:</b> ${near}.`,
    diverge: (b: string): string => `The axes diverge: ${b}. This type does not fit in a single box.`,
    aligned: 'All three axes point the same way; the classifications confirm each other for this type.',
    sayDiverge: (name: string, prof: string, b: string, near: string): string => `${name}: ${prof}. The axes diverge (${b}). Nearest type: ${near}.`,
    sayAligned: (name: string, prof: string, near: string): string => `${name}: ${prof}. The axes point the same way. Nearest type: ${near}.`,
    meters: ['Axis agreement', 'Threat circuit', 'Planning'],
    tour: [
      { title: 'Defense: three axes at the same end', text: 'An aggression type is not a single box but a position on three separate axes. Defense under threat is reactive, hot-blooded and impulsive.',
        look: 'The selected circle sits at the left end of all three lanes, and axis agreement is high.' },
      { title: 'Planned violence: the opposite end', text: 'Premeditated cold-blooded violence is proactive, emotionless and planned. The prominent systems change too (the model’s mapping).',
        look: 'The threat-circuit bar drops while the planning and dopamine bars rise.' },
      { title: 'Intermediate types do not fit a box', text: 'A status fight is deliberate but angry, hot yet calculating. The three axes no longer point the same way; the boundaries of the classifications are blurry.',
        look: 'Axis agreement drops and the card shows a “diverge” warning.' },
      { title: 'Displacement: a stress load', text: 'The target is not the person who threatens but someone weaker who is within reach. The profile is close to defense, but the stress system is highest. The mechanism is in the third tab.',
        look: 'The glucocorticoid bar and the “nearest type” line.' },
      { title: 'You place it', text: 'In fiction, violence has no victim, yet the same word is used. Drag the circle along the lanes or move it with a slider; the book says each distinction points to different biology.',
        look: 'Which way the system bars shift when you pull one axis to an extreme.' },
    ],
  },

  /* ---- Tab 2: Context gate ---- */
  baglam: {
    ctxSliders: [
      { name: 'Target’s need', hint: 'High: the target is injured, suffering or waiting for support.' },
      { name: 'Target’s threat level', hint: 'High: the target is preparing an attack or is armed.' },
      { name: 'Consent', hint: 'High: the target clearly agrees to or wants this action.' },
      { name: 'Role and authority', hint: 'High: there is a role that makes the action legitimate (physician, soldier on duty).' },
    ],
    gateLabel: 'The same motor pattern passes through the context gate and takes on a meaning according to the context',
    legendNote: 'The more open the gate, the more appropriate the context makes the action',
    brainHeading: 'What changes in the brain?',
    brainNote: 'The motor pattern varies with the action, while the decision circuit rises with how appropriate the context is. According to the book, the same circuit works for two different actions when each is appropriate; the level in the inappropriate case is the model’s assumption.',
    roomHeading: 'Virtual room: bandage the injured or shoot the alien',
    roomNote: 'Pressing a cell loads the action and target above.',
    sectionHeading: 'Context',
    actsLabel: 'Motor action',
    presetsLabel: 'Preset contexts',
    motorCap: 'MOTOR PATTERN',
    meaningCap: 'MEANING',
    gateCap: 'Gate opening = contextual appropriateness',
    barMotor: 'Motor pattern (independent of context)',
    barCircuit: 'Contextual decision circuit (PFC, relative)',
    roomTarget: 'Target',
    cellCircuit: (v: string): string => `circuit ${v}`,
    verdictLine: (word: string, fit: string): string => `${word} (${fit})`,
    sameAct: (name: string): string => `${name}: same movement, context changes`,
    cellAria: (target: string, act: string, word: string, circuit: string): string => `${target}, ${act}: ${word}, decision circuit ${circuit}`,
    say: (act: string, meaning: string, word: string, fit: string, circuit: string): string => `${act}: ${meaning} (${word}, appropriateness ${fit}). The motor pattern is the same; decision circuit ${circuit}.`,
    meters: ['Contextual appropriateness', 'Decision circuit (PFC)', 'Motor pattern'],
    tour: [
      { title: 'A knife in the operating room', text: 'Cutting with a knife is surgery when a physician, a patient and consent are all present. The gate is fully open and the action counts as healing.',
        look: 'The open gate and the meaning box on the right.' },
      { title: 'Same movement, different context', text: 'The motor pattern has not changed: same hand, same cut. But without need, consent and authority the gate closes and the action is an assault.',
        look: 'The gate closing while the motor pattern box on the left stays the same.' },
      { title: 'Trigger: soldier or killer', text: 'Pulling the trigger can count as “duty” when a soldier on duty acts against a threat; without threat and authority it is murder. In the book, context determines this distinction.',
        look: 'The gate closing when you set the threat and role sliders to zero.' },
      { title: 'The virtual room experiment', text: 'King et al.: participants could bandage the injured person or shoot the alien. When both actions were appropriate, the same circuit of the prefrontal cortex became active.',
        look: 'The similar circuit level of the two “appropriate” cells in the table, and the low level in the mismatched ones.' },
      { title: 'Even a hug depends on context', text: 'A comforting hug is unwanted contact without consent. The book’s emphasis: the biology of a behavior cannot be separated from its context.',
        look: 'The consent slider and the change in the meaning box.' },
    ],
  },

  /* ---- Tab 3: Displaced aggression ---- */
  yer: {
    pause: 'Pause',
    start: 'Start',
    step: 'One step',
    newTroop: 'New troop',
    troopLabel: 'A hierarchy of eight baboons: circles in rank order, stress hormone bars beneath them, attack arrows above',
    legendTroop: ['status defeat (from above to below)', 'displaced attack', 'stress hormone (line: time average)'],
    afterHeading: 'Stress hormone after the attack',
    chartLabel: 'Mean post-event stress hormone for those who displace and those who hold back, over time',
    legendChart: ['attackers after a defeat', 'those who do not attack'],
    ratHeading: 'The shocked rat (200 virtual rats)',
    ratNote: 'Shock intensity is proportional to the defeat stress slider. The rat’s probability of biting equals the displacement tendency.',
    inputsHeading: 'Inputs',
    stressAxis: 'Stress hormone',
    topRank: 'Top rank',
    bottomRank: 'Bottom rank',
    timeAxis: 'time →',
    noData: 'No data yet: press Start or One step',
    ratBars: ['A smaller rat is nearby', 'No one is nearby'],
    sliders: {
      freq: { name: 'Defeat frequency', hint: 'How many conflicts occur at each step.' },
      hit: { name: 'Defeat stress', hint: 'How much a defeat raises the stress hormone; the shock on the rat card is proportional to it.' },
      displace: { name: 'Displacement tendency', hint: 'The probability that the defeated individual attacks someone weaker than itself.' },
      relief: { name: 'Relief effect of the attack', hint: 'How much of the attacker’s stress hormone drops. At zero, attacking does not change stress (the model’s assumption).' },
    },
    perStep: (v: number): string => `${v} / step`,
    sayEmpty: 'No data yet. Press Start or One step: the defeated individual can attack the one below it or hold back.',
    sayNoAttack: (step: number, low: string, top: string): string => `Step ${step}: no one attacks the one below; stress hormone is ${low} at the bottom rank and ${top} at the top rank.`,
    sayAllAttack: (step: number, low: string, top: string): string => `Step ${step}: everyone attacks; stress hormone is ${low} at the bottom rank and ${top} at the top rank.`,
    sayLower: (step: number, d: string, h: string, low: string): string => `Step ${step}: after a defeat, the stress hormone of those who attack is ${d} and of those who hold back ${h} (lower in the attacker). ${low} at the bottom rank.`,
    sayHigher: (step: number, d: string, h: string, low: string): string => `Step ${step}: after a defeat, the stress hormone of those who attack is ${d} and of those who hold back ${h} (higher in the attacker). ${low} at the bottom rank.`,
    sayEqual: (step: number, d: string, h: string, low: string): string => `Step ${step}: after a defeat, the stress hormone of those who attack is ${d} and of those who hold back ${h} (no difference). ${low} at the bottom rank.`,
    meters: ['Attacker’s stress', 'Non-attacker’s stress', 'Bottom rank'],
    tour: [
      { title: 'No displacement', text: 'Eight baboons in rank order. Defeat stress falls at random; no defeated individual attacks the one below. Lower ranks are defeated more often and have higher stress hormones.',
        look: 'The bars rising toward the right.' },
      { title: 'The defeated attacks the one below', text: 'The defeated individual chases the one below it (the beta male, and the omega male at the very bottom). The stress hormone of an individual that can attack rises less.',
        look: 'The red line (attackers) staying below the blue dashed line.' },
      { title: 'Where does the difference come from?', text: 'If the relief effect is set to zero, the two lines merge. So the difference comes from the assumption that attacking lowers stress; in the book, this is a finding from animal studies.',
        look: 'The two lines overlapping.' },
      { title: 'The shocked rat', text: 'If a smaller rat is next to a rat that is shocked in the foot, it can bite and its stress response rises less. If no one is nearby, the stress stays as it is.',
        look: 'The difference between the two bars on the rat card below.' },
      { title: 'Stress does not vanish, it flows down', text: 'Every attack passes a new defeat to the one below. When the displacement tendency is full, the stress of those in the middle falls and the stress of the one at the bottom rises.',
        look: 'The bar on the far right and the time-average line.' },
    ],
  },

  /* ---- Footnotes (notes.ts; "How does the model work?", "In the book", footnote) ---- */
  notes: {
    nitel: 'Qualitative model: the numbers are not measurements; they show the direction of relationships.',
    n1: {
      how: [
        'Each type has a position on three axes (0-1). The load on a system is a weighted sum of the axes: the threat circuit rises at the reactive, hot-blooded and impulsive ends; the frontal cortex at the planned and cold-blooded ends; dopamine at the proactive and planned ends. The testosterone and stress hormone loads are status and stress values assigned by hand to each type.',
        'Axis agreement is how much the three axes cluster together at the “hot end” (reactive, hot-blooded, impulsive): 1 is full agreement, 0 the most scattered. When agreement is low, the classifications do not confirm each other. The weights and positions are the model’s assumptions.',
      ],
      items: [
        { text: 'Displaced aggression (third tab)', note: 'The chapter’s distinctions among kinds of aggression (defensive vs. offensive, impulsive vs. planned, reactive vs. spontaneous, hot- vs. cold-blooded) are narrative, not a separate experiment, and each points to different biology.' },
        { text: 'Context gate (second tab)' },
      ],
      foot: 'From the book: aggression is divided into types and each distinction points to different biology; displaced aggression is a separate type. The types’ positions on the axes, the system weights and the axis agreement are the model’s assumptions.',
    },
    n2: {
      how: [
        'Each action has four context inputs: the target’s need, threat level, consent, and role or authority. Appropriateness is an S-shaped curve of the sum of these inputs weighted specifically for the action. For example, need and consent stand out for cutting, threat and authority for the trigger; the target’s need lowers appropriateness for the trigger.',
        'The motor pattern is fixed to the action and is not affected by context. The decision circuit (prefrontal cortex) rises with appropriateness: the finding in the book is that the same circuit works when two different actions are both appropriate. The low level in the inappropriate case is the model’s assumption. The weights come from directional intuition, not from the book; there is no claim of an exact threshold for moral judgment.',
      ],
      items: [
        { text: 'King et al.: bandage or fire in a virtual room (2006)', note: 'A single fMRI study with a small sample; no direct replication is known. The similar circuit level of the two “appropriate” cells in the table comes from this finding; the values of the other cells come from the model.' },
      ],
      extra: '<p>For the trigger and distance, see <a href="#/bolum/ch17">Chapter 17, War and Peace</a>.</p>',
      foot: 'From the book: two different motor actions engage the same circuit of the prefrontal cortex when both fit the context; behavior is understood by its context, not as good or bad. The knife, hug and other examples and all the weights are the model’s assumptions.',
    },
    n3: {
      how: [
        'Eight individuals are in rank order. At each step, of two random individuals the lower one is defeated and its stress hormone rises. With the probability given by the displacement tendency, the defeated individual attacks one below it (more prone to pick the lowest); when it attacks, its own stress hormone falls by the relief effect, the target takes a smaller defeat, and the chain can continue. The stress hormone decays toward baseline at each step. The individual at the bottom cannot attack anyone.',
        'The two lines are the cumulative mean of the stress hormone recorded after each defeat event, for those who attack and those who hold back. When the relief effect is zero the difference disappears: the difference comes from the assumption. The rat card applies the same rule to a single shock event.',
      ],
      items: [
        { text: 'Shock-induced displaced aggression (rat) and stress buffering', note: 'Attacking a nonthreatening target is a well-observed phenomenon in rodents and primates; the part where attacking lowers the stress hormone rests on fewer studies, mostly in animals. The first chapter covers the topic in a few sentences; the details are in Chapter 4.' },
      ],
      extra: '<p>For the effect of stress hormones on behavior, see <a href="#/bolum/ch04?sim=hormon-baglam">Hormones and context, Stress curve tab (Chapter 4)</a>: there, the “displacement” option shows the same idea in another way.</p>',
      foot: 'From the book: a shocked rat can attack a smaller rat, a defeated baboon chases the one below, and in an individual that can attack, the stress hormone and ulcer risk rise less. The number of ranks, the probabilities, the relief ratio and the decay rate are the model’s assumptions; ulcer risk is not computed in the model.',
    },
  },
};

export default EN;
