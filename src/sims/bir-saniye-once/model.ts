// Nitel beyin modeli: 9 bölge, 15 bağlantı, sızıntılı hız (rate) dinamiği.
// Sayılar ölçüm değildir; ilişkilerin yönünü ve zamanlamasını gösterir.
// Kaynak: reference/artifacts/bir-saniye-once.html (davranış değişmeden taşındı).

export type RegionId = 'ofc' | 'acc' | 'dlpfc' | 'vmpfc' | 'bla' | 'itc' | 'cea' | 'vta' | 'nacc';
export type Group = 'pfc' | 'amy' | 'dop';

export interface NodeDef { id: RegionId; ab: string; cap: string; grp: Group; x: number; y: number; tau: number; b: number }
export interface EdgeDef { from: RegionId; to: RegionId; w: number; bend: number }
export interface Inputs { threat: number; cue: number; prob: number; effort: number; frontal: number; stress: number }
export type Activity = Record<RegionId, number>;
export type Lesion = Partial<Record<RegionId, boolean>>;
export interface NetPart { from: RegionId | 'dış girdi'; v: number }

export const NODES: NodeDef[] = [
  { id: 'ofc',   ab: 'OFC',   cap: 'orbitofrontal',   grp: 'pfc', x: 70,  y: 60,  tau: 0.6,  b: 0.2 },
  { id: 'acc',   ab: 'ACC',   cap: 'ön singulat',     grp: 'pfc', x: 180, y: 60,  tau: 0.5,  b: 0.2 },
  { id: 'dlpfc', ab: 'dlPFC', cap: 'dorsolateral',    grp: 'pfc', x: 290, y: 60,  tau: 0.8,  b: 0.25 },
  { id: 'vmpfc', ab: 'vmPFC', cap: 'ventromedial',    grp: 'pfc', x: 180, y: 170, tau: 0.7,  b: 0.1 },
  { id: 'bla',   ab: 'BLA',   cap: 'bazolateral',     grp: 'amy', x: 70,  y: 290, tau: 0.3,  b: 0.15 },
  { id: 'itc',   ab: 'ITC',   cap: 'ardışık hücre',   grp: 'amy', x: 180, y: 290, tau: 0.4,  b: 0.1 },
  { id: 'cea',   ab: 'CeA',   cap: 'merkezi',         grp: 'amy', x: 290, y: 290, tau: 0.35, b: 0.1 },
  { id: 'vta',   ab: 'VTA',   cap: 'dopamin kaynağı', grp: 'dop', x: 70,  y: 420, tau: 0.3,  b: 0.2 },
  { id: 'nacc',  ab: 'NAcc',  cap: 'akumbens',        grp: 'dop', x: 290, y: 420, tau: 0.4,  b: 0.15 },
];

// from, to, ağırlık (+ uyarır, − engeller), bend (çizimde eğrilik, px)
export const EDGES: EdgeDef[] = [
  { from: 'acc',   to: 'dlpfc', w: 0.6,  bend: 0 },
  { from: 'dlpfc', to: 'vmpfc', w: 0.5,  bend: 0 },
  { from: 'ofc',   to: 'vmpfc', w: 0.5,  bend: 0 },
  { from: 'bla',   to: 'ofc',   w: 0.5,  bend: 0 },
  { from: 'bla',   to: 'vmpfc', w: 0.4,  bend: 26 },
  { from: 'vmpfc', to: 'bla',   w: -0.5, bend: 26 },
  { from: 'vmpfc', to: 'itc',   w: 0.8,  bend: 0 },
  { from: 'bla',   to: 'itc',   w: 0.3,  bend: 0 },
  { from: 'itc',   to: 'cea',   w: -0.5, bend: 0 },
  { from: 'bla',   to: 'cea',   w: 1.2,  bend: 70 },
  { from: 'bla',   to: 'nacc',  w: 0.35,  bend: 0 },
  { from: 'vta',   to: 'nacc',  w: 1.0,  bend: 0 },
  { from: 'vta',   to: 'bla',   w: 0.3,  bend: 0 },
  { from: 'vta',   to: 'ofc',   w: 0.35, bend: -80 },
  { from: 'dlpfc', to: 'nacc',  w: -0.4, bend: -80 },
];

export const REST: Inputs = { threat: 0, cue: 0, prob: 0.5, effort: 0, frontal: 1, stress: 0 };

