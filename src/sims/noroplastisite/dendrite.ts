// Basit dendrit ağaçları (SVG). Ağaç bir kez kurulur; uzunluk ve diken yoğunluğu değişince yalnızca
// öznitelikler güncellenir. Dallanma tohumlu RNG ile belirlidir.
import { svg } from '../kit';
import { mulberry32 } from '../rng';

interface Node {
  len: number;       // taban uzunluğu (px)
  ang: number;       // üst dala göre açı (radyan)
  order: number;     // 0 = gövde
  kids: Node[];
  path: SVGElement;
  spines: Array<{ t: number; side: number; r: number; el: SVGElement }>;
}

export interface TreeOpts {
  seed: number;
  /** Soma konumu ve ana dalların yönleri (radyan; -π/2 = yukarı). */
  x: number;
  y: number;
  roots: number[];
  /** Mertebeye göre taban uzunlukları. */
  lens: number[];
  /** Dallanma açısı (radyan) ve rastgelelik. */
  spread: number;
  /** Mertebe başına uzunluk duyarlılığı: ölçek = 1 + (s - 1) * w[order]. */
  w: number[];
  color: string;
  spinesPer: number;
  somaR: number;
}

export interface Tree { update: (lenScale: number, spineDensity: number) => void }

export function buildTree(parent: Element, o: TreeOpts): Tree {
  const rnd = mulberry32(o.seed);
  const g = svg('g', { class: 'tree', style: `--tc:${o.color}` }, parent);
  const nodes: Node[] = [];
  const mk = (len: number, ang: number, order: number): Node => {
    const path = svg('path', { class: `dn dn${Math.min(order, 3)}`, fill: 'none' }, g);
    const n: Node = { len, ang, order, kids: [], path, spines: [] };
    for (let i = 0; i < o.spinesPer; i++) {
      n.spines.push({ t: 0.15 + 0.8 * rnd(), side: rnd() < 0.5 ? -1 : 1, r: rnd(), el: svg('circle', { class: 'sp', r: 1.7 }, g) });
    }
    nodes.push(n);
    return n;
  };
  const grow = (n: Node): void => {
    if (n.order + 1 >= o.lens.length) return;
    const k = n.order === 0 ? 2 : (rnd() < 0.8 ? 2 : 1);
    for (let i = 0; i < k; i++) {
      const dir = k === 1 ? (rnd() - 0.5) * 0.5 : (i === 0 ? -1 : 1) * (o.spread * (0.7 + 0.6 * rnd()));
      const c = mk(o.lens[n.order + 1] * (0.8 + 0.4 * rnd()), dir, n.order + 1);
      n.kids.push(c);
      grow(c);
    }
  };
  const rootNodes = o.roots.map((a) => { const r = mk(o.lens[0] * (0.85 + 0.3 * rnd()), a, 0); grow(r); return r; });
  svg('circle', { class: 'soma', cx: o.x, cy: o.y, r: o.somaR }, g);

  const update = (s: number, dens: number): void => {
    const place = (n: Node, x: number, y: number, base: number, isRoot: boolean): void => {
      const f = Math.max(0.15, 1 + (s - 1) * (o.w[n.order] ?? 1));
      const ang = isRoot ? n.ang : base + n.ang;
      const L = n.len * f;
      const x1 = x + Math.cos(ang) * L, y1 = y + Math.sin(ang) * L;
      n.path.setAttribute('d', `M${x.toFixed(1)},${y.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)}`);
      for (const sp of n.spines) {
        const px = x + (x1 - x) * sp.t, py = y + (y1 - y) * sp.t;
        const nx = -Math.sin(ang) * sp.side * 3.2, ny = Math.cos(ang) * sp.side * 3.2;
        sp.el.setAttribute('cx', (px + nx).toFixed(1));
        sp.el.setAttribute('cy', (py + ny).toFixed(1));
        sp.el.setAttribute('display', sp.r < dens ? 'inline' : 'none');
      }
      for (const c of n.kids) place(c, x1, y1, ang, false);
    };
    for (const r of rootNodes) place(r, o.x, o.y, 0, true);
  };
  update(1, 1);
  return { update };
}
