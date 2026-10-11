# Kod denetimi: Behave web uygulaması

Denetlenen sürüm: `cdd4f6d` (branch `claude/clever-rubin-4oqk3g`). Denetim sırasında başka bir süreç `0e4eb0f` commit'ini attı (içerik düzeltmeleri, `home.ts`'e bir satır, `app.css`'e bir satır). Bu commit bulguları değiştirmiyor. Yalnızca `src/pages/home.ts` içinde 37. satırdan sonraki satır numaraları 1 kaydı. Kodda hiçbir değişiklik yapılmadı.

Yöntem: kodu satır satır okudum. `npm test` (61/61 geçti) ve `npm run build` çalıştırdım. Yapıyı `vite preview` (4173) ile açtım. Deney sayfasını gerçek veriyle görmek için scratchpad'de örnek `experiments` alanı eklenmiş bir kopya derleyip 4174'te açtım; repo dosyalarına dokunmadım. Tarayıcıda Playwright/Chromium ile 390, 1000 ve 1280 px genişlikte gerçek tıklama, klavye ve geri tuşu etkileşimleri denedim. Ekran görüntüleri `docs/review/screens/` altında. Preview süreçleri iş bitince kapatıldı.

## Genel değerlendirme

Temel sağlam. İki model (`model.ts`) orijinal script'lerle birebir aynı ve eşdeğerlik testleri bunu gerçekten kanıtlıyor: orijinal HTML'deki ilk `<script>` `vm` içinde çalıştırılıyor ve sayılar `toEqual` ile karşılaştırılıyor. Görünümler orijinal davranışı sadakatle taşıyor. Senaryolar, kaydırıcılar, lezyon, sekmeler, hız ve duraklat aynı; metin sabitlerini script'le karşılaştırdım ve bilerek kaldırılan sim başlıkları dışında eksik metin yok. Port birkaç iyileştirme de ekliyor: `aria-pressed`, ok tuşuyla sekme gezintisi, `uid` önekli id'ler. Bazı şeyleri tarayıcıda ölçerek doğruladım:

- Sayfa geçişinde rAF, IntersectionObserver ve dinleyiciler temizleniyor: geri tuşu zinciri sonrası IO `obs 7 / disc 7`, ana sayfada rAF 0, tek `hashchange` dinleyicisi.
- XSS kaçışlaması doğru: `#/bolum/<img onerror>` metin olarak basılıyor.
- `localStorage` erişimi istisna atsa da sayfa çalışıyor.
- Yatay taşma yok.

En ciddi sorunlar koddan çok yayın tarafında:

1. Telifli PDF git geçmişinde izleniyor.
2. Pages iş akışı var olmayan `main` dalına bağlı.

Kod tarafındaki öne çıkan sorunlar şunlar:

- "İçeriğe geç" bağlantısı sayfayı 404'e çeviriyor.
- Mobildeki sabit alt çubuk bölüm metnini örtüyor.
- Masaüstündeki yapışkan çubuk diyagramı örtüyor.
- Paket büyüklüğünün yaklaşık %71'i `chapters.json`; deneyler gelince büyüyecek.

## Bulgu sayıları

| Önem | Sayı |
|---|---|
| Kritik | 1 |
| Yüksek | 3 |
| Orta | 9 |
| Düşük | 15 |

---

## Kritik

### K1. Telifli PDF git'te izleniyor; `.gitignore` onu dışlamıyor
- **Dosya**: repo kökü, `Robert M. Sapolsky - Behave_ ... .pdf` (commit `a80ae65 "Add files via upload"`, 17,9 MB); `.gitignore:1-3`.
- **Sorun**: PDF `git ls-files` listesinde, `git check-ignore` boş dönüyor. `.gitignore` yalnızca `.book/`, `node_modules/` ve `dist/` içeriyor. Repo şu an private (`gh api repos/CagriKarakus/behave` → `"private":true`), ama ücretsiz planda GitHub Pages yalnızca public repoda çalışır. Kullanıcı Pages için repoyu public yaptığı anda PDF hem HEAD'den hem geçmişten herkese açılır. `dist` denetimi bunu yakalayamaz, çünkü sızıntı Pages değil repo üzerinden olur.
- **Nasıl tetiklenir**: Settings → Change visibility → Public. Sonra `https://github.com/CagriKarakus/behave/blob/<sha>/Robert...pdf` indirilebilir hale gelir.
- **Düzeltme**:
  1. `git rm --cached "Robert M. Sapolsky - Behave_ The Biology of Humans at Our Best and Worst (2017, Penguin Press).pdf"`
  2. `.gitignore`'a `*.pdf` ve `.book/` satırlarını ekle (`.book/` zaten var).
  3. Geçmişten sil: `git filter-repo --invert-paths --path "Robert M. Sapolsky - Behave_ The Biology of Humans at Our Best and Worst (2017, Penguin Press).pdf"`, ardından tüm dallara `git push --force`.
  4. Repo public yapılmadan önce `git log --all -- '*.pdf'` boş dönmeli.
  5. Kaynağı yerel dosya olarak `.book/` altında tut.

