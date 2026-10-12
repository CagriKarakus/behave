import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import {
  AA, CODON, CONF_DEFAULT, REF_DNA, allPointOutcomes, analyze, applyMut, cards, confOut, envFactor, expression, fitness, outcomesAt,
  runWF, selectP, splice, steady, stepConf, toMrna, translate, type Mut,
} from './model';

const pt = (pos: number, base: string): Mut => ({ kind: 'point', pos, base, n: 1 });

describe('genetik kod (kitaptan)', () => {
  it('64 kodon: 61 amino asit, 3 dur', () => {
    const vals = Object.values(CODON);
    expect(vals.length).toBe(64);
    expect(vals.filter((v) => v === '*').length).toBe(3);
    expect(vals.filter((v) => v !== '*').length).toBe(61);
  });
  it('20 amino asit, çoğunun birden fazla kodonu var; Met ve Trp tek', () => {
    const n: Record<string, number> = {};
    for (const v of Object.values(CODON)) if (v !== '*') n[v] = (n[v] ?? 0) + 1;
    expect(Object.keys(n).length).toBe(20);
    expect(Object.keys(AA).sort()).toEqual(Object.keys(n).sort());
    expect(Object.values(n).filter((c) => c > 1).length).toBe(18);
    expect(n.M).toBe(1); expect(n.W).toBe(1); expect(n.L).toBe(6);
    expect(CODON.ATG).toBe('M'); expect(CODON.TAA).toBe('*'); expect(CODON.GCT).toBe('A');
  });
  it('kodon fazlalığı: üçüncü baz çoğunlukla sessiz, ilk iki baz çoğunlukla değil', () => {
    const rate = (idx: number): number => {
      let s = 0, tot = 0;
      for (const c of Object.keys(CODON)) {
        if (CODON[c] === '*') continue;
        for (const b of 'ACGT') {
          if (b === c[idx]) continue;
          tot++;
          if (CODON[c.slice(0, idx) + b + c.slice(idx + 1)] === CODON[c]) s++;
        }
      }
      return s / tot;
    };
    expect(rate(2)).toBeGreaterThan(0.6);
    expect(rate(0)).toBeLessThan(0.15);
    expect(rate(1)).toBeLessThan(0.05);
  });
});

describe('çeviri', () => {
  it('örnek gen: Met-Ala-Leu-Lys-Gly-Trp-His-Glu-Phe-Pro, dur ile biter', () => {
    const t = translate(REF_DNA);
    expect(t.aas).toBe('MALKGWHEFP');
    expect(t.stopped).toBe(true);
    expect(toMrna('ATGT')).toBe('AUGU');
  });
  it('kutular: 11 kodon, dur sonrası okunmaz', () => {
    expect(cards(REF_DNA).length).toBe(11);
    const c = cards(applyMut(REF_DNA, { kind: 'point', pos: 17, base: 'A', n: 1 }));
    expect(c[5].aa).toBe('*');
    expect(c[6].read).toBe(false);
  });
});