export const sig = (z: number): number => 1 / (1 + Math.exp(-7 * (z - 0.5)));

// Dışarıdan gelen girdi: kaydırıcılar -> bölgeler
export function inputs(u: Inputs): Partial<Record<RegionId, number>> {
  const unc = 4 * u.prob * (1 - u.prob); // %50'de 1, uçlarda 0
  return {
    bla: 1.1 * u.threat + 0.35 * u.cue + 0.5 * u.effort,
    acc: 0.7 * u.effort,
    vta: u.cue * (0.25 * u.prob + 0.75 * unc),
  };
}

// Bölge kazançları: frontal güç ve stres burada devreye girer
export function gains(u: Inputs): Record<RegionId, number> {
  const f = u.frontal * (1 - 0.45 * u.stress);
  return { ofc: f, acc: f, dlpfc: f, vmpfc: f, bla: 1 + 0.5 * u.stress, cea: 1 + 0.35 * u.stress, itc: 1, vta: 1, nacc: 1 };
}

// Her bölgenin net girdisi ve bileşenleri (arayüz ayrıntı paneli de kullanır)
export function netInput(id: RegionId, x: Activity, u: Inputs, lesion: Lesion): { z: number; parts: NetPart[] } {
  const ext = inputs(u)[id] || 0;
  const g = gains(u)[id];
  const parts: NetPart[] = [];
  for (const e of EDGES) {
    if (e.to === id) parts.push({ from: e.from, v: lesion[e.from] ? 0 : e.w * x[e.from] * g });
  }
  if (ext) parts.push({ from: 'dış girdi', v: ext * g });
  const node = NODES.find((n) => n.id === id) as NodeDef;
  const z = g * node.b + parts.reduce((s, p) => s + p.v, 0);
  return { z, parts };
}

export function step(x: Activity, u: Inputs, lesion: Lesion, dt: number): Activity {
  const next = {} as Activity;
  for (const n of NODES) {
    if (lesion[n.id]) { next[n.id] = 0; continue; }
    const { z } = netInput(n.id, x, u, lesion);
    next[n.id] = x[n.id] + (dt / n.tau) * (-x[n.id] + sig(z));
  }
  return next;
}

export function settle(u: Inputs, lesion: Lesion, seconds = 12, dt = 0.02, x0?: Activity): Activity {
  let x: Activity = x0 || (Object.fromEntries(NODES.map((n) => [n.id, 0])) as Activity);
  for (let t = 0; t < seconds; t += dt) x = step(x, u, lesion, dt);
  return x;
}

export const controlOf = (x: Activity): number => (x.dlpfc + x.vmpfc) / 2;

// Durumu Türkçe tek cümleye çevirir
export function describe(x: Activity, u: Inputs, lesion: Lesion): string {
  const ctl = controlOf(x);
  const thr = u.threat;
  if (lesion.bla && lesion.cea) return 'Amigdala devre dışı: tehdit olsa bile alarm üretilmiyor ("evcilleşme etkisi").';
  if (lesion.bla && thr > 0.3) return 'BLA yok: tehdit bilgisi merkezi amigdalaya ulaşmıyor, tepki çok zayıf.';
  if (lesion.vmpfc && x.cea > 0.3) return 'vmPFC yok: amigdalayı yatıştıran fren eksik, alarm uzuyor.';
  if (x.cea > 0.55 && ctl < 0.4) return 'Amigdala baskın, frontal fren zayıf: tepki dizginlenemiyor.';
  if (x.cea > 0.55) return 'Amigdala yüksek; frontal korteks devrede ama tehdit çok güçlü.';
  if (thr > 0.3 && x.cea < 0.3 && ctl >= 0.4) return 'Tehdit var, ama frontal korteks ve ITC kapısı amigdalayı yatıştırıyor.';
  if (x.nacc > 0.55 && x.bla >= 0.45) return 'İsteme yüksek ve amigdala devrede: arzunun içindeki gerginlik.';
  if (x.nacc > 0.55) return 'Ödül devresi açık, amigdala sakin: pasif ilgi ve haz.';
  if (x.vta > 0.55) return 'Dopamin yüksek: ödülün kendisinden çok beklenti ve belirsizlik sürüyor.';
  return 'Dinlenme hâli: tüm devreler düşük, frontal korteks denetimde.';
}
