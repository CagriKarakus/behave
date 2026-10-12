# Simülasyonlar: toplu gözden geçirme ve düzeltme günlüğü

Kapsam: ilk 14 simülasyon (`ahlak`, `bir-saniye-once`, `biz-onlar`, `cocukluk`, `endokrin-eksen`, `ergen-beyni`, `gen-cevre`, `hormon-baglam`, `isbirligi-evrimi`, `kultur-ekoloji`, `noroplastisite`, `saniyeler-once`, `ultimatum`, `uyma-itaat`) ve çalışma sırasında birleştirilen 5 yeni simülasyon (`empati`, `metaforlar`, `ozgur-irade`, `savas-baris`, `noron`; bunlar için ek kapsam bölümüne bak). `content/chapters.json`'a dokunulmadı.

Durum: **Yapıldı** / **Kısmen** / **Atlandı**.

## 1. `uyma-itaat`: `text.seat-t` kontrastı — Yapıldı

- Neden: harf, ajan renkli dolguluyken `fill: var(--bg)` ile çiziliyordu. Denetim betiği SVG metninin zeminini hep sayfa/sahne rengi saydığı için 1,09 buluyordu; gerçek kontrast açık temada kırmızı dolguda 4,46'ydı (yine de < 4,5), koyu temada 6,6.
- Düzeltme (`uyma-itaat/view.css`, `view.ts`): dolgu `color-mix(--amy|--pfc 24%, --panel)` açık bir tona, anlam rengi 2,6 px halkaya taşındı; harf her iki temada `--ink`. Ölçülen kontrast: açık 11,4 / 11,6, koyu 10,1 / 9,2 (yanlış / doğru). Lejant örnekleri de aynı biçime getirildi. Denek (koyu halka) ve müttefik (kesikli halka) ayrımı korundu.
- `scripts/verify.mjs` kontrast denetimi artık SVG'ye duyarlı: metnin ortasındaki noktada üstte kalan şekillerin dolgusu (saydamlık dahil) ya da ≥ 2 px'lik zemin renkli halo gerçek zemin sayılıyor. Bu yüzden önceden görünmeyen gerçek sorunlar da çıktı ve düzeltildi: `endokrin-eksen` "hücre yanıtı" (dolu amber hücre üstünde muted metin; halo + `--ink`), `kultur-ekoloji` `.nv` yüzdeleri (renkli çubuk üstünde muted; `--ink`), `saniyeler-once` `AMG/ACC` ve yüzde metinleri (halo).

## 2. Yapışkan `.sim-bar` — Yapıldı