describe('mutasyonlar', () => {
  it('üçüncü bazdaki değişim sessiz kalır (GCT -> GCC, Ala)', () => {
    const a = analyze(REF_DNA, pt(5, 'C'));
    expect(a.kind).toBe('sessiz');
    expect(a.f).toBe(1);
    expect(a.diff.length).toBe(0);
  });
  it('yanlış anlamlı: aktif bölgede His -> Asp işlevi çok düşürür, bölge dışında benzer değişim hafif', () => {
    const crit = analyze(REF_DNA, pt(18, 'G'));
    expect(crit.kind).toBe('yanlis');
    expect(crit.mut.aas[6]).toBe('D');
    expect(crit.f).toBeLessThan(0.2);
    const soft = analyze(REF_DNA, pt(10, 'G'));
    expect(soft.kind).toBe('yanlis');
    expect(soft.mut.aas[3]).toBe('R');
    expect(soft.f).toBeGreaterThan(0.7);
    expect(soft.f).toBeLessThan(1);
  });
  it('anlamsız: Trp (TGG) -> dur (TGA) zinciri keser, ne kadar erken o kadar kötü', () => {
    const a = analyze(REF_DNA, pt(17, 'A'));
    expect(a.kind).toBe('anlamsiz');
    expect(a.mut.aas).toBe('MALKG');
    expect(a.f).toBeCloseTo(0.25, 5);
    // Aynı kodondaki üçüncü baz değişimi sessiz, ikinci baz değişimi yanlış anlamlı (Leu CTG -> Gln CAG).
    expect(analyze(REF_DNA, pt(8, 'A')).kind).toBe('sessiz');
    expect(analyze(REF_DNA, pt(7, 'A')).kind).toBe('yanlis');
    // Dur kodonu ne kadar geç gelirse zarar o kadar küçük: Glu GAG -> TAG yedinci amino asitte keser.
    const later = analyze(REF_DNA, pt(21, 'T'));
    expect(later.kind).toBe('anlamsiz');
    expect(later.mut.aas.length).toBe(7);
    expect(later.f).toBeGreaterThan(a.f);
  });
  it('başlangıç kodonu kaybı: protein yok', () => {
    const a = analyze(REF_DNA, pt(1, 'C'));
    expect(a.kind).toBe('baslangic');
    expect(a.f).toBe(0);
    expect(a.mut.aas).toBe('');
  });
  it('dur kodonu kaybı zinciri uzatır', () => {
    const a = analyze(REF_DNA, pt(30, 'C')); // TAA -> CAA (Gln)
    expect(a.kind).toBe('uzama');
    expect(a.f).toBeLessThan(1);
  });
  it('dur kodonu başka bir dura dönüşürse sessiz', () => {
    expect(analyze(REF_DNA, pt(32, 'G')).kind).toBe('sessiz'); // TAA -> TAG
  });
  it('çerçeve kayması: 1 nt silme/ekleme sonrasını bozar; 3 nt silme çerçeveyi korur', () => {
    const del = analyze(REF_DNA, { kind: 'del', pos: 7, base: 'A', n: 1 });
    expect(del.kind).toBe('kayma');
    expect(del.f).toBeLessThan(0.05);
    expect(del.diff.length).toBeGreaterThanOrEqual(7);
    const ins = analyze(REF_DNA, { kind: 'ins', pos: 7, base: 'A', n: 1 });
    expect(ins.kind).toBe('kayma');
    const del3 = analyze(REF_DNA, { kind: 'del', pos: 12, base: 'A', n: 3 });
    expect(del3.kind).toBe('cerceve-ici');
    expect(del3.mut.aas.length).toBe(9);
    expect(del3.f).toBeGreaterThan(del.f);
    const ins3 = analyze(REF_DNA, { kind: 'ins', pos: 13, base: 'G', n: 3 });
    expect(ins3.kind).toBe('cerceve-ici');
    expect(ins3.mut.aas.length).toBe(11);
  });
  it('kitaptaki sıralama: kayma çoğunlukla nokta mutasyonundan çok daha zararlı', () => {
    let worst = 0, shifts = 0;
    for (let p = 3; p < 24; p++) {
      const s = analyze(REF_DNA, { kind: 'del', pos: p, base: 'A', n: 1 });
      shifts += s.f;
      worst = Math.max(worst, outcomesAt(REF_DNA, p).yanlis);
    }
    expect(shifts / 21).toBeLessThan(0.15);
    expect(worst).toBeGreaterThan(0);
    const g = allPointOutcomes(REF_DNA);
    expect(g.toplam).toBe(99);
    expect(g.sessiz / g.toplam).toBeGreaterThan(0.15);
    expect(g.sessiz / g.toplam).toBeLessThan(0.35);
    expect(g.yanlis).toBeGreaterThan(g.anlamsiz);
  });
  it('aynı baza değişim: değişiklik yok', () => {
    expect(analyze(REF_DNA, pt(0, 'A')).kind).toBe('degisim-yok');
  });
  it('konum çıktıları: üçüncü bazda üç değişim de sessiz', () => {
    const o = outcomesAt(REF_DNA, 5);
    expect(o.sessiz).toBe(3);
  });
});

describe('gen düzenlenmesi', () => {
  it('sinyal yok: kapalı; yüksek sinyal: açık; aynı gen farklı ortamda farklı ifade', () => {
    const lo = expression({ signal: 0.05, tf: 1, methyl: false });
    const hi = expression({ signal: 0.9, tf: 1, methyl: false });
    expect(lo.state).toBe('kapalı');
    expect(hi.state).toBe('açık');
    expect(hi.expr).toBeGreaterThan(lo.expr * 5);
  });
  it('metilasyon kilidi: sinyal ve TF olsa da kapalı', () => {
    const k = expression({ signal: 1, tf: 1, methyl: true });
    expect(k.state).toBe('kapalı');
    expect(k.expr).toBeLessThan(0.1);
  });
  it('TF yoksa sinyal işe yaramaz; ifade sinyalle monoton artar', () => {
    expect(expression({ signal: 1, tf: 0, methyl: false }).state).toBe('kapalı');
    let prev = -1;
    for (let s = 0; s <= 10; s++) { const e = expression({ signal: s / 10, tf: 1, methyl: false }).expr; expect(e).toBeGreaterThanOrEqual(prev); prev = e; }
  });
  it('alternatif ekleme: aynı gen dört ürün verir', () => {
    const all = [[false, false], [true, false], [false, true], [true, true]].map(([a, b]) => splice(a, b));
    expect(new Set(all.map((x) => x.exons.join('-'))).size).toBe(4);
    expect(all[3].len).toBe(210);
    expect(all[0].len).toBe(70);
    expect(all[3].exons).toEqual(['E1', 'E2', 'E3', 'E4']);
  });
});

