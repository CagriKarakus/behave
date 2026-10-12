// Kültür ve ekoloji: saf model çekirdeği (DOM yok).
// 1) Schelling benzeri ızgara: parça büyüklüğü, sınırlar ve çatışma riski (Lim ve ark. 2007; Rutherford ve ark. 2014)
// 2) Ekoloji -> kültür eğilimleri (Talhelm, Masuda ve Nisbett, onur kültürü)
// 3) Koridor hakaret deneyi ve kamu malı oyununda antisosyal ceza (Nisbett ve Cohen; Herrmann ve ark.)
import { mulberry32, normal } from './rng';

export { mulberry32 };
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

// ===================== 1. Parçalar ve sınırlar =====================
export const W = 40;
export const H = 40;
export const NC = W * H;
/** Bir hücrenin gerçek dünya karşılığı (modelin varsayımı): 4 km. Izgara ~160 x 160 km. */
export const CELL_KM = 4;
export const E = 0, GA = 1, GB = 2, WALL = 3;
/** Özerk (net, tanınan sınırlı) bölgede grup teması çatışmaya daha az yol açar (modelin varsayımı). */
export const AUT_W = 0.2;
/** Kitaptaki ada ölçeği: 20-60 km çaplı etnik adalar (ch09-e9). */
export const ISLAND_KM = { lo: 20, hi: 60 } as const;
const RISK_NORM = 0.55;
const MIX_FLIP = 0.2;
const DRIFT = 0.15;

export interface World { c: Uint8Array; aut: Uint8Array; rng: () => number; t: number }

export function newWorld(seed: number, ratioA = 0.5, vacancy = 0.1, walls?: Uint8Array): World {
  const rng = mulberry32(seed);
  const c = new Uint8Array(NC);
  const idx: number[] = [];
  for (let i = 0; i < NC; i++) { if (walls?.[i]) c[i] = WALL; else idx.push(i); }
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  // Karışık başlangıç: grupların birbirine dolandığı satranç tahtası benzeri düzen, %MIX_FLIP rastgele bozulur.
  const nAg = Math.round(idx.length * (1 - vacancy));
  for (let k = 0; k < nAg; k++) {
    const i = idx[k], par = (X(i) + Y(i)) & 1;
    let g = (par === 0) !== (rng() < MIX_FLIP) ? GA : GB;
    if (ratioA > 0.5 && g === GB && rng() < 2 * ratioA - 1) g = GA;
    else if (ratioA < 0.5 && g === GA && rng() < 1 - 2 * ratioA) g = GB;
    c[i] = g;
  }
  return { c, aut: new Uint8Array(NC), rng, t: 0 };
}

/** Yeniden yerleşim: aynı tohum ailesi, mevcut çitler korunur, özerklik sıfırlanır. */
export function reseed(w: World, seed: number, ratioA: number, vacancy = 0.1): World {
  const walls = new Uint8Array(NC);
  for (let i = 0; i < NC; i++) if (w.c[i] === WALL) walls[i] = 1;
  return newWorld(seed, ratioA, vacancy, walls);
}

export function paintWall(w: World, i: number, on: boolean): void {
  if (on) {
    const g = w.c[i];
    if (g === WALL) return;
    w.c[i] = WALL;
    if (g === GA || g === GB) {
      const free: number[] = [];
      for (let k = 0; k < NC; k++) if (w.c[k] === E) free.push(k);
      if (free.length) w.c[free[Math.floor(w.rng() * free.length)]] = g;
    }
  } else if (w.c[i] === WALL) w.c[i] = E;
}

const X = (i: number) => i % W, Y = (i: number) => (i / W) | 0;

function sameFrac(c: Uint8Array, i: number, g: number): number {
  const x = X(i), y = Y(i);
  let s = 0, o = 0;
  for (let dy = -1; dy <= 1; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= H) continue;
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx;
      if (xx < 0 || xx >= W) continue;
      const v = c[yy * W + xx];
      if (v === g) s++; else if (v === GA || v === GB) o++;
    }
  }
  return s + o === 0 ? 1 : s / (s + o);
}

