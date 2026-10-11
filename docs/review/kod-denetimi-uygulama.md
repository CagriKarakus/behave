# Kod denetimi: uygulama günlüğü

Kaynak: `docs/review/kod-denetimi.md` (28 bulgu). Commit yapılmadı. Doğrulama: `npm run typecheck && npm test && npm run build` (89 test geçti), `scripts/verify.mjs` (Playwright, 390 ve 1280 px, gerçek 188 deneyli içerikle; tüm denetimler geçti), `node scripts/check-dist.mjs` (temiz).

## Paket büyüklüğü (O2)

| | Önce | Sonra |
|---|---|---|
| Ana JS (ilk açılış) | 223,45 kB (gzip 75,9) | 32,53 kB (gzip 11,5) |
| Ana CSS | 19,78 kB (gzip 4,8) | 15,85 kB (gzip 4,2) |
| Simülasyon parçaları (isteğe bağlı) | ana pakette | view 16,9 + 27,7 kB JS, 2,2 + 2,3 kB CSS, ortak kit 1,4 kB + 3,5 kB CSS |
| Bölüm ayrıntısı (isteğe bağlı) | ana pakette (JSON 160 kB, deneysiz) | 22 parça, toplam 540 kB (188 deney dahil), bölüm başına 3,9 ile 36 kB |
| `dist/` toplamı | 240 kB | 1184 kB (yerel yazı tipleri ~470 kB dahil, `.woff` yedekleri de var) |

