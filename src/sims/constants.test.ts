// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractConst } from '../test/reference';
import { INFO, SCEN, SLIDERS } from './bir-saniye-once/view';
import { RPRE, STRUCT, FOOT } from './endokrin-eksen/view';

// Görünüme taşınan veri sabitleri (metinler, senaryolar, kaydırıcılar) orijinal HTML ile aynı kalmalı.
describe('görünüm sabitleri orijinal HTML ile aynı', () => {
  it('bir-saniye-once: INFO, SCEN, SLIDERS', () => {
    expect(INFO).toEqual(extractConst('bir-saniye-once.html', 'INFO'));
    const refScen = extractConst('bir-saniye-once.html', 'SCEN') as Array<{ id: string; name: string; u: object; lesion?: string[] }>;
    expect(SCEN.map((s) => ({ id: s.id, name: s.name, u: s.u, lesion: s.lesion ?? [] }))).toEqual(refScen.map((s) => ({ ...s, lesion: s.lesion ?? [] })));
    expect(SLIDERS).toEqual(extractConst('bir-saniye-once.html', 'SLIDERS'));
  });
  it('endokrin-eksen: RPRE, STRUCT, FOOT', () => {
    expect(RPRE).toEqual(extractConst('endokrin-eksen.html', 'RPRE'));
    expect(FOOT).toEqual(extractConst('endokrin-eksen.html', 'FOOT'));
    const refStruct = extractConst('endokrin-eksen.html', 'STRUCT') as Record<string, { chip: string; stages: unknown; note: string; pulse: string; series: unknown }>;
    expect(Object.keys(STRUCT)).toEqual(Object.keys(refStruct));
    for (const k of Object.keys(refStruct)) {
      const { chip, stages, note, pulse, series } = refStruct[k];
      expect({ chip: STRUCT[k as keyof typeof STRUCT].chip, stages: STRUCT[k as keyof typeof STRUCT].stages, note: STRUCT[k as keyof typeof STRUCT].note, pulse: STRUCT[k as keyof typeof STRUCT].pulse, series: STRUCT[k as keyof typeof STRUCT].series }).toEqual({ chip, stages, note, pulse, series });
    }
  });
});
