# TR → EN çeviri rehberi

Bu rehber hem bölüm içeriğinin (`content/en/<bölüm>.json`) hem de simülasyon metinlerinin (`src/sims/*/text.en.ts`) çevirisi için bağlayıcıdır.
Amaç: **bilimsel olarak tutarlı**, orijinal literatürle denk bir İngilizce. Süs, serbest yorum, kitap cümlesi kopyalama yok.

## Altın kurallar
1. **Sadece sözlük terimi.** Terimler `content/glossary.json` içindeki karşılıkla çevrilir. Sözlükte yoksa, Türkçe terimin yanındaki İngilizce parantezi (ör. "Amigdala (amygdala)") ya da literatürdeki standart ad kullanılır. Bulamazsan **uydurma**; `_uncertain` listesine yaz (aşağıda).
2. **Deney adları = literatürdeki ad.** "Milgram itaat deneyleri" → *Milgram obedience experiments*, "Stanford Hapishane Deneyi" → *Stanford Prison Experiment*, "Ultimatum oyunu" → *Ultimatum Game*. Deneyin özgün adını `sources[].citation` başlıklarından ve `docs/review/deney-dogrulama/grup-*.md` belgelerinden doğrula. Türkçe adın içindeki araştırmacı parantezi (örn. "(Greene ve ark.)") aynı biçimle korunur: *(Greene et al.)*.
3. **Sayılar, yıllar, yüzdeler, birimler, DOI/URL, atıf (`citation`) değişmez.** Yalnızca yazım biçimi İngilizceleşir: `%65` → `65%`, `12,5` → `12.5`, `1.000` (bin) → `1,000`, "bin" → "thousand", "milyon" → "million", "yıl" → "years", "sn" → "s".
4. **Ek bilgi ekleme, bilgi çıkarma yok.** Her cümlenin içeriği Türkçedekiyle denk olsun. Belirsizlik/çekince dili ("görünüyor", "olası", "tartışmalı") aynen korunur; bilimsel iddiayı güçlendirme ya da zayıflatma.
5. **Kitap cümlesini ezberden aktarma.** Metin zaten özgün anlatımdır; Türkçeyi sadık biçimde çevir.
6. **Üslup:** sade, akademik ama okunur İngilizce; kısa cümleler; Türkçedeki "sen" hitabı → *you* ya da nötr. İngiliz/Amerikan yazımı: Amerikan (*behavior*, *color*, *estrogen*).
7. **Tırnak:** Türkçedeki “ ” İngilizcede de “ ” (kıvrık) kalır; kesme işareti ’ ya da ' fark etmez ama aynı dosyada tutarlı ol.
8. **HTML/etiket varsa bozma** (`<b>`, `<a href=...>`, `&nbsp;`): yalnızca görünen metni çevir.

## Bölüm içeriği (content/en/<id>.json)
Kaynak: `content/chapters.json`. Bölümün tüm çevrilebilir alanlarını aşağıdaki biçimde yaz. **Dizi alanları aynı sırada ve aynı uzunlukta olmalıdır** (test denetler); deneyler `id` ile eşlenir.

```json
{
  "timescale": "One second before",          // yalnız Türkçede timescale olan bölümlerde; aşağıdaki tabloya uy
  "summary": "…\n\n…",                        // paragraflar \n\n ile ayrılır (Türkçedeki gibi)
  "keyConcepts":  [ { "term": "Amygdala", "explanation": "…" } ],   // Türkçedeki sırayla, aynı sayıda
  "keyStudies":   [ { "name": "…", "finding": "…" } ],              // yoksa alanı hiç yazma
  "simulationIdeas": [ { "title": "…", "shows": "…", "inputs": ["…"], "outputs": ["…"] } ], // inputs/outputs uzunlukları aynı
  "links":        [ { "why": "…" } ],                               // yalnız `why` çevrilir, sıra aynı
  "verifyNotes":  [ "…" ],                                          // yoksa yazma
  "experiments": {
    "ch02-e1": { "name": "…", "researchers": "…", "question": "…", "method": "…", "finding": "…",
                 "roleInChapter": "…", "caveats": "…",        // caveats null ise yazma
                 "replication": { "note": "…", "refs": ["…"] } } // refs uzunluğu Türkçeyle aynı; yalnız bağlaçlar ("ve"→"and", "ve ark."→"et al.") çevrilir
  },
  "_uncertain": [ "ch02-e5: 'Falan filan' adının literatürdeki karşılığından emin değilim; seçtiğim: '…' (neden: …)" ]
}
```
- `term` (keyConcepts): yalnız **İngilizce terim** (Türkçe + parantez biçimi değil). Parantezdeki Türkçe açıklayıcı ek yoksa terimin kendisi.
- `researchers`: isimler olduğu gibi; "ve ark." → "et al.", "ve" → "and".
- `replication.refs`: dizi uzunluğu aynı; atıf başlığını değiştirme.
- `sources` hiç yazılmaz (Türkçe kaynaktan gelir).
- `_uncertain` yalnızca gerçekten emin olunmayan adlar/terimler için; boşsa alanı yazma.

