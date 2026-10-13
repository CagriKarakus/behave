# Behave: simülasyonlarla inceleme

Robert Sapolsky'nin *Behave* kitabını zaman ölçeklerine göre (bir saniye önceden evrime) gezen, interaktif simülasyonlu Türkçe bir inceleme uygulaması. Vite + TypeScript, framework yok.

## Komutlar
- `npm run dev`: geliştirme sunucusu
- `npm run build`: tip denetimi + `dist/` üretir
- `npm test`: Vitest (model testleri, orijinal HTML ile eşdeğerlik, sayfa/mount testleri)
- `npm run typecheck`: yalnızca tip denetimi
- `npm run check:dist`: `dist/` içinde PDF/`.book` yolu ve kitap metni (`.book/chapters/*.txt`'den rastgele uzun cümleler) arar; `.book` yoksa metin denetimini atlar
- Tarayıcı doğrulaması: `npm run build && npx vite preview`, ardından `PW=<playwright yolu> node scripts/verify.mjs` (Chromium yolu için `CHROME_PATH`; ekran görüntüleri `docs/screenshots/`, küçük bir set)

## Klasör yapısı
- `content/chapters.json`: içerik haritası, tek kaynak (elle değiştirilmez; başka süreç üretir). `scripts/content-plugin.ts` bunu derleme sırasında böler: ana pakete yalnızca küçük bir özet (`virtual:behave-index`: kimlik, ad, ölçek) girer; bölüm ayrıntısı (özet metin, kavramlar, deneyler...) bölüm başına ayrı parçada (`virtual:behave-chapter/<id>`) gerektiğinde yüklenir. Yeni bölüm ya da deney eklemek kod değişikliği gerektirmez
- `src/content/`: şema tipleri, `normalize.ts` (eski taslak ve yeni sürümle uyumlu, eksik alanlar boş sayılır; `ch2` -> `ch02`)
- `src/app.ts`: uygulama kabuğu ve yönlendirme (sayfa temizleme, odak, kaydırma konumu); `src/main.ts` yalnızca başlatır
- `src/lib/`: router (hash), tema, zaman şeridi mantığı, güvenli HTML şablonu
- `src/pages/`: ana sayfa, bölüm sayfası, deneyler sayfası (her biri `Page` döner: `dispose`, `ready`)
- `src/styles/`: `tokens.css` (ortak renk/yazı jetonları, açık/koyu tema), `base.css`, `app.css`
- `src/sims/<isim>/model.ts`: UI'dan bağımsız model çekirdeği; `view.ts`: `mount(container) => unmount` (dinamik import ile ayrı parçada yüklenir)
- `src/sims/registry.ts`: bölüm id -> simülasyonlar
- `src/sims/rng.ts` (tohumlu RNG), `src/sims/ui.ts` (kaydırıcı, çipler, "Kitapta" kutusu, replikasyon rozeti), `src/sims/bar.ts` (çıktı çubuğunu küçültme düğmesi), `src/sims/sim.css` (sekme, panel, not, gösterge, kutu stilleri): simülasyonlar arasında paylaşılan modüller
- `reference/artifacts/`: orijinal tek dosyalık simülasyonlar (eşdeğerlik testinin kaynağı)

İki dil: Türkçe (varsayılan, `#/...`) ve İngilizce (`#/en/...`; üst çubuktaki TR/EN düğmesi aynı sayfanın karşı dilini açar, tercih `localStorage`'da hatırlanır). Ayrıntı: [Çok dillilik](#çok-dillilik).

Yollar: `#/`, `#/bolum/ch02`, `#/deneyler`, `#/bolum/ch12?deney=ch12-e3`, `#/bolum/ch02?sim=ultimatum` (bölümde birden fazla simülasyon varsa sekmeli seçici; yalnızca seçili olan bağlanır, `?deney=` ile birlikte kullanılabilir).

## Yeni simülasyon ekleme
1. `src/sims/<isim>/model.ts` içine saf modeli yaz ve test et (varsa orijinal HTML ile eşdeğerlik testi ekle).
2. `view.ts` içinde `mount(container: HTMLElement): () => void` yaz. `Scope` (`src/sims/kit.ts`) ile dinleyici ve `requestAnimationFrame` döngüsünü kaydet, dönen fonksiyonda `scope.dispose()` çağır. Kimlikler için `uid()` önekini, sorgular için `data-ref` kullan; global id kullanma. Stil: `.sim` taban sınıfı (`../sim.css`) + kendi `view.css` (kapsamlı sınıf).
3. `src/sims/<isim>/meta.ts` içinde `export const meta: SimMeta = { id, chapter, title, blurb, order }` yaz; kayıt otomatiktir (`registry.ts` `meta.ts` dosyalarını bulur, `view.ts` dinamik import edilir). Tasarım ve pedagoji kuralları: `docs/simulasyon-rehberi.md`; adım adım anlatım için `src/sims/tour.ts`. `Scope.loop(frame, { root, onResume })` kullan: sim ekran dışına çıkınca döngü durur. Çıktı çubuğu (`.sim-bar`) şablonda çiplerin hemen altına konur (CSS mobilde sona alıp yapıştırır; küçültme düğmesini bölüm sayfası ekler). Rastlantı için `../rng`, ortak arayüz parçaları için `../ui` kullan; yerleşim sırası `docs/simulasyon-rehberi.md` içinde. Ekran okuyucu için `scope.announcer` ile gizli bir canlı bölge besle.
4. `npm test && npm run build`.

## Çok dillilik
- `src/i18n/`: `locale.ts` (dil durumu), `t.ts` + `messages.ts` (kabuk/sayfa/ortak sim metinleri; TR asıl, EN aynı anahtarlarla), `fmt.ts` (ondalık virgül/nokta, `%12` ↔ `12%`, para), `sim-text.ts` (sim İngilizce metin deposu), `links.ts` (İngilizce modda `#/...` bağlantılarını `#/en/...` yapar).
- Router: `#/en` öneki; rota parçaları (`bolum`, `deneyler`, `?deney=`, `?sim=`) iki dilde aynıdır, eski Türkçe bağlantılar çalışmaya devam eder. Kayıtlı tercih İngilizce ise yalnızca boş açılış (`#/`) İngilizce ana sayfaya yönlenir.
- İçerik: `content/chapters.json` Türkçe asıl kaynaktır. `content/en/<bölüm>.json` yalnızca **çevrilen alanları** taşır (yıl, DOI, atıf, replikasyon durumu vb. asıl kaynaktan gelir; sapma imkânsız). `scripts/content-plugin.ts` dil başına ayrı parçalar üretir (`virtual:behave-chapter-en/<id>`); yalnızca etkin dil indirilir. `src/content/overlay.ts` birleştirme kuralları.
- Bilimsel tutarlılık: `content/glossary.json` (terim sözlüğü, yasaklı varyantlar), deney adları `content/en/*.json` içinde literatürdeki adlarıyla, çeviri kuralları `docs/i18n/ceviri-rehberi.md`, emin olunmayanlar `docs/i18n/belirsiz-terimler.md`. `npm run check:i18n` (ya da `node scripts/validate-overlay.mjs`) bölüm katmanını denetler; `src/content/overlay.test.ts` ve `src/sims/i18n.test.ts` Vitest ile aynı kuralları uygular.
- Simülasyonlar: her klasörde `text.tr.ts` / `text.en.ts` (ayrı parça, yalnızca EN modda yüklenir) / `text.ts` (`L()`), `meta.en`; kalıp ve kurallar `docs/i18n/sim-cevirisi.md`. Türkçe test ve çıktılar değişmez.

## Yayın
`.github/workflows/deploy.yml` yalnızca `dist/` klasörünü GitHub Pages'e yükler (push ya da elle `workflow_dispatch`). PDF ve `.book/` yayınlanmaz: workflow dosya adı, kaynak kod ve `scripts/check-dist.mjs` ile denetler. Yazı tipleri `@fontsource` ile yerelden sunulur (harici istek yok).