## Yüksek

### Y1. Pages iş akışı hiç tetiklenmez: `main` dalı yok
- **Dosya**: `.github/workflows/deploy.yml:3-6`
- **Sorun**: Tetikleyici `push: branches: [main]`. Uzak repoda tek dal var: `claude/clever-rubin-4oqk3g` (bu aynı zamanda varsayılan dal; `gh api .../branches`). Ayrıca `has_pages: false`, yani Pages kaynağı "GitHub Actions" olarak açılmamış. `workflow_dispatch` ile varsayılan olmayan bir daldan çalıştırılırsa `github-pages` ortamının dal koruması dağıtımı reddedebilir (doğrulanmadı).
- **Nasıl tetiklenir**: Mevcut dala push et; Actions'ta çalışma oluşmaz.
- **Düzeltme**:
  1. Yayın dalını belirle (`main` oluşturup varsayılan yap ya da tetikleyiciyi `branches: [main, claude/clever-rubin-4oqk3g]` yap).
  2. Settings → Pages → Source: GitHub Actions.
  3. K1 çözülmeden repoyu public yapma.
  4. Ayrıca `npm run typecheck` adımı gereksiz: `npm run build` zaten `tsc --noEmit` çalıştırıyor. Biri kaldırılabilir.

### Y2. "İçeriğe geç" bağlantısı sayfayı 404'e çeviriyor; Tab sırası da onu atlıyor
- **Dosya**: `index.html:22` (`<a class="skip" href="#main">`), `src/lib/router.ts:6-17`, `src/main.ts:52`
- **Sorun**:
  - `href="#main"` bir `hashchange` tetikliyor. `parseHash('#main')` sonucu `notfound`. Bölüm sayfası, simülasyonla birlikte, "Sayfa bulunamadı" ile değişiyor.
  - Ayrıca `main.ts:52` her rotada `#page-title` başlığına odaklanıyor. Bu yüzden ilk Tab doğrudan içerikteki ilk denetime gidiyor ve atlama bağlantısı Tab ile hiç görünmüyor (ölçüm: ilk Tab → `chip Dinlenme`).
- **Nasıl tetiklenir**: `#/bolum/ch02` aç → atlama bağlantısına odaklan (Shift+Tab ile) → Enter. Sonuç: `{"hash":"#main","h1":"Sayfa bulunamadı","sims":0}`. Kanıt: `screens/skiplink-focused-1280.png`, `screens/skiplink-after-enter-1280.png`.
- **Düzeltme**:
  1. `router.ts` `startRouter` handler'ının başına şunu ekle: `const h = location.hash; if (h && !h.startsWith('#/')) return;`. Böylece `#/` ile başlamayan hash'ler sayfa içi çapa sayılır.
  2. `main.ts` içinde atlama bağlantısına tıklama dinleyicisi ekle: `e.preventDefault(); main.focus();`.
  3. Bunun için `router.test.ts`'e test ekle ("`#main` rota değiştirmez").

### Y3. Mobilde sabit alt çubuk bölüm metnini ve simülasyonun başını örtüyor
- **Dosya**: `src/sims/sim.css:3-6, 45-47`, `src/sims/kit.ts:62-69`
- **Sorun**: Çubuk `.sim` köküyle en az 1 px kesiştiği sürece görünüyor. Kökün sonunda 150 px'lik `padding-bottom` var. Sim ekrandan çıkarken ekranın alt 85 px'inde `.ch-rest` içeriği ("Temel kavramlar" kartları) kalıyor ve çubuk tam onun üstüne biniyor (`elementsFromPoint` sonucu: `P.say … DIV.concept`). Sayfa açılışında da sim'in tepesi 805. pikselde (görünüm yüksekliği 844) olduğu için çubuk hemen beliriyor ve özet ile sim başlığının bir kısmını örtüyor.
- **Nasıl tetiklenir**: 390×844 → `#/bolum/ch02` → sim'in alt kenarı ekranın 120. pikseline gelecek kadar kaydır. Kanıt: `screens/ch02-390-bar-covers-rest.png`, `screens/ch02-390-top.png`.
- **Düzeltme**: En basit ve sağlam çözüm, çubuğu mobilde de `position: sticky; bottom: 0` yapmak. Sticky çubuk `.sim` kutusunun dışına taşamaz, bu yüzden başka içeriği örtmez. `sim.css:45` içinde `position: fixed; left:0; right:0` yerine `position: sticky; bottom: 0; margin-inline: -16px` kullan. `--sim-bar-space` padding'ini 0 yap. Yalnız sim'in kendi alanında kalınca `hideBarWhenAway` gereksizleşir, onu ve `[data-away]` kurallarını kaldır. Fixed davranışı korunmak istenirse alternatif: IO'yu sim içeriğinin sonundaki bir nöbetçi öğeye bağla (`rootMargin: '0px 0px -150px 0px'`) ve çubuğu sim'in üst kenarı görünüm alanının üst yarısına gelince göster.