- Sorun: mobilde çubuk 85-153 px (390×844'te %10-18) ve uzun sekmelerde kontrolleri örtüyordu.
- `src/sims/sim.css`: çubuk daha sıkı (padding 8 px); `.say` tek tanım (13 px, `min-height: 2.7em`; sim bazlı 4 em / 2,8 em ezmeleri kaldırıldı); mobilde `html:has(.sim-bar) { scroll-padding-bottom: 170px }` (odaklanan/kaydırılan kontrol çubuğun altında kalmıyor); göstergeler (`.meters`, `.m-top`) tek yerde, ≤ 480 px'te etiket üstte değer altta.
- `src/sims/bar.ts` (yeni): bölüm sayfası (`pages/chapter.ts`) simülasyonu bağladıktan sonra `.sim-bar`'a küçült/büyüt düğmesi ekler (40×40 px hedef, `aria-expanded`/`aria-controls`/`aria-label`). Küçültülünce yalnızca tek satırlık metin kalır (≤ 64 px), göstergeler gizlenir; tercih `sessionStorage`'ta (try/catch) tutulur. Host tarafında olduğu için mevcut ve **yeni eklenen her simülasyon** otomatik alır, simülasyon kodu değişmez. Çubuk simülasyon kutusunun sonunda yapışık kalmaya devam ediyor (bölüm metnini örtmez; masaüstünde yine üstte).
- Doğrulama: `verify.mjs` 390 px'te her simülasyonda çubuğun altta yapışık olduğunu, düğmenin küçültüp geri açtığını (boyut geri geliyor) ve `scroll-padding-bottom ≥ çubuk` olduğunu denetliyor.

## 3. Ortak tohumlu RNG — Yapıldı

- `src/sims/rng.ts`: `mulberry32`, `shuffle`, `normal`, `Rng` türü. Eski kopyalarla birebir aynı algoritma; `rng.test.ts` eski kopyadan alınan ilk değerleri (seed 1, 12345; `shuffle(…, 7)`) sabitliyor, yani testler aynı sayıları üretiyor.
- Silinen `rng.ts` kopyaları (13): ahlak, biz-onlar, cocukluk, hormon-baglam, kultur-ekoloji, noroplastisite, saniyeler-once, ultimatum ve sonradan birleşen empati, metaforlar, noron, ozgur-irade, savas-baris. Model dosyalarına gömülü kopyalar (4): ergen-beyni, gen-cevre, isbirligi-evrimi, uyma-itaat. `export { mulberry32 }` yeniden dışa aktarmaları (ahlak, biz-onlar, kultur-ekoloji, empati, metaforlar, savas-baris) kaldırıldı; tüm importlar `../rng`.
- Bilerek bırakıldı: `gauss` varyantları (biz-onlar `1 - r` biçimi dizileri değiştirir; gen-cevre/uyma-itaat `1e-12` sınırı `normal`'ın `1e-9`'undan farklı). Sayıları değiştirmemek için dokunulmadı.

## 4. `gen-cevre`: GWAS kalibrasyonu — Yapıldı

- Önce: log-normal σ = 2,0, 300.000 varyant. 2010 doğruydu (en güçlü %0,39, toplam %11,6, 341 varyant) ama 2022'de toplam **%59,1** (26.012 varyant); ch08-e10 replikasyon notu ve Yengo ve ark. 2022 yaklaşık %40-45 diyor.
- Yalnızca σ ile iki noktayı birden tutturmak olanaksız (2010 sağlanınca 2022 hep %55-60). Çözüm iki parametre: `SIGMA_LN = 2,05` ve `COMMON_SHARE = 0,72` (referans M = 300.000'de bulunabilir sayılan oran; kalan nadir varyantlarda/küçük etkilerde saklı, "eksik kalıtılabilirlik"; kitap da nadir varyantların kaçtığını belirtiyor). `foundFraction(M)` bu oranı 1 varyantta 1'den referans M'de 0,72'ye logaritmik indiriyor; böylece "tek gen" uçlarında en güçlü varyant payı ≤ toplam bulunan pay olmaya devam ediyor.
- Sonra: 2010 → 267 varyant, en güçlü %0,45, toplam %9,4; 2022 → 18.186 varyant, toplam **%43,1**.
- Testler (`gen-cevre/model.test.ts`): 2022 için >12.000 varyant ve toplam %40-46 aralığı, kalıtılabilirliğin (%80) çok altında kalma, `foundFraction` uçları ve `sum ≥ top` her M basamağında. Panel metinleri (`gwas-panel.ts`: not, dipnot, "Kitaptaki ayar" yorumu, "nasıl çalışıyor") yeni varsayımları anlatıyor; eski "model kitaptan yüksek çıkar" cümlesi kaldırıldı.

## 5. `cocukluk`: dinleyici birikmesi — Yapıldı

- Neden: "Kitaptaki eleştiriler" sekmesi (`moral-panel.ts` `buildCrit`) her değişimde kaydırıcı/çipleri yeniden kuruyor, dinleyiciler ana `Scope`'a ekleniyordu (unmount'a kadar birikiyordu).
- Düzeltme: her kurulumda ayrı bir `Scope`; yeniden kurulurken `dispose()`, ana kapsam kapanınca da bırakılıyor.
- Test (`cocukluk/mount.test.ts`): 33 sekme değişiminden sonra canlı dinleyici sayısı sabit, unmount'ta 0. Düzeltme olmadan test 105 ≠ 65 ile kırılıyor (doğrulandı).

## 6. İlk karede negatif `dt` — Yapıldı

`bir-saniye-once` ve `endokrin-eksen`: `Math.max(0, Math.min(0.1, …))`. Aynı kalıp `noroplastisite`, `ultimatum`, `uyma-itaat` karelerinde de vardı, onlar da düzeltildi (diğerlerinde zaten kıskaç vardı). Eşdeğerlik testleri (`model.ts`) değişmedi, geçiyor.

## 7. `ahlak` JS parçası — Yapıldı

49,25 kB → **44,15 kB** (`dist/assets/view-*.js`). Yöntem: üç sekmenin "Model nasıl çalışıyor?" + "Kitapta" blokları (~4,8 kB metin) `ahlak/notes.ts` olarak tembel yüklenen ayrı parçaya (4,3 kB) taşındı; her panelin sonundaki `data-notes` yer tutucusuna açılıştan hemen sonra yerleşiyor. Aynı kalıp ortak `lazyNotes` (`ui.ts`) olarak çıkarıldı ve `noroplastisite`'de de kullanıldı (aşağıda). "Kitapta" kayıtları ortak `bookBox` + `repBadge` ile yazıldı (replikasyon durumu artık rozet). Test: notlar gelir, erken unmount güvenli. Sekme başına bölme ahlak için denenmedi: görünüm tek kapanış içinde ortak durum ve turları paylaştığı için çok daha riskliydi; ağır olan `savas-baris` ve `noron`'da sekme başına bölme yapıldı (bkz. ek kapsam).

## 8. Tutarlılık ve ortak yardımcılar — Kısmen

Yapıldı:
- **Yerleşim sırası** (`docs/simulasyon-rehberi.md` "Ortak yerleşim"): lede → tur → sekmeler/çipler → `.sim-bar` → paneller → `details.how` → `aside.book` → `p.foot`. Tur `.lede`'nin altında: `ergen-beyni` ve `kultur-ekoloji` turu çubuğun altından taşındı. Sekmeler bağımsız konulara bölünmüşse (ahlak, işbirliği) her panelin kendi turu panelin başında kalıyor (kasıtlı, belgelendi).
- **Ortak CSS** (`sim.css`): sekmeler (`.tabs/.tab`), `.pane`, `.note`, `.how/.more`, `.book`, `.rep`, çubuk göstergeleri. 14 `view.css` içindeki ~190 satırlık kopya kaldırıldı. Çip biçimli sekmeler (`biz-onlar`, `ergen-beyni`, `kultur-ekoloji`, `saniyeler-once`, `uyma-itaat`) aynı `.tab` kalıbına geçti; `ck-meters/gc-meters/meters2` → `meters`.
- **"Kitapta" kutusu**: hepsi `aside.book > h3.sim-h + ul` (ahlak/hormon-baglam/ultimatum `section.book-list`, işbirliğinde `<p>` listesi vardı). `noroplastisite` ve `ahlak` `bookBox` ile üretiyor.
- **`src/sims/ui.ts`**: `slider` (+ `makeSlider`/`chips`/`chipRow` Ctx kısayolları), `bookBox`, `repBadge`, biçimleyiciler, `el`. `cocukluk/ui.ts` ve `gen-cevre/ui.ts` silindi; kaydırıcı gövdesi `isbirligi-evrimi`, `endokrin-eksen`, `biz-onlar`, `uyma-itaat`, `ahlak`, `hormon-baglam`, `noroplastisite` içinde ortak `slider`'a bağlandı (yerel imzalar korundu). Replikasyon rozeti `ergen-beyni`, `kultur-ekoloji`, `noroplastisite`, `ahlak`'ta ortak.
- **`meta.ts`**: tüm `blurb`'lar ≤ ~60 karakter, virgüllü liste, nokta/iki nokta yok; `ahlak` başlığı "Ahlak ve sezgi" (iki nokta kaldırıldı; testi güncellendi).
- Testler: `rng.test.ts`, `ui.test.ts`, `bar.test.ts`.

Atlandı / yapılmadı (gerekçe):
- `bir-saniye-once` ve `endokrin-eksen`'e rehberli tur ve "Kitapta" kutusu eklenmedi: kullanıcının kendi tasarımları (rehberin referansı); tur metni ve deney seçimi içerik kararı. Rehber ("hepsi zorunlu") ile fark bilinçli bir boşluk olarak duruyor.
- `saniyeler-once`, `bir-saniye-once`, `ergen-beyni`, `kultur-ekoloji`, `ultimatum` kaydırıcıları şablonda statik (`sl-top` HTML'de, değer metni `data-ref` ile bağlı) ya da alan↔konum dönüşümlü; ortak `slider`'a geçirmek davranışı değiştirebilirdi.
- `isbirligi-evrimi` `.det` (ayarlar açılır kutusu) ve `.formula` gibi sim'e özgü kutular ortaklaştırılmadı.
- "Kitapta" / dipnot kapsamı (tek, simülasyon sonunda ya da panel başına) sim'lere göre farklı kaldı; kural belgelendi (sıra hep `how` → `book` → `foot`).

## 9. 390 px görsel tarama — Yapıldı

Her simülasyon 390 px'te açıldı (üst ekran görüntüsü) ve `verify.mjs` her sekme ve tur adımında yatay taşma, ekran dışı etiket ve üst üste binen SVG metinlerini ölçtü (açık + koyu, 390 ve 1280). Düzeltilenler:
- `noroplastisite`: "Mg²⁺ tıkacı" etiketi NMDA etiketinin altında, tıkaçtan uzakta ve işaretsizdi; tıkacın yanına taşındı, kılavuz çizgisi eklendi. Hipokampüs dalları kartın kenarına 6 px kalıyordu (`lens` %12 küçültüldü; sol/sağ boşluk 17/12 px).
- `uyma-itaat`: Milgram sahnesi metinleri ("Şok vermeye devam eden: 100") sağdan kırpılıyordu (x 200 → 176); grafiğin "450 V" etiketi kırpılıyordu (sağa hizalı); Asch durum satırı "denek" etiketiyle çakışıyordu (satır aşağı, viewBox 258).
- `gen-cevre` (2 grafik) ve `hormon-baglam` (2 grafik): y ekseni başlığı "100" tikiyle çakışıyordu (üst boşluk 12-14 → 26-28).
- `biz-onlar`: tur 5'te "Yeni grup" etiketi "Evsizler" dairesinin üstüne biniyordu (konum 0,14/0,20 → 0,28/0,34; hâlâ düşük–düşük köşe, baskın duygu tiksinme).
- `endokrin-eksen`: aksın alt satırları kutudan taşıyordu (kısaltma 33 → 29 karakter).
- `ergen-beyni`, `kultur-ekoloji`, `saniyeler-once`, `endokrin-eksen`: SVG metin kontrastları (bkz. madde 1).

## Doğrulama aracı: `scripts/verify.mjs`

- Tüm simülasyonlar `src/sims/*/meta.ts`'ten otomatik taranır (yeni eklenenler dahil). Her biri 390 ve 1280 px'te, açık ve koyu temada, ilk durumda + her sekmede + her tur adımında kontrast (SVG'ye duyarlı), yatay taşma, SVG etiketi kırpılması/çakışması için gezilir; 390 px'te çıktı çubuğu denetimleri çalışır. `ONLY=sims` yalnızca bunu, `SIM=id,id` belirli simleri çalıştırır; `SHOTS=` ekran görüntüsü klasörü.
- Eski bir hata düzeltildi: "simülasyonsuz sayfa" denetimi (rAF durması, `.sim` kalmaması) `ch11`'i kullanıyordu ama `ch11`'de çoktan `biz-onlar` vardı (denetim 1280 px'te başarısızdı). Artık simsiz bölüm otomatik seçiliyor (`NOSIM`: `ch01`, `epilogue`, `app1`, `app3`, `intro` içinden simülasyonu olmayan ilk bölüm).

## Ek kapsam: çalışma sırasında birleştirilen 5 simülasyon

(a) **RNG**: `empati`, `metaforlar`, `noron`, `ozgur-irade`, `savas-baris` içindeki `rng.ts` kopyaları silindi, importlar `../rng`'e çevrildi (madde 3). Test sayıları değişmedi (tüm testler geçiyor).

(b) **JS parçası ≤ 45 kB** (ölçüm: `dist/assets/view-*.js`):

| Simülasyon | Önce | Sonra | Yöntem |
|---|---|---|---|
| `savas-baris` | 52,8 kB | **28,7 kB** | "Temas ve itibar" (15,9 kB) ve "Babunlar" (9,5 kB) sekmeleri ayrı parçalar: `panel-tem.ts`, `panel-bab.ts` (şablon + kod + kendi turu); ortak türler/yardımcılar `env.ts`. Sekme ilk seçilince `import()` ile gelir, gelene kadar "Yükleniyor…" notu görünür; `Env` nesnesi kabuğun kaydırıcı/geçiş/oynatıcı yardımcılarını verir. Kabuğun kaydırıcı gövdesi ortak `slider`'a bağlandı. |
| `noron` | 45,6 kB | **23,7 kB** | "Sinaps" (11,2 kB) ve "Devre" (11,9 kB) panelleri ve **turları** (`synTour`, `circTour`) kendi dosyalarında tembel; ilk sekme ("Toplama ve eşik") eşzamanlı. |
| `noroplastisite` | 45,2 kB | **41,1 kB** | "nasıl çalışıyor" + "Kitapta" + dipnot `notes.ts` (4,6 kB, `lazyNotes`). |
| `ozgur-irade` | 44,5 kB | 44,4 kB | Zaten ≤ 45; yalnızca kaydırıcı gövdesi ortak `slider`'a geçti. |
| `ahlak` | 49,3 kB | 44,1 kB | madde 7 |

Testler tembel parçalara uyarlandı (`vi.waitFor`) ve her biri için "erken unmount güvenli" testi eklendi (`savas-baris`, `noron`, `ahlak`). Ek sorun çıkmadı; `noron`'un yerel `ui.ts`'i (kendi `makeSlider` varyantı, `relatedBox`) olduğu gibi bırakıldı.

(c) **`verify.mjs` "simsiz sayfa" denetimi**: `ch11` (ve sonradan `ch14`) simli olduğundan başarısızdı; `NOSIM` ile simsiz ilk bölüme (şu an `ch01`) bağlandı (yukarıda).

(d) **`ozgur-irade` ch16-e5 kalibrasyonu**: kitabın "çok şeyi açıklamak ama az şeyi öngörmek" bölümünde (`.book/chapters/ch16.txt`) örnek sırayla şöyle ilerler: yalnızca serotonin taşıyıcı geni ≈%10; ebeveyn kaybı eklenince ≈%25; yoksullukta yalnız yaşam eklenince ≈%40 ("belki"); sonra glukokortikoid düzeyi ("biraz daha"), bireyci/toplulukçu kültür ("biraz daha") ve adet döngüsü ("biraz daha"; bu noktada "belki %50'nin bile üstü") eklenir. Yeterince etken eklenince öngörünün kırık kemik örneğindeki gibi %100'e yaklaşacağını, farkın miktarda değil nedensellik türünde olduğunu söyler. `chapters.json` ch16-e5 de aynıdır ("yüzde 50'nin üstüne çıkılabilir"; ağır frontal hasarda belirli sonuçların öngörülebilirliğinin %50'nin altında kalması ise kitabın ayrı bir pasajıdır). Modelde toplam **%48** idi ve altıncı etken kitapta olmayan "frontal hasar"dı; toplam bilerek %50'nin altında tutuluyor, metin "%50'nin altında kalıyor" diyordu, yani kitabın söylediğinin tersiydi. Düzeltme: altıncı etken **adet döngüsü** oldu; kortizol/kültür/adet payları %4 (toplam **%52**: beşinci etkende %48, altıncıda %50'nin üstü, kitaptaki sıra); gen sıfırlanınca toplam %42. Tur adımı ("Altısı bilinse de kesin değil"), "nasıl çalışıyor", "Kitapta" ve dipnot metinleri kitaba göre yeniden yazıldı (kitap ayrıca belirli davranış sonuçlarında öngörünün %50'nin çoğu zaman çok altında kaldığını söyler; model bunu modellemez, bu da metinde belirtildi). Testler: toplam %50-60 aralığında, `c[5] < 0,5 < c[6]`, etken kimlikleri, gensiz %42.

(e) **Mobil yapışkan çubuk, yeni 5 simde**: `bar.ts` düğmesi host tarafında olduğu için otomatik geldi; `verify.mjs` 390 px denetimi (altta yapışık, küçültme/büyütme, `scroll-padding-bottom`) artık 19 simülasyonun hepsini geziyor. Yeni simlerde ayrıca: tekrar eden CSS (`.tabs/.tab/.pane/.note/.how/.more/.book/.meters/.m-top`, ~70 satır) `sim.css`'e devredildi; `section.book > ul.book-list` → `aside.book > ul`; `empati` çip biçimli sekmeleri `.tab` oldu; `metaforlar` ve `ozgur-irade` kaydırıcı gövdeleri ortak `slider`'a bağlandı. Doğrulanan etiket çakışmaları düzeltildi: `metaforlar` ikinci sekme grafiğinde "100" tiki ile "destek %" başlığı (üst boşluk 16 → 28), `savas-baris` duyarlılık grafiğinde "tam karşılık"/"iki mermi" etiketlerinin eksen sayılarına binmesi (etiket y'si grafik alanına kıskaçlandı).
