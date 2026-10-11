# Behave: simülasyonlarla inceleme

Robert Sapolsky'nin *Behave* kitabını zaman ölçeklerine göre (bir saniye önceden evrime) gezen, interaktif simülasyonlu Türkçe bir inceleme uygulaması. Vite + TypeScript, framework yok.

## Komutlar
- `npm run dev`: geliştirme sunucusu
- `npm run build`: tip denetimi + `dist/` üretir
- `npm test`: Vitest (model testleri, orijinal HTML ile eşdeğerlik, sayfa/mount testleri)
- `npm run typecheck`: yalnızca tip denetimi
- Tarayıcı doğrulaması: `npm run build && npx vite preview`, ardından `PW=<playwright yolu> node scripts/verify.mjs` (ekran görüntüleri `docs/screenshots/`)

## Klasör yapısı
- `content/chapters.json`: içerik haritası (elle değiştirilmez; başka süreç üretir)
- `src/content/`: şema tipleri, `normalize.ts` (eski taslak ve yeni sürümle uyumlu, eksik alanlar boş sayılır; `ch2` -> `ch02`)
- `src/lib/`: router (hash), tema, zaman şeridi mantığı, güvenli HTML şablonu
- `src/pages/`: ana sayfa, bölüm sayfası, deneyler sayfası
- `src/styles/`: `tokens.css` (ortak renk/yazı jetonları, açık/koyu tema), `base.css`, `app.css`
- `src/sims/<isim>/model.ts`: UI'dan bağımsız model çekirdeği; `view.ts`: `mount(container) => unmount`
- `src/sims/registry.ts`: bölüm id -> simülasyonlar
- `reference/artifacts/`: orijinal tek dosyalık simülasyonlar (eşdeğerlik testinin kaynağı)

Yollar: `#/`, `#/bolum/ch02`, `#/deneyler`, `#/bolum/ch12?deney=ch12-e3`.

## Yeni simülasyon ekleme
1. `src/sims/<isim>/model.ts` içine saf modeli yaz ve test et (varsa orijinal HTML ile eşdeğerlik testi ekle).
2. `view.ts` içinde `mount(container: HTMLElement): () => void` yaz. `Scope` (`src/sims/kit.ts`) ile dinleyici ve `requestAnimationFrame` döngüsünü kaydet, dönen fonksiyonda `scope.dispose()` çağır. Kimlikler için `uid()` önekini, sorgular için `data-ref` kullan; global id kullanma. Stil: `.sim` taban sınıfı (`../sim.css`) + kendi `view.css` (kapsamlı sınıf).
3. `src/sims/registry.ts` içine bölüm id'siyle (`ch05`, `app1` ...) ekle.
4. `npm test && npm run build`.

## Yayın
`.github/workflows/deploy.yml` yalnızca `dist/` klasörünü GitHub Pages'e yükler. PDF ve `.book/` yayınlanmaz (workflow ayrıca denetler).