Ana sayfa tek JS dosyası ister (verify'da doğrulandı). Her bölüme ~10 deney eklendikçe yalnızca o bölümün parçası büyür.

## Bulgular

| # | Durum | Not |
|---|---|---|
| K1 | Kapsam dışı | Bilerek dokunulmadı (PDF, `.gitignore`, git geçmişi). |
| Y1 | Uygulandı (zaten vardı) | İş akışında `workflow_dispatch` tetikleyicisi mevcut; dal adı ve `typecheck` adımı değiştirilmedi. O9 için yeni adımlar eklendi (aşağıda). |
| Y2 | Uygulandı | Yönlendirici `#/` ile başlamayan hash'leri (`#main`) rota saymaz (`isRouteHash`). Atlama bağlantısı artık `src/app.ts` kabuğunda ve tıklanınca `preventDefault` + `main.focus()`. İlk yüklemede başlığa odak çalınmaz, bu yüzden ilk Tab atlama bağlantısına gider (tarayıcıda doğrulandı); sonraki rotalarda başlığa odaklanma sürer. Testler: router, `app.test.ts`. |
| Y3 | Uygulandı | Çubuk `position: sticky; bottom: 0` ve `.sim` kutusu içinde; `fixed`, `--sim-bar-space` dolgusu, `hideBarWhenAway` ve `[data-away]` kaldırıldı. Açılışta görünmez, sim içinde ekranın altına yapışır, sim bitince bölüm metninin üstünde kalır (ekran görüntüleri: `ch02-390-bar.png`, `ch02-390-bar-end.png`). Çubuk DOM'da çiplerin altındadır; mobilde CSS `order` ile sona alınır. |
| O1 | Uygulandı | Masaüstünde çubuk diyagramın üstünde (çiplerin altında) ve panel kayınca üstte yapışır (`top: 0`); diyagramı örtmez (`bar.bottom` 492 <= `stage.top` 514). |
| O2 | Uygulandı | `scripts/content-plugin.ts` (Vite eklentisi, geliştirme ve derlemede çalışır): `content/chapters.json` tek kaynak; özet `virtual:behave-index`, ayrıntı bölüm başına `virtual:behave-chapter/<id>` (dinamik import, ayrı parça). Simülasyonlar `SimDef.load` ile dinamik import. Bölüm sayfası başlığı/gezintiyi özetten hemen çizer, ayrıntı ve sim gelince doldurur; sayfa değişirse bağlanmaz (iptal bayrağı). Yükleme hatasında mesaj gösterilir. Deney sayfası tüm bölüm ayrıntılarını paralel yükler. Eklenti için test: `scripts/content-plugin.test.ts` (özet ayrıntı sızdırmaz, bölünmüş sonuç = bölünmemiş normalizasyon). README güncellendi. |
| O3 | Uygulandı | `Scope.loop(fn, { root, onResume })`: IntersectionObserver ile ekran dışında rAF durur (tarayıcıda 0 rAF/500 ms), dönünce zaman damgası sıfırlanır. Duraklatılmışken ve girdi değişmemişken çizim atlanır (`dirty`; DOM değişimi 0 doğrulandı), eylemden sonra tek tam çizim. Reseptör SVG'si yalnızca kaydırıcı/çip değişince kurulur. `prefers-reduced-motion` için ayrıca bir şey yapılmadı: simülasyon kendisi içeriktir ve kullanıcı Duraklat ile durdurabilir. |
| O4 | Uygulandı | `fold()`: Türkçe küçük harf + `ı`→`i` + aksan temizleme, hem veriye hem sorguya. Gerçek veride "Wellesley" ve Türkçe büyük harfli aynı sorgu aynı sonucu verir. Test eklendi. |
| O5 | Uygulandı | `cleanDoi()` normalize aşamasında ve kart çiziminde; `https://doi.org/`, `dx.doi.org`, `doi:` önekleri temizlenir. Gerçek veride 157 DOI bağlantısı, çift önekli 0. |
| O6 | Uygulandı | `Page.ready` kartın bulunup bulunmadığını döndürür; bulunamazsa `scrollTo(0,0)`. Doğrulandı (`?deney=yok` → `scrollY` 0). |
| O7 | Uygulandı | Yeni jetonlar: `--control-border` (açık `#718096` ≥3,48:1, koyu `#617489` ≥3,53:1), `--eff-text`, `--gld-text`, `--red-text` (açık ≥4,97:1; koyu temada eski değerler). Çip, düğme, tema düğmesi, arama/select kenarları ve replikasyon rozetleri ile endokrin "Hormon" etiketleri bunları kullanır. `verify.mjs` her iki temada, iki genişlikte, sim sekmeleri ve açılmış deney kartlarıyla metin (≥4,5) ve kenar (≥3) kontrastını ölçer: 0 sorun (araç, eski değerleri bilerek bozunca yakalıyor). Not: kontrast hesabı bilinen zeminlerin üstünde; yarı saydam katmanlar ve opaklık <1 olanlar atlanır. |
| O8 | Uygulandı | 61 → 89 test. Eklenenler: kayıt anahtarlarının içerikte varlığı, 22 bölüm/benzersiz kimlik/bağlantı çözümü/deney kimlikleri, görünüm sabitleri (`INFO`, `SCEN`, `SLIDERS`, `RPRE`, `STRUCT`, `FOOT`) orijinal HTML ile `toEqual` (`constants.test.ts`), mount testinde IntersectionObserver `disconnect`, ekran dışı rAF iptali ve dinleyici ekle/kaldır sayımı, `app.test.ts` (rota → temizlik, `#main`, odak, `?deney=`, 404; `main.ts` `createApp`'a bölündü), DOI/fold/belirtilmemiş süzgeci, zaman şeridi uçları. Model eşdeğerlik testleri değişmeden geçiyor. |
| O9 | Uygulandı | `scripts/check-dist.mjs` (`npm run check:dist`): `.book/chapters/*.txt` ve `behave.txt`'ten rastgele uzun cümleler (tohum ayarlanabilir), harf/rakam normalizasyonuyla dist'in metin dosyalarında aranır; PDF/`.book` yolu da denetlenir; `.book` yoksa metin denetimi atlanır. Atıf/kaynakça satırları (et al., tırnaklı başlık, yıl) örneklemeden çıkarılır, çünkü içerik dosyası bunları yasal olarak atıf biçiminde taşır (ilk denemede 4 yanlış alarm verdi). `check-dist.test.ts` kaçışlı gömmeyi yakaladığını gösterir. İş akışına: `src` içinde `.book/`/`.pdf` başvurusu yok, `check-dist` adımı, `du` boyut bütçesi (2500 kB; yazı tipleri dahil). `vite.config.ts` içinde `server.fs.deny`. |
| D1 | Uygulandı | Eksen kaydırıcıları ayrı bir alt `Scope`; eksen değişince atılır, dinleyici birikmez. |
| D2 | Uygulandı | Aynı bölümde `?deney=a` → `?deney=b` sayfayı ve simülasyonu yeniden kurmaz (`focusExperiment`); testle doğrulandı. |
| D3 | Uygulandı | `history.scrollRestoration = 'manual'`; kaydırma konumu `history.state.y` içinde (120 ms ertelemeli `replaceState`). Geri/ileri/yenilemede içerik yüklenince geri gelir, bağlantıyla gidince en üsttedir (geri tuşunda 900 → 900 doğrulandı). Denetimdeki `popstate` bayrağı yöntemi, hash gezinmelerinde `popstate` davranışı tarayıcılar arası farklı olduğu için seçilmedi. |
| D4 | Uygulandı | `.stop .cards` masaüstünde `auto-fill, minmax(320px, 1fr)`, `max-width: 760px`; gruplar 3 sütun kaldı. |
| D5 | Uygulandı | Eksen en küçük/büyük durağı ve ±0,05 log içindeki işaretleri kapsar ("1 milyon yıl" artık Bölüm 10 noktasına sıkışmaz), 1 sn'den kısa ölçekler için `1 ms` işareti ve alt sınır, yakın noktalara 3 kademeli 4 px dikey kaydırma (`--lane`). Testli. |
| D6 | Kısmen | `matchMedia` değişiminde düğme etiketi güncellenir. Üç durumlu "sisteme dön" döngüsü eklenmedi: arayüz davranışını değiştiren tasarım kararı, denetimde isteğe bağlı denmişti. |
| D7 | Uygulandı | Süzgeçte "belirtilmemiş" seçeneği; testli. |
| D8 | Uygulandı | Dize sayılar (`"12"`, `"60"`, `"1998"`) sayıya çevrilir; durum `trim` + küçük harf; deney kimliği çakışmasında `-2`, `-3` eki; geliştirme modunda atılan kayıtlar için `console.warn`. Testli. |
| D9 | Uygulandı | `.brand` en az 44 px genişlik. |
| D10 | Uygulandı | Sim yükleme/bağlama `try/catch` içinde: hata olursa "Simülasyon yüklenemedi." ve konsola hata; diğer simler etkilenmez. |
| D11 | Uygulandı | `findChapter` silindi, `CONF_DOTS` `normalize.ts`'te tek, `Diagram.n` ve gereksiz `resettle` yayılımı kaldırıldı, BSO sayaç öğeleri bir kez sorgulanıyor. |
| D12 | Uygulandı | Her iki simde `aria-live` yalnızca görsel olarak gizli (`.sr-only`) bir bölgede; `Scope.announcer` kullanıcı eyleminden (tıklama/girdi) 1 sn sonra, metin değiştiyse yazar. Görünür `.say` metninden `aria-live` kaldırıldı. Ekran okuyucuyla denenmedi, DOM davranışı test edilmedi. |
| D13 | Uygulandı | Masaüstünde çipler `flex-wrap` (11 senaryonun tamamı görünür). |
| D14 | Uygulandı | `@fontsource-variable/bricolage-grotesque` (opsz), `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` (latin + latin-ext; Türkçe karakterler için) devDependency; `index.html`'den Google Fonts bağlantıları kaldırıldı. Konsol hatası yok. |
| D15 | Uygulandı | `docs/review/screens/` (6,6 MB) `git rm` ile silindi; `docs/screenshots/` 3,2 MB'den 0,5 MB'ye (14 PNG, 64 renge indirilmiş) yenilendi. `verify.mjs`: `CHROME_PATH` ya da bulunan Chromium, yoksa Playwright varsayılanı. Not: `kod-denetimi.md` içindeki `screens/...` bağlantıları artık ölü. |

## Diğer

- `tsconfig.json`: `allowImportingTsExtensions` (Vite yapılandırması yerel yükleyicide uzantısız içe aktarım uyarısı veriyordu; eklenti ve normalize.ts `.ts` uzantılı içe aktarılıyor).
- Yeni bağımlılıklar yalnızca yazı tipleri (devDependency); çalışma zamanı kodunda bağımlılık yok.
- `docs/review/kod-denetimi.md` değiştirilmedi.
- Doğrulama bittiğinde preview süreçleri kapatıldı.
