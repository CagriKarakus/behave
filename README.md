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
- `reference/artifacts/`: orijinal tek dosyalık simülasyonlar (eşdeğerlik testinin kaynağı)

Yollar: `#/`, `#/bolum/ch02`, `#/deneyler`, `#/bolum/ch12?deney=ch12-e3`.

## Yeni simülasyon ekleme
1. `src/sims/<isim>/model.ts` içine saf modeli yaz ve test et (varsa orijinal HTML ile eşdeğerlik testi ekle).
2. `view.ts` içinde `mount(container: HTMLElement): () => void` yaz. `Scope` (`src/sims/kit.ts`) ile dinleyici ve `requestAnimationFrame` döngüsünü kaydet, dönen fonksiyonda `scope.dispose()` çağır. Kimlikler için `uid()` önekini, sorgular için `data-ref` kullan; global id kullanma. Stil: `.sim` taban sınıfı (`../sim.css`) + kendi `view.css` (kapsamlı sınıf).
3. `src/sims/<isim>/meta.ts` içinde `export const meta: SimMeta = { id, chapter, title, blurb, order }` yaz; kayıt otomatiktir (`registry.ts` `meta.ts` dosyalarını bulur, `view.ts` dinamik import edilir). Tasarım ve pedagoji kuralları: `docs/simulasyon-rehberi.md`; adım adım anlatım için `src/sims/tour.ts`. `Scope.loop(frame, { root, onResume })` kullan: sim ekran dışına çıkınca döngü durur. Çıktı çubuğu (`.sim-bar`) şablonda çiplerin hemen altına konur (CSS mobilde sona alıp yapıştırır). Ekran okuyucu için `scope.announcer` ile gizli bir canlı bölge besle.
4. `npm test && npm run build`.

## Yayın
`.github/workflows/deploy.yml` yalnızca `dist/` klasörünü GitHub Pages'e yükler (push ya da elle `workflow_dispatch`). PDF ve `.book/` yayınlanmaz: workflow dosya adı, kaynak kod ve `scripts/check-dist.mjs` ile denetler. Yazı tipleri `@fontsource` ile yerelden sunulur (harici istek yok).
