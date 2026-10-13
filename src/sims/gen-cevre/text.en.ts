// English twin of text.tr.ts (same shape). Loaded dynamically in English mode only.
import type { Strings } from './text.tr';

const EN: Strings = {
  /* ---- Shared ---- */
  common: {
    inputs: 'Inputs',
  },

  /* ---- Main view (view.ts) ---- */
  view: {
    tabs: {
      table: 'Gene × environment table',
      mao: 'MAO-A and childhood',
      gwas: 'Many genes, small effects',
    },
    tabsLabel: 'Simulation sections',
    barLabel: 'Live description',
    lede: `What percent of a trait is “genetic”? The question is badly posed: genes and environment do not add up, they multiply; the answer depends on which environments you look at.`,
    tour: [
      {
        title: 'Looking at a single environment',
        text: 'Three gene variants (A, B, C) measured in one environment. Someone looking at this table credits most of the difference to genes: heritability (h²) comes out high.',
        look: 'The size of the genetic share in the bar below.',
      },
      {
        title: 'Same genes, more environments',
        text: 'The same three variants, but six different environments. The lines are parallel, so the effect of the genes has not changed at all. Even so, once differences between environments enter the total variation, h² drops.',
        look: 'The downward slope of the “Same genes, more environments” curve.',
      },
      {
        title: 'Same mouse, three laboratories',
        text: `Crabbe’s experiment: the same mouse strains, with conditions carefully equalized. Even so, for one strain the effect of cocaine stayed around 700 cm in Oregon and Albany but exceeded 5,000 cm in Alberta. B and C were similar in all three places. When lines cross, “which is better” cannot be answered without the environment.`,
        look: `The jump of line A in Alberta and the within-environment h² row.`,
      },
      {
        title: 'One gene, an effect that depends on childhood',
        text: `The low-activity MAO-A variant predicted nothing on its own; among those with a history of severe childhood abuse, it raised the likelihood of antisocial behavior about threefold. But this finding was replicated in a mixed way in large studies: set the ratio to 1 and the lines become parallel.`,
        look: 'The two lines overlapping with no maltreatment and separating at the severe end.',
      },
      {
        title: 'One gene: three clusters',
        text: 'If height depended on a single gene, people would fall into a few distinct clusters. One variant would explain most of the difference in height, and sharp peaks would appear.',
        look: 'The three sharp peaks in the histogram.',
      },
      {
        title: 'Hundreds of small effects, plus environment',
        text: `The real height distribution is a smooth bell curve: many variants of small effect, plus environment. A scan of 183,727 people found hundreds of variants; the strongest explained only 0.4% of the difference. Genes offer a predisposition; what they mean depends on the environment.`,
        look: `The gap between “Strongest single variant” and “Sum of those found.”`,
      },
    ],
  },

  /* ---- Model core (model.ts) ---- */
  model: {
    envName: (i: number): string => `Environment ${i}`,
    axis: 'Environment quality (→ richer)',
    yLabel: 'Outcome (symbolic scale)',
    crabbe: {
      envNames: ['Oregon', 'Alberta', 'Albany'],
      axis: 'Laboratory',
      yLabel: 'Cocaine-induced increase in movement (5,000 cm = 100)',
    },
    ses: {
      envNames: ['Low SES', 'High SES'],
      axis: 'Family socioeconomic status (→)',
      yLabel: 'Cognitive score (symbolic)',
    },
    presets: {
      none: {
        name: 'No interaction',
        note: 'The three variants are affected by the environment to the same degree: the lines are parallel. The gene difference stays the same in every environment.',
      },
      cross: {
        name: 'Interaction that changes the ranking',
        note: `The lines cross: in the poor environment C is the “best” variant, in the rich environment A is. The question “which is better?” has no answer without the environment.`,
      },
      crabbe: {
        name: 'Three laboratories (Crabbe)',
        note: `The book’s three-laboratory experiment: variant A raises cocaine-induced movement a little in Oregon and Albany and a lot in Alberta (667, 701 and more than 5,000 cm). B and C are similar in all three places. The B and C values are symbolic.`,
      },
      ses: {
        name: 'Poor ↔ rich (Turkheimer)',
        note: (rep: string): string => `The book’s result: heritability about 10% in the poor environment and about 70% in the rich one. Replication ${rep}: seen in U.S. samples, not seen or reversed in Western Europe and Australia.`,
      },
    },
    table: {
      one: (h2: string): string => `Looked at in a single environment, h² is ${h2}: the difference can be attributed almost entirely to genes. But this number holds only for this environment.`,
      cross: (lo: string, hi: string): string => `The lines cross: which variant is “good” depends on the environment. Within-environment h² ranges from ${lo} to ${hi}; there is no single “percent genetic.”`,
      spread: (lo: string, hi: string): string => `Within-environment h² varies from ${lo} to ${hi}: the gene difference is the same, but the environment determines how much of it shows.`,
      many: (n: number, h2: string, first: string): string => `${n} environments together: h² is ${h2} (it was ${first} in the first environment alone). The gene effect stayed the same; once the environmental differences entered the total variation, the genetic share shrank.`,
    },
    mao: {
      noInter: 'No-interaction assumption: the risk is the same for both variants, and maltreatment raises it equally in both. Most large studies find something closer to this.',
      mild: (lo: string, hi: string): string => `No or mild maltreatment: there is no difference between the two variants (${lo} and ${hi} per hundred people). The variant says nothing on its own.`,
      high: (lo: string, hi: string, ratio: string, popRatio: string): string => `High level of maltreatment: ${lo} per hundred people with the low-activity variant, ${hi} with the high-activity one (≈${ratio}-fold). Counting everyone together, the difference is only ≈${popRatio}-fold: the effect depends on the environment.`,
    },
    gwas: {
      envOnly: 'The environment determines all of the difference: genes contribute nothing to height differences, and the bell curve comes from the environment alone.',
      one: `A single gene: height splits into just a few clusters (sharp peaks). The real height distribution is not like this, because there is no single “height gene.”`,
      few: (m: number, top: string): string => `With ${m} variants the distribution is still rough. Each variant’s share is large (the strongest accounts for ${top} of the variance).`,
      many: (m: string, top: string): string => `With ${m} variants a smooth bell curve emerges. The strongest single variant explains only ${top} of the difference: as the number of genes grows, looking for a “height gene” becomes meaningless.`,
    },
  },

  /* ---- Tab 1: table (table-panel.ts) ---- */
  table: {
    variantsLabel: 'Variants',
    variant: (v: string): string => `Variant ${v}`,
    intro: 'Three gene variants (A, B, C) in a few environments. The number in the table is the mean outcome for that variant and environment; within each cell, individuals are scattered around this mean. A virtual population is derived from this table and heritability (h²) is computed from it.',
    presetsLabel: 'Preset examples',
    rnLabel: 'Reaction norm plot: mean outcome of each variant along the environment axis',
    cardLabel: 'Gene–environment table',
    cardTitle: 'Mean outcome table (you can change the numbers)',
    cardNote: 'Bottom row: h² if you look only at individuals in that environment. A number measured in a single environment holds only for that environment.',
    varCardLabel: 'Variance shares and number-of-environments curve',
    varTitle: 'Source of variation in the virtual population',
    vbarLabel: 'Genetic, environmental, interaction and chance shares of the total variation',
    curveTitle: 'Same genes, more environments',
    curveNote: 'How does h² change as environments are added from left to right?',
    curveLabel: 'Change in heritability with the number of environments included',
    curveAxis: 'Number of environments included',
    inputsLabel: 'Table inputs',
    rerun: 'Rerun the virtual population',
    thVariant: 'Variant',
    h2Row: 'h² (within environment)',
    cellAria: (v: string, env: string): string => `Variant ${v}, ${env}: mean outcome`,
    edited: 'The table was edited by hand.',
    seg: { h2: 'Genetic (h²)', env: 'Environment', gxe: 'Gene × environment', res: 'Chance' },
    sliders: {
      n: { name: 'Number of environments', hint: 'How many different environments are measured. A single environment is what most studies do.', fmt: (v: number): string => `${v} ${v === 1 ? 'environment' : 'environments'}` },
      spread: { name: 'Environment diversity', hint: 'How different the environments are from each other: all similar, or poor versus rich?' },
      gen: { name: 'Gene difference between variants', hint: 'How far apart the mean outcomes of variants A, B and C are.' },
      inter: { name: 'Gene × environment interaction', hint: 'At zero, the environment affects everyone equally. At high values, the variants respond differently to the environment and the lines cross.' },
    },
    meters: { h2: 'Genetic share (h²)', env: 'Environmental share', gxe: 'Gene × environment share' },
    how: [
      (n: number): string => `Each variant × environment cell has ${n} virtual individuals. An individual’s outcome = the cell mean + a random deviation (same gene, same environment, yet variation between individuals). Genotypes are distributed independently and equally across environments.`,
      `The total variation is split into four parts: the average difference between variants (the genetic share, h²), the average difference between environments, the interaction the two create together, and within-cell chance. Interaction means “a variant’s effect changes with the environment”; it cannot be cleanly assigned to the genetic share or the environmental share.`,
      `Inputs: number of environments, difference between environments (environments are spaced evenly from poor to rich), gene difference between variants, and interaction strength (at 1 the slopes of the lines become 2 for A, 1 for B and 0 for C, and the lines cross). You can also edit the table cells by hand.`,
    ] as [(n: number) => string, string, string],
    book: [
      (rep: string): string => `Genetics of Mouse Behavior: Interactions with Laboratory Environment (three-laboratory mouse study; Crabbe et al., 1999): replication ${rep}`,
      (rep: string): string => `Socioeconomic Status Modifies Heritability of IQ in Young Children (Turkheimer et al., 2003): replication ${rep}`,
    ] as [(rep: string) => string, (rep: string) => string],
    bookExtra: `<p class="note">The Turkheimer finding was seen in U.S. samples; it was not seen or was reversed in Western Europe and Australia, and a large study in Florida found no interaction. So “h² is lower in a poor environment” is not a firm law but a contested finding.</p>`,
    foot: `Qualitative model. Numbers taken from the book: in Turkheimer, h² ≈ 10% (low SES) and ≈ 70% (high SES); in Crabbe, the increase in movement is 667, 701 and more than 5,000 cm. All other numbers (outcome scale, gene difference, variants B and C) are symbolic. The variants are not real genes. “Genetic share” here means the share of the average difference between variants; h² estimates from real twin studies are computed by different routes.`,
  },

  /* ---- Tab 2: MAO-A (mao-panel.ts) ---- */
  mao: {
    scen: [
      'First finding (Caspi 2002): ≈3-fold',
      'Smaller effect (symbolic 1.5-fold)',
      'No interaction (1-fold)',
    ],
    scenLabel: 'Interaction strength scenarios',
    callout1: (rep: string): string => `<strong>Replication status: ${rep}.</strong> Meta-analyses reported a small but significant interaction (Kim-Cohen 2006; Byrd and Manuck 2014). On the other hand, some large studies could not replicate it; candidate gene × environment interaction research was heavily criticized for publication bias and low statistical power (Duncan and Keller 2011).`,
    callout2: 'This tab teaches the <em>idea</em> of gene–environment interaction. The risks shown are symbolic; it does not calculate anyone’s real risk.',
    question: 'Question: does the low-activity variant of the MAO-A gene predict antisocial behavior in adulthood on its own, or only together with childhood maltreatment? In the Dunedin cohort (New Zealand, followed to age 26) the variant predicted nothing on its own; the low-activity variant raised the likelihood of antisocial behavior about threefold only among those with a history of severe childhood abuse.',
    chartLabel: 'Interaction plot: risk of antisocial behavior in the two MAO-A variants by level of childhood maltreatment',
    legendLabel: 'Variants',
    legendLow: 'Low-activity variant',
    legendHigh: 'High-activity variant',
    gridCardLabel: 'How many out of a hundred people',
    gridTitle: 'How many out of a hundred?',
    gridNote: 'Each dot is a person; a filled dot is someone who shows antisocial behavior in adulthood (symbolic). For the selected level of maltreatment.',
    gridLowLabel: 'Low-activity variant: hundred-person dot grid',
    gridHighLabel: 'High-activity variant: hundred-person dot grid',
    inputsLabel: 'MAO-A inputs',
    ticks: { none: 'none', mid: 'moderate', severe: 'severe' },
    axisX: 'Childhood maltreatment',
    axisY: 'Antisocial behavior, per hundred people (symbolic)',
    capLow: (n: number): string => `Low-activity: ${n} / 100`,
    capHigh: (n: number): string => `High-activity: ${n} / 100`,
    th: {
      variant: 'Variant',
      none: 'No maltreatment at all',
      severe: 'Severe maltreatment',
      all: (share: string): string => `Everyone together (severe share ${share})`,
    },
    rowLow: 'Low-activity',
    rowHigh: 'High-activity',
    times: (x: string): string => `${x}-fold`,
    sliders: {
      level: {
        name: 'Level of childhood maltreatment',
        hint: 'None on the left, severe and ongoing on the right. The interaction shows up only at the severe end.',
        none: 'none',
        mild: (p: string): string => `mild (${p})`,
        mid: (p: string): string => `moderate (${p})`,
        severe: (p: string): string => `severe (${p})`,
      },
      ratio: {
        name: 'Low/high-activity ratio under severe maltreatment',
        hint: `The book’s first finding is ≈3-fold. Studies that failed to replicate see a ratio close to 1.`,
      },
      share: {
        name: 'Share of the population with severe maltreatment',
        hint: 'A study that looks at the variant alone sees the effect diluted because the severe group is a small share.',
      },
    },
    meters: { low: 'Low-activity: risk', high: 'High-activity: risk', ratio: 'Ratio (low/high)' },
    how: [
      `In the high-activity variant, risk starts from a baseline and rises as maltreatment increases (for both variants, symbolically doubling at the severe level). In the low-activity variant, risk gets a multiplier on top of this. The multiplier stays at 1 until the maltreatment level exceeds about 30%, and reaches the ratio you choose (≈3 in the book) at the severe level.`,
      `So with no maltreatment the two lines overlap; with severe maltreatment they separate. If the lines are not parallel, there is an interaction. In the “No interaction” scenario the multiplier is 1: maltreatment raises both variants equally.`,
      'The population row takes the share of people with severe maltreatment from the slider; everyone else is counted as having had none. When the share is small, the difference the variant creates on its own also looks small.',
    ] as [string, string, string],
    book: [
      (rep: string): string => `Role of Genotype in the Cycle of Violence in Maltreated Children (MAOA genotype and childhood maltreatment; Caspi et al., 2002): replication ${rep}`,
      (): string => 'Abnormal Behavior Associated with a Point Mutation in the Structural Gene for Monoamine Oxidase A (Dutch family; Brunner, 1993)',
      (rep: string): string => `Neural Mechanisms of Genetic Risk for Impulsivity and Violence in Humans (low-activity MAO-A variant; 2006): replication ${rep}`,
    ] as [(rep: string) => string, () => string, (rep: string) => string],
    bookExtra: `<p class="note">The mutation in the Dutch family was a rare one that eliminates the enzyme entirely; it cannot be generalized to the common low-activity variant. The book also criticizes the “warrior gene” label.</p>`,
    foot: 'Qualitative model. The only number from the book is “about threefold” (for the low-activity variant among those with a history of severe abuse). The baseline risk (8%), the general effect of maltreatment and the curve at intermediate levels are symbolic; the book does not give these numbers. The book also notes limitations such as a weaker effect in girls and no effect at all in some groups.',
  },

  /* ---- Tab 3: height and GWAS (gwas-panel.ts) ---- */
  gwas: {
    intro: `Height is a highly heritable trait; even so, there is no single “height gene.” Here each variant contributes a small share, and the environment (nutrition, disease, childhood conditions) is added on top. Use the sliders to change the number of variants and the environment’s share, and watch how the distribution changes.`,
    histLabel: 'Histogram of the simulated height distribution',
    legendLabel: 'Histogram legend',
    legendHeight: 'Height (genes + environment)',
    legendGenes: 'Contribution of genes only',
    inputsLabel: 'Height inputs',
    btnBook: 'Book setting',
    btnRerun: 'Rerun',
    cardLabel: 'What does a GWAS find?',
    cardTitle: 'What does a GWAS (genome-wide association study) find?',
    cardNote: 'The scan looks at which variants vary together with height across many people. As the sample grows, smaller effects are picked up too.',
    sampleLabel: 'GWAS sample',
    samples: ['2010: 183,727 people', '2022: 5.4 million people'],
    axisX: 'Height (cm, symbolic scale)',
    axisY: (n: string): string => `Number of people (total ${n})`,
    read: {
      found: 'Variants found',
      foundBook10: 'book: hundreds',
      foundBook22: 'book: more than 12,000',
      top: 'Strongest single variant',
      topBook10: 'book: ≈0.4%',
      topCm: (x: string): string => `≈${x} cm per copy`,
      sum: 'Sum of those found',
      sumBook10: 'book: ≈10%',
      sumBook22: 'book: ≈40-45%',
    },
    cmp: {
      book10: 'Book setting: the model comes out close to the book’s numbers.',
      book22: 'Book setting: a larger sample finds many more variants and a much higher share; the model is tuned to keep this share around 40-45%.',
      other: `The comparison with the book is meaningful for the values of the “Book setting” button (300,000 variants, 20% environment).`,
    },
    sliders: {
      m: { name: 'Number of variants affecting height', hint: 'From one variant to hundreds of thousands. Logarithmic slider.' },
      env: { name: 'Contribution of the environment', hint: 'Nutrition, disease, childhood conditions: how much of the height difference comes from the environment.' },
    },
    meters: { genetic: 'Genetic share (simulated)', top: 'Strongest single variant', sum: `Sum of what the GWAS found` },
    how: [
      'How much of the difference each variant explains is drawn from a log-normal distribution: most are very small, a few are relatively large. The sum of all variants’ shares gives the genetic share (1 − environmental share). The environment is a random term independent of the genes.',
      (n: string): string => `The histogram comes from ${n} virtual people. The strongest 200 variants are drawn one by one for each person (each person carries 0, 1 or 2 copies of each variant); the sum of the many remaining small variants is added as a normal term by the central limit theorem. With one variant, only three height clusters appear; this is the result of a single Mendelian-style gene.`,
      `For a GWAS to “find” a variant, the product of its effect and the sample size must exceed a threshold (genome-wide significance, p &lt; 5×10⁻⁸). That is why only large-effect variants are found in a small sample.`,
      `Part of the genetic difference (here, with the most variants, 28%) is hidden in rare variants or in very small effects and cannot be found one by one even in the largest sample. That is why the sum of what is found stays below heritability (“missing heritability”).`,
    ] as [string, (n: string) => string, string, string],
    book: [
      (rep: string): string => `Hundreds of Variants Clustered in Genomic Loci and Biological Pathways Affect Human Height (GWAS of height; Lango Allen et al., 2010): replication ${rep}`,
      (): string => `Association Analyses of 249,796 Individuals Reveal 18 New Loci Associated with Body Mass Index (GWAS of body mass index; 2010): the best variant explains 0.3% of the difference`,
      (): string => `GWAS of 126,559 Individuals Identifies Genetic Variants Associated with Educational Attainment (GWAS of educational attainment; 2013): the best variant explains 0.02% of the difference`,
    ] as [(rep: string) => string, () => string, () => string],
    bookExtra: `<p class="note">According to the book, the genomes of 183,727 people were scanned; hundreds of variants were found to be associated with height, and only a handful were in genes known for skeletal growth. The strongest single variant explained only 0.4% of the variation in height, and all of them together about 10%. A later study (5.4 million people, 2022) found more than 12,000 variants; these explain about 40-45% of the variation in height in people of European ancestry. For educational attainment, some of the polygenic scores also reflect indirect effects such as the family environment.</p>`,
    foot: (mean: number, sd: number): string => `Qualitative model. Numbers taken from the book: a scan of 183,727 people, strongest variant ≈0.4%, all together ≈10%, “hundreds” of variants, and in 2022 &gt;12,000 variants, ≈40-45%. The book does not give the real number of effective variants: 300,000 variants, the effect distribution and the “share carried by common variants” (75%) are assumptions fitted jointly to the two points (2010 and 2022). The height scale (mean ${mean}, standard deviation ${sd} cm) and the genetic share (80%) are for illustration. The model has no gene × environment interaction.`,
  },
};

export default EN;