/** Hareketlilik 0..1 -> bir ajanın tek seferde gidebileceği yarıçap (hücre). */
export const radiusOf = (mob: number) => 1 + Math.round(clamp(mob) * 9);

/** Bir adım: mutsuz ajanlar (aynı gruptan komşu oranı < pref) yarıçap içinde mutlu olacakları boş hücreye taşınır. */
export function step(w: World, pref: number, mob: number): number {
  const { c, rng } = w;
  const order: number[] = [];
  for (let i = 0; i < NC; i++) if (c[i] === GA || c[i] === GB) order.push(i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const r = radiusOf(mob);
  let moved = 0;
  for (const i of order) {
    const g = c[i];
    const f0 = sameFrac(c, i, g);
    const content = f0 >= pref;
    // Memnun ajanlar da nadiren, açık fark yaratan bir yere taşınır (sınırlar zamanla düzleşir ve parçalar büyür).
    if (content && (f0 >= Math.min(0.95, pref + 0.2) || rng() > DRIFT)) continue;
    const x = X(i), y = Y(i);
    for (let k = 0; k < 6; k++) {
      const xx = x + Math.floor(rng() * (2 * r + 1)) - r, yy = y + Math.floor(rng() * (2 * r + 1)) - r;
      if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
      const j = yy * W + xx;
      if (c[j] !== E) continue;
      c[i] = E;
      const f1 = sameFrac(c, j, g);
      const ok = content ? f1 >= f0 + 0.1 : f1 >= pref && f1 > f0;
      if (ok) { c[j] = g; moved++; break; }
      c[i] = g;
    }
  }
  w.t++;
  return moved;
}

export const diamKm = (cells: number) => 2 * CELL_KM * Math.sqrt(cells / Math.PI);
/** Parça çapına göre çatışma penceresi: 20-60 km çevresinde ~0.6-1, çok küçük ya da çok büyükte ~0 (log-çan eğrisi; modelin varsayımı). */
export function windowOf(dKm: number): number {
  const d0 = Math.sqrt(ISLAND_KM.lo * ISLAND_KM.hi), z = Math.log(Math.max(dKm, 0.1) / d0) / 0.4;
  return Math.exp(-0.5 * z * z);
}

export interface Metrics {
  n: number; patches: number; sizes: number[]; score: number[]; lab: Int32Array;
  /** Bir kişinin yaşadığı parçanın ortalama büyüklüğü (hücre): sum(s^2)/n. */
  meanS: number; meanKm: number; rawRisk: number; plainKm: number;
  /** 0..1 çatışma riski göstergesi. */
  risk: number;
  /** Ana kara dışındaki (en büyük iki parça hariç) 5+ hücrelik izole ada sayısı. */
  islands: number;
  /** Gruplar arası temas hattı uzunluğu (km). */
  borderKm: number;
  /** Ortalama aynı gruptan komşu oranı. */
  same: number; unhappy: number;
}

export function analyze(w: World, pref: number): Metrics {
  const { c, aut } = w;
  const lab = new Int32Array(NC).fill(-1);
  const sizes: number[] = [], score: number[] = [], groups: number[] = [];
  let n = 0, border = 0, num = 0, sameSum = 0, hasN = 0, unhappy = 0;
  const stack: number[] = [];
  const nb = (i: number) => {
    const x = X(i), y = Y(i), out: number[] = [];
    if (x > 0) out.push(i - 1); if (x < W - 1) out.push(i + 1); if (y > 0) out.push(i - W); if (y < H - 1) out.push(i + W);
    return out;
  };
  for (let i = 0; i < NC; i++) {
    const g = c[i];
    if (g !== GA && g !== GB) continue;
    n++;
    const f = sameFrac(c, i, g); sameSum += f; hasN++;
    if (f < pref) unhappy++;
    if (lab[i] >= 0) continue;
    const id = sizes.length;
    let s = 0, cw = 0, perim = 0;
    stack.push(i); lab[i] = id;
    while (stack.length) {
      const p = stack.pop()!; s++;
      for (const q of nb(p)) {
        const v = c[q];
        if (v === g) { if (lab[q] < 0) { lab[q] = id; stack.push(q); } continue; }
        perim++;
        if (v === GA || v === GB) cw += aut[p] || aut[q] ? AUT_W : 1;
      }
    }
    const e = perim ? cw / perim : 0;
    const win = windowOf(diamKm(s));
    sizes.push(s); groups.push(g); score.push(win * e); num += s * win * e;
  }
  // Temas hattı: her çift bir kez sayılsın (yatay ve dikey komşuluklar).
  for (let i = 0; i < NC; i++) {
    const g = c[i];
    if (g !== GA && g !== GB) continue;
    if (X(i) < W - 1 && c[i + 1] !== g && (c[i + 1] === GA || c[i + 1] === GB)) border++;
    if (Y(i) < H - 1 && c[i + W] !== g && (c[i + W] === GA || c[i + W] === GB)) border++;
  }
  let sq = 0;
  for (const s of sizes) sq += s * s;
  const meanS = n ? sq / n : 0;
  const top = [GA, GB].map((g) => Math.max(0, ...sizes.filter((_, k) => groups[k] === g)));
  const islands = sizes.filter((s, k) => s >= 5 && s < top[groups[k] - 1]).length;
  return {
    n, patches: sizes.length, sizes, score, lab, meanS, meanKm: diamKm(meanS), rawRisk: n ? num / n : 0, plainKm: diamKm(n / Math.max(1, sizes.length)),
    risk: n ? clamp(num / n / RISK_NORM) : 0, islands, borderKm: border * CELL_KM,
    same: hasN ? sameSum / hasN : 1, unhappy: n ? unhappy / n : 0,
  };
}

/** Özerklik: tıklanan parçanın bütün hücrelerini özerk bölge işaretler. */
export function grantAutonomy(w: World, m: Metrics, i: number): boolean {
  const id = m.lab[i];
  if (id < 0) return false;
  for (let k = 0; k < NC; k++) if (m.lab[k] === id) w.aut[k] = 1;
  return true;
}
export function grantAll(w: World, m: Metrics): void {
  for (let k = 0; k < NC; k++) if (m.lab[k] >= 0) w.aut[k] = 1;
}
export function clearBorders(w: World): void { w.aut.fill(0); for (let i = 0; i < NC; i++) if (w.c[i] === WALL) w.c[i] = E; }

/** Nehir/dağ çiti: orta sütun, birkaç geçit bırakılmış (hazır senaryo). */
export function riverFence(w: World): void {
  const x = W >> 1;
  for (let y = 0; y < H; y++) {
    if (y % 13 === 6) continue;
    paintWall(w, y * W + x, true);
  }
}

export function describeGrid(m: Metrics, pref: number, fenced: boolean): string {
  const km = Math.round(m.meanKm);
  const where = km < ISLAND_KM.lo ? 'çok küçük parçalar: kişiler karışık yaşıyor' : km <= ISLAND_KM.hi ? 'orta büyüklükte adalar: kitaptaki 20-60 km ölçeği' : 'büyük, net bölgeler: tek tek ada kalmadı';
  const r = m.risk;
  const lvl = r < 0.25 ? 'düşük' : r < 0.6 ? 'orta' : 'yüksek';
  return `Ortalama parça yaklaşık ${km} km çapında (${where}). Çatışma riski göstergesi ${lvl} (%${Math.round(r * 100)})${fenced ? '; çit ve özerklik teması azaltıyor' : ''}${pref === 0 ? ' (tercih 0: kimse taşınmıyor)' : ''}.`;
}

// ===================== 2. Ekoloji -> kültür =====================
export interface Eco { id: string; name: string; L: number; V: number; book: boolean }
/** L: ortak emek bağımlılığı (sulama gibi), V: çalınabilir mal ve itibar kırılganlığı (hareketli sürü, zayıf devlet). Değerler modelin varsayımıdır. */
export const ECOS: Eco[] = [
  { id: 'rice', name: 'Pirinç (ortak sulama)', L: 0.9, V: 0.15, book: true },
  { id: 'wheat', name: 'Buğday (bireysel)', L: 0.2, V: 0.2, book: true },
  { id: 'herd', name: 'Göçebe çobanlık', L: 0.3, V: 0.9, book: true },
  { id: 'desert', name: 'Çöl çobanlığı', L: 0.25, V: 0.8, book: false },
  { id: 'forest', name: 'Yağmur ormanı', L: 0.5, V: 0.1, book: false },
];

export interface Culture {
  K: number; Hol: number; O: number;
  self: number; rel: number; divorce: number; patent: number; ctx: number; ctr: number;
}
export function cultureOf(L: number, V: number): Culture {
  const K = clamp(0.12 + 0.72 * L - 0.08 * V);
  const O = clamp(0.08 + 0.85 * V * (1 - 0.45 * L));
  const Hol = clamp(0.15 + 0.7 * K);
  return {
    K, Hol, O,
    self: 1.25 - 0.5 * K, rel: 0.2 + 0.6 * K,
    divorce: Math.max(0.2, 1 + (0.5 - K) * 1.2), patent: Math.max(0.2, 1 + (0.5 - K) * 1.6),
    ctx: 0.45 + 0.35 * Hol, ctr: 0.85 - 0.3 * Hol,
  };
}

// ===================== 3a. Koridor hakaret deneyi =====================
/** Onur kültürü gücü h (0..1) ve bireysel sapma ile kişisel duyarlılık. */
export const HONOR = { north: 0.2, south: 0.8 } as const;
export const pViolent = (s: number, insult: boolean) => clamp(0.1 + 0.1 * s + (insult ? 0.6 * s * s : 0));
export interface CorridorRun { dT: number; dC: number; violent: number; dots: boolean[] }
export function corridor(h: number, insult: boolean, n: number, seed: number): CorridorRun {
  const rnd = mulberry32(seed);
  let dT = 0, dC = 0, v = 0;
  const dots: boolean[] = [];
  for (let k = 0; k < n; k++) {
    const s = clamp(h + 0.15 * normal(rnd));
    const sens = insult ? s * s : 0;
    dT += clamp(sens + 0.03 * normal(rnd), 0, 1.2);
    dC += clamp(sens * 0.9 + 0.03 * normal(rnd), 0, 1.2);
    const yes = rnd() < pViolent(s, insult);
    dots.push(yes); if (yes) v++;
  }
  return { dT: dT / n, dC: dC / n, violent: v / n, dots };
}

// ===================== 3b. Kamu malı oyunu ve antisosyal ceza =====================
export interface PggParams { ineq: number; trust: number; cost: number; seed: number; rounds?: number }
export interface PggResult {
  /** Tur başına ortalama katkı oranı ve güven. */
  coop: number[]; trust: number[];
  /** Ceza puanları: hile yapana (prososyal) ve cömert olana (antisosyal). */
  pro: number; anti: number;
  antiShare: number; capital: number; payoffGini: number;
}
const PLAYERS = 24, GROUP = 4, ENDOW = 20;

export function playPgg(p: PggParams): PggResult {
  const rnd = mulberry32(p.seed), T = p.rounds ?? 10;
  const sigma = 1.1 * p.ineq;
  let inc = Array.from({ length: PLAYERS }, () => Math.exp(sigma * normal(rnd)));
  const mean = inc.reduce((a, b) => a + b, 0) / PLAYERS;
  inc = inc.map((v) => (v / mean) * ENDOW);
  let r = Array.from({ length: PLAYERS }, () => clamp(0.25 + 0.5 * p.trust + 0.12 * normal(rnd), 0.02, 1));
  let trust = p.trust;
  const pay = new Array(PLAYERS).fill(0);
  const coop: number[] = [], tr: number[] = [];
  let pro = 0, anti = 0;
  const willing = 1 / (1 + 0.5 * (p.cost - 1));
  for (let t = 0; t < T; t++) {
    const nr = r.slice(), hits = new Array(PLAYERS).fill(0);
    let mc = 0, antiNow = 0, pts = 0;
    for (let g = 0; g < PLAYERS; g += GROUP) {
      const ids = [g, g + 1, g + 2, g + 3];
      const contrib = ids.map((i) => r[i] * inc[i]);
      const pot = contrib.reduce((a, b) => a + b, 0) * 0.4; // kişi başı getiri oranı 0.4
      ids.forEach((i, k) => { pay[i] += inc[i] - contrib[k] + pot; mc += r[i]; });
      for (const i of ids) {
        for (const j of ids) {
          if (i === j) continue;
          const d = r[j] - r[i];
          let prob = 0, kind = 0;
          if (d < -0.15) { prob = 0.55 * willing; kind = 1; }
          else if (d > 0.1) { prob = willing * (1 - trust) * (1 - trust) * (0.2 + 0.8 * p.ineq); kind = 2; }
          if (rnd() >= prob) continue;
          const points = clamp(Math.round(Math.abs(d) * 6), 1, 5);
          hits[j] += points; pts += points;
          pay[i] -= points * p.cost * 0.2; pay[j] -= points * 0.6;
          if (kind === 1) pro += points; else { anti += points; antiNow += points; }
        }
      }
    }
    // Katkı güncellemesi: grup ortalamasına yaklaşma; ceza yiyen cömert oyuncu geri çekilir, hile yapan artırır.
    for (let g = 0; g < PLAYERS; g += GROUP) {
      const ids = [g, g + 1, g + 2, g + 3];
      for (const i of ids) {
        const others = ids.filter((k) => k !== i).reduce((a, k) => a + r[k], 0) / (GROUP - 1);
        const high = r[i] > others;
        nr[i] = clamp(r[i] + 0.5 * (others - r[i]) + (high ? -1 : 1) * 0.06 * hits[i] + 0.04 * normal(rnd), 0.02, 1);
      }
    }
    r = nr;
    const cm = mc / PLAYERS;
    trust += 0.15 * (clamp(cm - 0.3 * Math.min(1, antiNow / PLAYERS) - 0.25 * p.ineq + 0.1) - trust);
    coop.push(cm); tr.push(trust);
  }
  const totalPts = pro + anti;
  const sorted = pay.slice().sort((a, b) => a - b), sum = sorted.reduce((a, b) => a + b, 0);
  let gsum = 0;
  sorted.forEach((v, k) => { gsum += (2 * (k + 1) - PLAYERS - 1) * v; });
  return {
    coop, trust: tr, pro, anti,
    antiShare: totalPts ? anti / totalPts : 0, capital: trust, payoffGini: sum ? gsum / (PLAYERS * sum) : 0,
  };
}

/** Eşitsizlik taramasında ortalama sonuç (tohum topluluğu). */
export function pggSweep(trust: number, cost: number, steps = 10, reps = 8): Array<{ ineq: number; capital: number; antiShare: number; coop: number }> {
  const out: Array<{ ineq: number; capital: number; antiShare: number; coop: number }> = [];
  for (let k = 0; k <= steps; k++) {
    const ineq = k / steps;
    let cap = 0, as = 0, co = 0;
    for (let s = 0; s < reps; s++) {
      const r = playPgg({ ineq, trust, cost, seed: 100 + s });
      cap += r.capital; as += r.antiShare; co += r.coop[r.coop.length - 1];
    }
    out.push({ ineq, capital: cap / reps, antiShare: as / reps, coop: co / reps });
  }
  return out;
}

export function describePgg(r: PggResult): string {
  const last = r.coop[r.coop.length - 1];
  const a = Math.round(r.antiShare * 100);
  const total = r.pro + r.anti;
  if (!total) return `Son turda katkı oranı %${Math.round(last * 100)}; cezalandırma neredeyse hiç yok.`;
  return `Son turda katkı oranı %${Math.round(last * 100)}. Ceza puanlarının %${a}'i cömert oyunculara gitti (antisosyal), %${100 - a}'i hile yapanlara.`;
}