### Zaman ölçeği etiketleri (tüm bölümlerde bu ifadeler)
| bölüm | EN |
|---|---|
| ch02 | One second before |
| ch03 | Seconds to minutes before |
| ch04 | Hours to days before |
| ch05 | Days to months before |
| ch06 | Adolescence (roughly a decade ago) |
| ch07 | Childhood and the womb (decades ago) |
| ch08 | The moment of fertilization: when the genome forms |
| ch09 | Centuries to millennia ago |
| ch10 | Evolutionary time (roughly a million years ago and before) |

Bölüm başlıkları zaten `titleEn` olarak `chapters.json` içinde vardır; ayrıca yazma.

## Simülasyon metinleri
- Her simülasyon klasöründe `text.tr.ts` (mevcut metin, **bire bir aynı**) ve `text.en.ts` (İngilizce) bulunur; `meta.ts` içine `en: { title, blurb }` eklenir (başlıklar aşağıda).
- İngilizce metinde Türkçe'ye özgü harf (ı ş ğ İ) bulunmamalı (hata); ç/ö/ü yalnızca yabancı özel adlarda (Müller, Bergmüller) kalabilir (uyarı).
- Sayıların biçimi için ortak `src/i18n/fmt.ts` (`num`, `pct`, `pct1`, `percent`, `money`, `int`); Türkçe ondalık virgül/`%12`, İngilizce nokta/`12%`. `₺` → `$` (Sanfey ve ark. 2003).
- Replikasyon durumu/güven etiketlerinin iç anahtarları (`sağlam`, `karışık`, `tartışmalı`, `bilinmiyor`; `yüksek`/`orta`/`düşük`) **kodda Türkçe kalır**; görünen metin `t()` ile gelir.

### Simülasyon başlıkları (`meta.en`)
| id | title | blurb |
|---|---|---|
| ahlak | Morality and intuition | Trolley, public goods and punishment, dice and honesty |
| bir-saniye-once | The One Second Before circuit | Amygdala, frontal cortex and the dopamine network |
| biz-onlar | Us and Them | Minimal groups, recategorization, warmth–competence |
| cocukluk | Childhood and the womb | Marshmallow test, accumulating adversity, moral development |
| davranis | Same act, different meaning | Aggression map, context gate, displaced aggression |
| empati | Empathy: feeling and helping | Empathic distress and compassion, the target of help, giving and reward |
| endokrin-eksen | Endocrine axis | HPA, HPG and pancreatic axes, receptors, duration |
| ergen-beyni | The adolescent brain | Maturation timeline, driving with peers, bad news |
| gen-cevre | Genes and environment | Gene × environment table, heritability, MAO-A, height GWAS |
| hormon-baglam | Hormones and context | Testosterone, oxytocin and the stress curve |
| isbirligi-evrimi | The evolution of cooperation | Iterated prisoner's dilemma and Hamilton's rule |
| kultur-ekoloji | Culture and ecology | Patches and borders, rice versus wheat, culture of honor |
| metaforlar | Metaphors and sacred values | Body–morality confusion (with replication badges) and backlash over sacred values |
| noron | Neuron and synapse | Summation and threshold, synaptic transmission, inhibition circuits |
| noroplastisite | Neuroplasticity | Synapse (LTP/LTD), practice and maps, stress and dendrites |
| ozgur-irade | Responsibility and free will | Libet and veto, multifactorial prediction, punishment and satisfaction |
| protein | From gene to protein | Codon translation, mutation, gene regulation, protein shape |
| saniyeler-once | Influenced without noticing | Fast amygdala route, slow frontal brake, norm violations |
| savas-baris | War and peace | Live and let live in the trenches, contact and reputation, culture change in a baboon troop |
| sonsoz | Distribution, not the average | The fallacy of the average, the shifting us/them boundary, a map of the book |
| ultimatum | Ultimatum Game | Unfair offer: insula, amygdala, dlPFC |
| uyma-itaat | Conformity and obedience | The Asch line experiment and the Milgram voltage ladder |
| zaman-merdiveni | The time ladder | The causes of a behavior, the category-boundary fallacy |

## Doğrulama
`npm test` içindeki `content-parity.test.ts` / `glossary.test.ts` / `text-en.test.ts`: dizi uzunlukları, sızan Türkçe harf, yasaklı varyantlar, sayı/yıl bütünlüğü.