## Orta

### O1. Masaüstünde yapışkan çubuk ağ diyagramının alt satırını örtüyor
- **Dosya**: `src/styles/app.css:116`, `src/sims/sim.css:51-55`
- **Sorun**: 1280×900'de `.ch-sim` kendi içinde kayan bir kutu ve `.sim-bar` onun altına yapışıyor. İlk görünümde BLA/ITC/CeA alt yazıları ve VTA/NAcc satırı çubuğun altında kalıyor. Kullanıcı diyagramın tamamını ve çıktı çubuğunu aynı anda göremiyor. 1000 px'te de aynı durum var.
- **Nasıl tetiklenir**: `#/bolum/ch02`, 1280×900. Kanıt: `screens/ch02-1280.png`, `screens/ch02-1000.png`.
- **Düzeltme**: Masaüstünde çubuğu sticky `top` olarak tanımla ve diyagramın üstüne, çip satırının altına taşı. Ya da `.ch-sim` iç kaydırmasını kaldırıp yalnızca sim başlığı ile çubuğu sticky yap. Hızlı çözüm: `@media (min-width:960px)` içinde `.sim .sim-bar { position: static; }` ve çubuğu (TEMPLATE'te) `stage`'den hemen önce yerleştir.

### O2. Paket büyüklüğü: `chapters.json` JS'in yaklaşık %71'i; simülasyonlar statik import ediliyor
- **Dosya**: `src/content/index.ts:1`, `src/sims/registry.ts:1-2`
- **Sorun**: `dist/assets/index-*.js` 224 KB; JSON küçültülmüş haliyle 160 KB (`keyConcepts` 47 KB, `keyStudies` 36 KB, `simulationIdeas` 32 KB …). Yalnızca iki bölüm için örnek deney dosyaları (`.book/experiments-verified`) 60 KB. 22 bölüme yayılınca paket kabaca 0,5–1 MB olur ve hepsi ilk açılışta indirilip ayrıştırılır. Simülasyonlar `registry.ts`'de statik import ediliyor. 20+ simülasyonda tüm sim JS ve CSS'i ana sayfada yüklenir.
- **Nasıl tetiklenir**: `npm run build` çıktısı; `python3` ölçümü (yukarıdaki sayılar).
- **Düzeltme**:
  1. `SimDef.mount` alanını `load: () => import('./bir-saniye-once/view').then(m => m.mount)` yap. `chapter.ts`'de `await` ile bağla ve bağlama tamamlanmadan sayfa değişirse unmount edecek bir `cancelled` bayrağı kullan.
  2. İçeriği runtime'da yükle. `content/chapters.json`'u `public/` altına kopyalayan bir build adımı ya da `import url from '../../content/chapters.json?url'` + `fetch(url)` kullan. Ya da ana sayfa için yalnızca `id, kind, number, titleTr, titleEn, timescale, timescaleSeconds, confidence` alanlarını içeren bir özet JSON, bölüm başına ayrı JSON üret (`?url` ile).
  3. `README`'deki "yeni simülasyon" adımlarına dinamik import'u ekle.

### O3. Simülasyon döngüsü hiç durmuyor: duraklatıldığında da, ekran dışındayken de ekranı çiziyor
- **Dosya**: `src/sims/kit.ts:16-24`, `src/sims/bir-saniye-once/view.ts:323-338`, `src/sims/endokrin-eksen/view.ts:509-524, 410-432`
- **Sorun**: Ölçümler (390 px):
  - "Duraklat" açıkken 400 ms'de 24 rAF.
  - Sim ekran dışında, sayfanın en altındayken 500 ms'de 31 rAF.
  - Endokrin "Reseptör" sekmesinde `drawReceptor` her karede `innerHTML=''` yapıp yaklaşık 72 SVG düğümünü yeniden kuruyor (500 ms'de 30 rAF).

  Mobilde gereksiz pil ve CPU tüketimi demek. Orijinal de böyleydi, ama artık sim uzun bir sayfanın içinde. `prefers-reduced-motion` dikkate alınmıyor.
- **Düzeltme**:
  - `Scope`'a `pauseWhen(root)` ekle: IntersectionObserver görünmez dediğinde `cancelAnimationFrame`, görünür dediğinde yeniden `loop`. `last` zaman damgasını sıfırlamayı unutma.
  - Duraklatılmışken ve girdi değişmemişken çizimi atla (bir `dirty` bayrağı ile).
  - `drawReceptor` yalnızca `RC` değişince çalışsın: kaydırıcı ve çip dinleyicilerinden çağır, döngüden çıkar.

### O4. Deney araması Türkçe küçük harf dönüşümü yüzünden İngilizce adlarda bozuluyor
- **Dosya**: `src/pages/experiment.ts:59, 68`
- **Sorun**: Hem veri hem sorgu `toLocaleLowerCase('tr')` ile dönüştürülüyor. "Implicit" → "ımplicit" oluyor, kullanıcı "implicit" yazınca eşleşme bulunmuyor. Kitaptaki araştırmacı ve deney adlarının çoğu İngilizce.
- **Nasıl tetiklenir**: Deney verili yapıda `#/deneyler` → aramaya `implicit` yaz → `0 / 6 deney` (veride "Implicit Association Test (IAT)" var).
- **Düzeltme**: Ortak bir `fold` fonksiyonu yaz ve iki tarafa da uygula: `const fold = (s: string) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');`. Böylece "İ/I/ı/i" ve aksanlar eşitlenir. Test: `q='implicit'` → 1 sonuç.

### O5. DOI alanı tam URL ise bağlantı bozuluyor
- **Dosya**: `src/pages/experiment.ts:37`, `src/content/normalize.ts:59`
- **Sorun**: `href = https://doi.org/${s.doi}`. Veri `"doi": "https://doi.org/10.1037/…"` biçimindeyse sonuç `https://doi.org/https://doi.org/10.1037/…` oluyor ve metin `doi:https://doi.org/…` olarak görünüyor. İçerik üreticisi bu biçimi kolayca üretebilir.
- **Nasıl tetiklenir**: Deney verili yapıda kaynak bağlantısı. Kanıt: `screens/exp-ch02-deney-390.png` (audit log: `doi hrefs ['https://doi.org/https://doi.org/10.1037/…']`).
- **Düzeltme**: `normalize.ts` içinde `doi: cleanDoi(s.doi)` kullan. `cleanDoi = (v) => { const s = strOrNull(v); return s ? s.trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '') || null : null; }`. Bunun için `normalize.test.ts`'e test ekle.

### O6. `?deney=` hedefi bulunamazsa önceki sayfanın kaydırma konumu korunuyor
- **Dosya**: `src/main.ts:51`, `src/pages/chapter.ts:111-118`
- **Sorun**: `experiment` parametresi olan her rotada `scrollTo(0,0)` atlanıyor; kart bulunamazsa hiç kaydırma yapılmıyor. Kullanıcı yeni sayfanın ortasına iniyor.
- **Nasıl tetiklenir**: Ana sayfada 1500 px kaydır → `#/bolum/ch12?deney=yok` → `scrollY = 1500`. Kanıt: `screens/exp-missing-390.png`. Şu anki içerikte hiç deney olmadığı için mevcut her `?deney=` bağlantısı bu durumda.
- **Düzeltme**: `renderChapter` kartın bulunup bulunmadığını döndürsün (ör. dönen fonksiyona `found` özelliği ekle ya da `{ cleanup, focused }` döndür). `main.ts` içinde `if (!focused) window.scrollTo(0, 0)`.

### O7. Kontrast: replikasyon rozetleri ve denetim kenarlıkları WCAG eşiğinin altında
- **Dosya**: `src/styles/app.css:142-145` (rozetler), `src/styles/tokens.css` (`--line`), `src/sims/sim.css:14,16` (çip/düğme kenarı), `app.css:149` (filtre girdileri)
- **Sorun**: Açık temada `#ECEFF3` zemin üzerinde 12 px metin, eşik 4,5:1:
  - `repl-karışık` (`--eff #B77800`): 3,19:1
  - `repl-sağlam` (`--gld`): 3,94:1
  - `repl-tartışmalı` (`--red`): 4,46:1

  Denetim kenarlığı `--line` zemine karşı 1,34–1,46:1; WCAG 1.4.11'e göre 3:1 olmalı (çipler, düğmeler, arama/select kutuları). Hesaplama komutu raporda değil, denetim sırasında python ile yapıldı. Değerler yukarıda.
- **Düzeltme**: Rozet metnini `color: var(--ink)` yap ve rengi yalnızca kenar ile ikonda kullan. Ya da metin için ayrı koyu tonlar tanımla (ör. `--eff-text`; ≥4,5:1 olduğu ölçülerek). Denetim kenarları için `--control-border` jetonu ekle: açık temada ≥3:1 bir gri (ör. `#8794A3` civarı, ölçülmeli), koyu temada `#5A6B80` civarı. Bunu `.chip`, `.btn`, `.filters input/select` ve `.theme-btn` için kullan.

### O8. Eşdeğerlik testleri yalnızca modeli kapsıyor; görünüm ve yaşam döngüsü testleri sığ
- **Dosya**: `src/sims/*/equivalence.test.ts`, `src/sims/mount.test.ts`, `src/content/normalize.test.ts:33-36`
- **Sorun**:
  - Model eşdeğerliği gerçekten kapsayıcı: tüm senaryolar, lezyonlar, ara durumlar, `netInput`, endokrin için 4 eksen × 8 girdi × 120 adım ve değişken `dt`, reseptör 6⁵ ızgarası. Ama görünüme taşınan veri ve mantık test edilmiyor: `SCEN`, `SLIDERS`, `STRUCT`, `RPRE` sabitleri, `eff()` darbe mantığı, `applyScenario`, döngüdeki `DT` ve `6*speed` ölçeği. Ben elle karşılaştırdım ve şu an aynılar; gelecekteki bir düzenleme sessizce sapabilir.
  - `mount.test.ts` rAF'ı doğruluyor ama dinleyicilerin ve IO'nun kaldırıldığını doğrulamıyor. jsdom'da `IntersectionObserver` olmadığı için `hideBarWhenAway` dalı hiç çalışmıyor.
  - `main.ts` (rota → cleanup → render) hiç test edilmiyor; Y2 bu yüzden kaçtı.
  - `content/chapters.json` testi yalnızca `length > 0` diyor.
  - Kayıt defteri anahtarlarının (`ch02`, `app2`) içerikte var olduğu doğrulanmıyor. İçerik üreticisi kimliği değiştirirse simülasyon sessizce kaybolur.
- **Düzeltme**:
  1. Orijinal HTML'in ikinci script'inden `SCEN`, `SLIDERS`, `INFO`, `STRUCT`, `FOOT` ve `RPRE` dizilerini regex + `vm` ile çıkarıp TS sabitleriyle `toEqual` karşılaştıran bir test ekle. Bunun için sabitleri `view.ts`'den export et.
  2. `mount.test.ts` içinde `vi.stubGlobal('IntersectionObserver', FakeIO)` kullan ve unmount sonrası `disconnect` çağrıldığını doğrula. `addEventListener`/`removeEventListener` sayımını `window`/`document` üzerinde kontrol et.
  3. `main.ts`'i bir `boot(root)` fonksiyonuna böl ve jsdom'da `location.hash` değişimleriyle test et (`#/bolum/ch02` → `#/` ⇒ `.sim` sayısı 0; `#main` ⇒ rota değişmez).
  4. `normalize.test.ts`'e şunları ekle: gerçek içerik için "22 bölüm, id'ler benzersiz, `Object.keys(SIMS)` hepsi içerikte var, tüm `links[].to` çözülebiliyor (ya da bilinçli istisna listesinde)".

### O9. `dist` denetimi yalnızca dosya adına bakıyor; kitap metni JS'e gömülürse yakalanmaz
- **Dosya**: `.github/workflows/deploy.yml:31-33`
- **Sorun**: `find dist -iname '*.pdf' -o -path '*/.book*'` yalnızca dosya adını denetliyor. `.book/behave.txt` (1,9 MB tam metin) ya da `.book/chapters/*` bir gün `import x from '../../.book/…?raw'` ile içe aktarılırsa metin `index-*.js` içine gömülür ve kontrol geçer. Şu an `src` içinde `.book` importu yok (grep ile doğrulandı).
- **Düzeltme**: İş akışına iki adım ekle:
  1. `grep -rnE "\.book/|\.pdf" src && exit 1 || true`
  2. Boyut bütçesi: `test $(du -sk dist | cut -f1) -lt 1500 || { echo "dist beklenenden büyük"; exit 1; }`

  Ayrıca `vite.config.ts` içinde `server.fs.deny: ['.book', '**/*.pdf']` ekle.

## Düşük

### D1. Endokrin: eksen değiştirildikçe dinleyiciler birikiyor
- **Dosya**: `src/sims/endokrin-eksen/view.ts:198, 218-230, 361-373`
- **Sorun**: `setAxis` her çağrıldığında `buildAxSliders` yeni girdiler yaratıyor ve `scope.on` ile dinleyici ekliyor. Eski (DOM'dan çıkmış) girdiler `scope.offs` dizisinde tutuluyor; dizi unmount'a kadar her eksen değişiminde 2 eleman büyüyor. Unmount'ta temizleniyor, yani küçük ve sınırlı bir sızıntı.
- **Düzeltme**: Eksen kaydırıcıları için ayrı bir alt `Scope` tut (`let axScope = new Scope()`). `buildAxSliders` başında `axScope.dispose(); axScope = new Scope();` çağır. Ana `scope.onDispose(() => axScope.dispose())` ile bağla.

### D2. Aynı bölüm içinde başka bir deneye geçmek simülasyonu sıfırlıyor
- **Dosya**: `src/main.ts:34-43`
- **Sorun**: `#/bolum/ch02?deney=a` → `?deney=b` geçişinde tüm sayfa yeniden çiziliyor ve sim yeniden bağlanıyor. Kullanıcının kurduğu senaryo kayboluyor (ölçüm: `sim remounted true`).
- **Düzeltme**: `show()` içinde önceki rota da `chapter` ve `id` aynıysa yalnızca kart vurgusunu ve kaydırmayı güncelle. Bunun için `renderChapter`'ın dönüş değerine `focusExperiment(id)` metodu ekle.

### D3. Geri tuşunda kaydırma konumu geri gelmiyor
- **Dosya**: `src/main.ts:51`
- **Sorun**: Her rotada `scrollTo(0,0)` yapılıyor. Ana sayfada 1200 px aşağıdan bir bölüme girip geri dönünce konum 104 px oluyor (ölçüm). Uzun zaman şeridinde kullanıcı yerini kaybediyor.
- **Düzeltme**: `Map<string, number>` ile `history.state` yerine hash başına `scrollY` sakla. `hashchange` öncesi değeri kaydet (`show` başında `positions.set(prevHash, scrollY)`). Rota `popstate` kaynaklıysa saklanan değere dön; bunu `window.addEventListener('popstate', () => fromPop = true)` ile ayırt et.

### D4. Ana sayfa 1280 px'te üç sütunlu ızgarada tek kart; sağ üçte iki boş
- **Dosya**: `src/styles/app.css:62, 67`
- **Sorun**: Her durakta genellikle tek bölüm var. `repeat(3, …)` ile kart ekranın üçte birini kaplıyor ve geri kalanı boş kalıyor. Kanıt: `screens/home-1280.png`.
- **Düzeltme**: `.stop .cards { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); max-width: 760px; }` ya da duraklarda kartı başlık satırının yanına alan iki sütunlu bir düzen.

### D5. Zaman şeridi: "1 milyon yıl" işareti sıkıştırılıyor; noktalar mobilde üst üste biniyor
- **Dosya**: `src/pages/home.ts:30`, `src/lib/timeline.ts:37-40, 55`
- **Sorun**:
  - `maxLog = log10(3e13) = 13,48`, oysa 1 milyon yıl = 13,50. İşaret `+0,05` toleransla listeye giriyor ve `pos=1`'e kırpılıyor. Bu yüzden "1 milyon yıl" etiketi, aslında "≈951 bin yıl" olan Bölüm 10 noktasının üstünde duruyor.
  - 1 saniyeden kısa ölçekler (örn. milisaniye) 0'a kırpılıyor ve birbiriyle çakışacak.
  - 390 px'te Bölüm 6, 7 ve 8 noktaları üst üste biniyor (`screens/home-390.png`).
- **Düzeltme**: `maxLog = Math.max(...secs, ...AXIS_TICKS.map(t=>t.s))` ile en büyük işareti de kapsa ya da işaretleri `t.s <= max(secs)` ile süz. `minLog`'u `Math.min(0, log10(min secs))` yap. Çakışan noktalara 2–3 px dikey kaydırma ver.

### D6. Tema düğmesinin etiketi sistem teması değişince güncellenmiyor; "sisteme dön" seçeneği yok
- **Dosya**: `src/main.ts:24-30`, `src/lib/theme.ts`
- **Sorun**: Elle seçim yokken işletim sistemi koyu temaya geçerse sayfa koyulaşıyor ama düğme "Koyu tema" demeye devam ediyor (ölçüm: önce ve sonra "Koyu tema", arka plan `rgb(11,19,29)`). Elle seçim bir kez yapılınca sistem tercihine dönmenin yolu yok.
- **Düzeltme**: `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeBtn)` ekle. İsteğe bağlı olarak üç durumlu döngü kur (açık → koyu → sistem; sistemde `removeAttribute('data-theme')` ve `localStorage.removeItem`).

### D7. Deney süzgecinde "belirtilmemiş" seçeneği yok
- **Dosya**: `src/pages/experiment.ts:56, 59`
- **Sorun**: Replikasyon bilgisi olmayan deneyler `data-st="belirtilmemiş"` alıyor ama seçim listesinde yalnızca 4 durum var. Bu deneyler süzülemiyor; durum seçilince hepsi gizleniyor.
- **Düzeltme**: `<option value="belirtilmemiş">belirtilmemiş</option>` ekle ya da `replication` null olduğunda `data-st` değerini `bilinmiyor` yap.

### D8. `normalize.ts` kenar durumları
- **Dosya**: `src/content/normalize.ts:56, 63, 87-88, 93, 99`
- **Sorun**:
  - Dize olarak gelen sayılar (`"number": "12"`, `"timescaleSeconds": "60"`, `"year": "1998"`) sessizce `null` oluyor. Bölüm 12 numarasız kalıyor, `number >= 11` testi başarısız oluyor ve bölüm "Diğer" grubuna düşüyor.
  - Replikasyon durumu `"Sağlam"` ya da `" sağlam"` gibi büyük harfli veya boşluklu gelirse `bilinmiyor` sayılıyor.
  - Otomatik deney kimliği (`${chapterId}-e${i+1}`) aynı bölümdeki açık bir `id` ile çakışabilir ve `id="exp-…"` tekrarlanır.
  - `name`'i olmayan deneyler ve tekrarlayan bölüm kimlikleri uyarı vermeden atılıyor.
- **Düzeltme**:
  - `const num = (v) => typeof v === 'number' ? (Number.isFinite(v) ? v : null) : typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : null;` yaz ve `number`, `timescaleSeconds`, `year`, `book.year` için kullan.
  - Durumu `str(st).trim().toLocaleLowerCase('tr')` ile karşılaştır.
  - Kimlik çakışmasında `-2` soneki ekle.
  - Geliştirme modunda (`import.meta.env.DEV`) atılan kayıtları `console.warn` ile bildir.

### D9. Marka bağlantısı 390 px'te 22 px genişliğinde
- **Dosya**: `src/styles/app.css:3, 8`
- **Sorun**: Marka adı gizlenince tıklama hedefi 22×40 px kalıyor; WCAG 2.5.8 en az 24 px istiyor (audit: `{"t":"Davranış: ana sayfa","w":22,"h":40}`).
- **Düzeltme**: `.brand { min-width: 44px; justify-content: center; }`

### D10. Simülasyon bağlanırken hata atarsa sayfa yarım kalıyor
- **Dosya**: `src/pages/chapter.ts:107-110`, `src/main.ts:34-53`
- **Sorun**: `ref()` bulunamayan bir öğede `throw` ediyor. Bir sim'in `mount`'u hata atarsa `renderChapter` cleanup döndürmüyor, `main.ts`'te `cleanup` null kalıyor ve önceki sim'lerin döngüsü (aynı sayfada birden çok sim varsa) durdurulamaz. Doğrulanmadı; kod okumasından çıkarım.
- **Düzeltme**: `chapter.ts` içinde her `mount`'u `try { cleanups.push(sims[i].mount(host)); } catch (e) { console.error(e); host.textContent = 'Simülasyon yüklenemedi.'; }` ile sar.

### D11. Ölü ve tekrarlanan kod
- **Dosya ve sorunlar**:
  - `src/content/index.ts:6-7`: `findChapter` hiçbir yerde kullanılmıyor.
  - `src/sims/endokrin-eksen/view.ts:234`: `Diagram.n` yazılıyor ama okunmuyor.
  - `src/pages/home.ts:8` ve `chapter.ts:8`: `CONF_DOTS` iki kez tanımlı.
  - `view.ts:214`: `resettle` içindeki `{ ...A.u, drive: A.u.drive, meal: A.u.meal }` gereksiz (orijinalden geliyor).
  - `bir-saniye-once/view.ts:310`: `meter()` her karede altı kez `querySelector` yapıyor.
- **Düzeltme**:
  - `findChapter`'ı sil ya da `main.ts:41`'de kullan.
  - `CONF_DOTS`'u `normalize.ts` yanına ortak bir sabit olarak taşı.
  - Meter öğelerini döngü dışında bir kez sorgula.

### D12. Simülasyon açıklama cümlesi erişilebilirlik: BSO'da duyurulmuyor, endokrinde çok sık duyurulabilir
- **Dosya**: `bir-saniye-once/view.ts:95`, `endokrin-eksen/view.ts:148`
- **Sorun**: BSO'daki `.say` öğesinde `aria-live` yok, bu yüzden senaryo değişince ekran okuyucu bir şey duymuyor. Endokrinde `aria-live="polite"` var ve eksen çalışırken metin kendiliğinden değişip duyuruluyor. Ekran okuyucuyla doğrulanmadı.
- **Düzeltme**: İki sim'de de `aria-live="polite"` kullan, ama metni yalnızca kullanıcı eylemi (çip, kaydırıcı, lezyon) sonrası 1 sn içinde güncellenen ayrı, görsel olarak gizli bir canlı bölgeye yaz. Görünür metin her karede güncellenmeye devam edebilir.

### D13. Çip satırı masaüstünde yatay kaydırılıyor ama bunu belli eden bir işaret yok
- **Dosya**: `src/sims/sim.css:13`
- **Sorun**: 560 px'lik panelde 11 senaryonun yalnızca 4'ü görünüyor ve son çip "Pasif b" diye kesiliyor (`screens/ch02-1280.png`). Fareyle yatay kaydırma bariz değil.
- **Düzeltme**: `@media (min-width:960px) { .sim .chips { flex-wrap: wrap; overflow: visible; } }`

### D14. Harici Google Fonts isteği
- **Dosya**: `index.html:9-11`
- **Sorun**: Her ziyarette Google'a istek gidiyor (gizlilik/KVKK). Çevrimdışıyken font yükleme gecikmesi oluyor. Orijinal sim'ler de böyleydi.
- **Düzeltme**: Fontları `@fontsource/*` paketleriyle (ya da woff2 dosyalarıyla `src/assets/fonts`) yerelden sun.

### D15. Repo şişkinliği ve kırılgan doğrulama betiği
- **Dosya**: `docs/screenshots/` (3,2 MB izleniyor), `scripts/verify.mjs:7-10`
- **Sorun**: Her doğrulamada değişen PNG'ler commit'leniyor; bu denetimin ekranları da 6,6 MB ve başka bir süreç tarafından `0e4eb0f`'a commit'lendi. `verify.mjs` Chromium yolunu `/opt/pw-browsers/chromium-*` olarak sabit kodluyor ve CI'da çalışmıyor.
- **Düzeltme**: `docs/screenshots/` ve `docs/review/screens/`'i `.gitignore`'a ekle ya da yalnızca küçültülmüş birkaç görüntüyü tut. `verify.mjs` içinde `executablePath`'i `process.env.CHROME_PATH` varsa kullan, yoksa Playwright'ın varsayılanını kullan.

---

## Odak başlıklarına göre özet

- **Router**: `?deney=` ayrıştırma ve kodlama doğru (`experimentHref` `encodeURIComponent`, `URLSearchParams` çözüyor). Sorunlar: Y2 (`#main`), O6, D2, D3.
- **Unmount ve sızıntı**: Gerçek tarayıcıda doğrulandı. 4 ileri, 3 hash değişimi ve 8 geri adımından sonra ana sayfada rAF 0, IO `obs 7 / disc 7`, `hashchange` dinleyicisi 1. Tek küçük sızıntı D1.
- **normalize.ts**: Bozuk girdide çökmüyor (testli). Kenar durumları D8 ve O5'te.
- **Timeline log ölçeği**: Mantık doğru; uç durumlar D5'te.
- **Tema kalıcılığı**: Yeniden yüklemede korunuyor. `localStorage` istisna atsa da sayfa çalışıyor (`THEME no-storage … errors []`). Kusur D6.
- **XSS**: `html```` her değeri kaçışlıyor. `safeUrl` yalnızca `http(s)` kabul ediyor (`javascript:` testli). DOI önüne sabit `https://doi.org/` ekleniyor. 404 sayfasında `<img onerror>` metin olarak basılıyor (ölçüldü). Görünümlerdeki `innerHTML` yalnızca kod içi sabitlerle besleniyor. Sorun bulunmadı.
- **Port sadakati**: Modeller birebir aynı. Görünümlerde davranış farkı yok; eklenenler erişilebilirlik iyileştirmeleri, `uid` önekleri ve mobil/masaüstü çubuk davranışı (Y3, O1). Endokrin "Kan dolaşımı" yazısının mono fontla çizilmesi ve geri bildirim eğrisinin hormon adını kesmesi orijinalde de var.
- **Mimari**: Yeni simülasyon eklemek kolay (README'deki 4 adım net, `Scope`/`uid`/`ref` iyi soyutlamalar). Ölçeklenme sorunu O2'de.

## Ekran görüntüleri (`docs/review/screens/`)
- Sayfalar: `home-390.png`, `home-390-full.png`, `home-1280.png`, `home-1280-full.png`, `ch02-390*.png`, `ch02-1000.png`, `ch02-1280.png`, `app2-390*.png`, `app2-1280*.png`, `ch11-390*.png`, `ch11-1280.png`, `deneyler-390*.png`, `deneyler-1280.png`
- Bulgular: `skiplink-*.png` (Y2), `ch02-390-bar-covers-rest.png` ve `ch02-390-top.png` (Y3), `ch02-1280.png` (O1), `exp-ch02-deney-390.png` (O5), `exp-missing-*.png` (O6), `exp-deneyler-*.png` ve `exp-ch12-*.png` (scratch yapı, örnek deney verisiyle)
