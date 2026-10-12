# Simülasyon çeviri kalıbı (TR + EN)

Her simülasyon klasörü (`src/sims/<id>/`) aynı kalıpla iki dilli yapılır. **Türkçe davranış ve çıktı bire bir aynı kalmalı:** mevcut testler (`model.test.ts`, `view.test.ts`, `equivalence.test.ts`…) hiç değiştirilmeden geçmeli.

## Dosyalar
| dosya | içerik |
|---|---|
| `text.tr.ts` | `export const TR = { … }` — simülasyonun **tüm** kullanıcıya görünen Türkçe metni (şu an `view.ts`/`model.ts`/`panel-*.ts`/`notes.ts` içinde dağınık). Tipi `Strings = typeof TR`. |
| `text.en.ts` | `import type { Strings } from './text.tr'; const EN: Strings = { … }; export default EN;` — aynı yapı, İngilizce. **Statik import edilmez**; kayıt defteri (`registry.ts`) yalnızca İngilizce modda dinamik yükler. |
| `text.ts` | `import { simText } from '../../i18n/sim-text'; import { TR } from './text.tr'; export const L = (): typeof TR => simText('<id>', TR);` |
| `notes.ts` / `notes.en.ts` | (varsa) tembel yüklenen notlar. `notes.en.ts` aynı biçimde bir nesne döndürür; `lazyNotes(scope, root, () => getLocale()==='en' ? import('./notes.en').then(m=>m.default) : import('./notes').then(m=>m.default))` ya da sim'in mevcut kalıbına uygun eşdeğeri. |
| `meta.ts` | `en: { title: '…', blurb: '…' }` eklenir (başlıklar `docs/i18n/ceviri-rehberi.md` tablosunda). |

## Kurallar
1. **Metni OKUMA ANINDA al.** `L()` yalnızca `mount()` içinde ya da modelin/yardımcıların çalışma anında çağrılır. Modül yüklenirken (üst düzey `const X = L().…` ya da üst düzey `const INFO = { … Türkçe metin … }`) metin hesaplama **yasak**: dil değişince bayat kalır. Yapı (koordinat, id, sayı) üst düzeyde kalabilir; metin `L()` üzerinden gelir.
2. **Dinamik cümleler** tam şablon fonksiyonu olur: `say: (p: number, who: string) => string`. Cümle parçalarını (`'engelliyor' : 'uyarıyor'`), ekleri (`'den/'e/'i`), `.toLowerCase()` ile cümle içine gömmeyi bırak; İngilizce'de farklı dilbilgisi gerektirir. Türkçe şablonun çıktısı eski kodla **karakter karakter aynı** olmalı.
3. **Sayı biçimi:** `src/i18n/fmt.ts` (`num(v,d)`, `pct`, `pct1`, `percent(str)`, `int`, `money`) veya `src/sims/ui.ts` (`pc`, `pc1`, `f1`, `f2`) kullan; yerel `.toFixed(…).replace('.', ',')` kopyalarını bunlara çevir (TR çıktısı aynı kalır). `₺` → `money()`; İngilizce `$`.
4. **Replikasyon/güven etiketleri:** `repBadge(status)` / `bookBox()` zaten çeviri yapar; iç anahtarlar (`'sağlam'` vb.) kodda **Türkçe kalır**. `bookBox` öğelerindeki `text`/`note` metni `L()`'den gelir.
5. **Ortak etiketler:** "Kitapta", "Model nasıl çalışıyor?" için `t('sim.book')`, `t('sim.how')` (`src/i18n/t.ts`). Tur adımları (`createTour`) kendi `title/text/look` metnini `L()`'den alır.
6. **Erişilebilirlik metinleri de çevrilir:** `aria-label`, `aria-valuetext`, `title`, `alt`, SVG `<text>`/`<title>`/`<desc>`, canlı bölge (`say`) metinleri.
7. **Metin uzunluğuna bağlı yerleşimler** (`name.length * 6.2` gibi) İngilizce uzunluklarla da bozulmamalı.
8. **Bilimsel terimler** `content/glossary.json` ile birebir; deney adları `content/en/<bölüm>.json` içindeki `name` alanlarıyla birebir aynı yazılır (örn. "Stanford Prison Experiment"). Bağlantı metinlerindeki bölüm/deney atıfları (`bookBox`) o dosyadaki ada ve yıla uymalı.
9. **Kitap cümlesi kopyalama yok;** Türkçeyi sadık çevir. Sayısal iddialar ve çekinceler ("kitaptan alınan", "ölçüm değildir") aynen korunur.
10. **Ortak dosyalara dokunma:** `src/i18n/*`, `src/sims/{registry,ui,tour,bar,kit}.ts`, `src/app.ts`, `src/pages/*`, `content/*`. Gerek duyarsan nedenini raporla; kendin değiştirme.
11. `reference/artifacts/*.html` ve `equivalence.test.ts` Türkçe kalır; bunlar metin sabitlerini (INFO/SCEN/SLIDERS…) Türkçe `TR` ile karşılaştırır — testler gerekiyorsa `import { TR } from './text.tr'` ile aynı değerleri okuyacak şekilde minimal uyarlanabilir (davranışı değiştirmeden).

## Kendi simülasyonunu doğrula
```
npx tsc --noEmit
npx vitest run src/sims/<id>          # Türkçe regresyon: hepsi geçmeli
npx vitest run src/sims/i18n.test.ts -t "<id>"   # İngilizce parite/sızıntı testi
```
`i18n.test.ts` şunları denetler: `meta.en` var; `text.en` ile `text.tr` aynı yapıda (anahtarlar, dizi uzunlukları, fonksiyon argüman sayısı); İngilizce metinde Türkçe'ye özgü harf yok; İngilizce modda `mount()` sonrası ve her düğme/sekme/çip tıklandıktan sonra görünür metin ve aria nitelikleri Türkçe harf, `undefined`, `NaN`, `[object` içermiyor.