describe('konformasyon', () => {
  it('olasılıklar toplamı 1; ligand yoksa bağlı durum yok', () => {
    const s = steady({ ...CONF_DEFAULT, lig: 'none' });
    expect(s.reduce((a, v) => a + v, 0)).toBeCloseTo(1, 8);
    expect(s[2] + s[3]).toBe(0);
    expect(confOut({ ...CONF_DEFAULT, lig: 'none' }).rate).toBe(0);
  });
  it('doğru molekül derişimle doyan bir hız verir; yanlış molekül çok daha az', () => {
    const r = (conc: number, lig: 'good' | 'like' = 'good') => confOut({ ...CONF_DEFAULT, lig, conc }).rate;
    expect(r(0.5)).toBeGreaterThan(0);
    expect(r(3)).toBeGreaterThan(r(0.5));
    expect(r(10)).toBeGreaterThan(r(3));
    expect(r(10) - r(3)).toBeLessThan(r(3) - r(0.5));
    expect(r(3, 'like')).toBeLessThan(r(3) * 0.25);
  });
  it('sıcaklık ve asitlik şekli bozar: 37 derece ve pH 7,4 en iyi, uçlarda hız düşer', () => {
    const rate = (temp: number, ph: number) => confOut({ ...CONF_DEFAULT, temp, ph }).rate;
    expect(envFactor(37, 7.4).m).toBeCloseTo(1, 2);
    expect(rate(37, 7.4)).toBeGreaterThan(rate(10, 7.4));
    expect(rate(37, 7.4)).toBeGreaterThan(rate(55, 7.4) * 3);
    expect(rate(37, 7.4)).toBeGreaterThan(rate(37, 4.5) * 2);
    expect(confOut({ ...CONF_DEFAULT, temp: 58 }).shape).toBeLessThan(0.05);
  });
  it('tek molekül benzetimi kararlı durum payına yaklaşır (tohumlu)', () => {
    const rnd = mulberry32(5);
    let s = 0, turns = 0;
    const occ = [0, 0, 0, 0];
    const T = 6000, dt = 0.05;
    for (let i = 0; i < T / dt; i++) { const r = stepConf(s, dt, CONF_DEFAULT, rnd); s = r.state; if (r.turn) turns++; occ[s]++; }
    const st = steady(CONF_DEFAULT);
    expect(occ[3] / (T / dt)).toBeCloseTo(st[3], 1);
    expect(turns / T).toBeGreaterThan(confOut(CONF_DEFAULT).rate * 0.8);
    expect(turns / T).toBeLessThan(confOut(CONF_DEFAULT).rate * 1.2);
  });
});

describe('alel frekansı', () => {
  const avg = (mode: Parameters<typeof fitness>[0], s: number, p0: number, N: number, runs = 60) => {
    const rnd = mulberry32(11);
    let sum = 0, fix = 0, lost = 0;
    for (let i = 0; i < runs; i++) { const r = runWF(p0, N, 200, fitness(mode, s), rnd); const e = r[r.length - 1]; sum += e; if (e === 1) fix++; if (e === 0) lost++; }
    return { mean: sum / runs, fix, lost };
  };
  it('yararlı varyant yayılır, zararlı elenir, nötr kalır ya da sürüklenir', () => {
    const good = avg('yararli', 0.1, 0.1, 500);
    const bad = avg('zararli', 0.1, 0.5, 500);
    expect(good.mean).toBeGreaterThan(0.5);
    expect(bad.mean).toBeLessThan(0.05);
    const neutral = avg('notr', 0, 0.5, 500);
    expect(neutral.mean).toBeGreaterThan(0.35);
    expect(neutral.mean).toBeLessThan(0.65);
  });
  it('küçük popülasyonda sürüklenme: nötr varyant daha çok sabitlenir ya da kaybolur', () => {
    const small = avg('notr', 0, 0.5, 20);
    const big = avg('notr', 0, 0.5, 1000);
    expect(small.fix + small.lost).toBeGreaterThan(big.fix + big.lost);
  });
  it('heterozigot avantajı dengeye götürür (p ~ 0,5)', () => {
    let p = 0.05;
    for (let g = 0; g < 400; g++) p = selectP(p, fitness('denge', 0.1));
    expect(p).toBeCloseTo(0.5, 2);
    const e = avg('denge', 0.2, 0.1, 500, 30);
    expect(e.mean).toBeGreaterThan(0.35);
    expect(e.mean).toBeLessThan(0.65);
  });
});
