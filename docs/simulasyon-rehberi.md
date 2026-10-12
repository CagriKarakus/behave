# Simülasyon tasarım rehberi

Hedef: **detaylı ama anlaşılır.** Okuyucu kitabın bir fikrini simülasyonla *kendisi keşfetsin*; ilk 30 saniyede ne yapacağını anlasın, sonra derinleşebilsin.

Örnek olarak mevcut iki simülasyona bak: `src/sims/bir-saniye-once/` ve `src/sims/endokrin-eksen/` (kullanıcının kendi tasarımları; dil, yoğunluk ve görsel üslup buradan gelir).

## 1. Anlaşılırlık katmanları (hepsi zorunlu)
Yukarıdan aşağıya bu sırayla:
1. **Soru** (`.lede`): simülasyonun cevapladığı tek soru, bir cümle. Ör. "Kaç kişilik bir çoğunluk, açıkça yanlış bir cevaba uymanı sağlar?"
2. **Rehberli tur** (`createTour` — `src/sims/tour.ts`): 4–6 adım. Her adım simülasyonu bir duruma getirir (`apply`), olanı 1–3 cümleyle anlatır (`text`) ve tek bir gözlem noktası verir (`look`, "Neye bak: ..."). İlk adım temel durum, son adım kitabın vardığı sonuç ya da en şaşırtıcı bulgu. Tur sırasında kullanıcı kaydırıcıları yine oynatabilir.
3. **Görsel sahne** (`.stage`): ana görsel. SVG diyagram, animasyonlu ajanlar, ızgara, kart, eğri — konuya en uygun olan. Rengin anlamı olsun ve lejantla açıklansın.
4. **Canlı açıklama çubuğu** (`.sim-bar`): durumu tek cümleyle anlatan `describe()` çıktısı + 2–3 ana gösterge (bar/sayı). Mevcut simülasyonlardaki gibi.
5. **Girdiler**: 3–6 kaydırıcı/çip; her birinin altında gündelik dilde bir ipucu (`.sl-hint`). Hazır senaryo çipleri (`.chips`) varsa onları da kullan.
6. **Ayrıntı (isteğe bağlı açılır)**: `<details>` içinde "Model nasıl çalışıyor?" — denklemi/kuralı sade dille, varsayımlar.
7. **Kitapta** kutusu: bu simülasyonun dayandığı deneyler, bölüm sayfasındaki karta bağlantıyla: `#/bolum/<ch>?deney=<deney-id>` (deney id'leri `content/chapters.json` → `experiments[].id`). Deneyin replikasyon durumu "tartışmalı" ya da "karışık" ise bunu kısa ve dürüstçe yaz.
8. **Dipnot** (`.foot`): "Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir." Kitaptan alınan sayılar varsa (Asch'ta denemelerin ~üçte biri, Milgram %65 vb.) hangilerinin kitaptan olduğunu belirt.

### Ortak yerleşim (hepsinde aynı sıra)
`.sim` içinde yukarıdan aşağıya: `.lede` → rehberli tur (`.tour`) → sekmeler (`.tabs` + `.tab`) ya da çipler → `.sim-bar` → `sr-only` canlı bölge → paneller (`.pane`) → "Model nasıl çalışıyor?" (`details.how`) → "Kitapta" (`aside.book`) → dipnot (`p.foot`).
- **Tur** `.lede`'nin hemen altındadır (tek tur sekmeleri de dolaşır). Sekmeler birbirinden bağımsız konulara bölünmüşse (ahlak, işbirliği) her panelin ilk öğesi o panelin kendi turudur.
- **Kitapta + dipnot** ya simülasyonun sonunda tek kez ya da her panelin sonunda bulunur (panel ayrı deneylere dayanıyorsa); her iki durumda sıra `how` → `book` → `foot`'tur.
- `.sim-bar` içeriği `p.say` + üç göstergeli `.meters`'tir. Mobilde ekranın altına yapışır; `src/sims/bar.ts` bölüm sayfası tarafından her simülasyona küçültme düğmesi ekler (tek satır metin; tercih oturumda hatırlanır). Simülasyon kodunda bir şey yapmak gerekmez.
- Sekme, panel, not, `how`/`more`, `book`, `rep` ve gösterge (`.meters`/`.m-top`) stilleri `sim.css` içindedir; kendi `view.css`'inde yeniden tanımlama.
- Meta: `title` kısa bir ad, `blurb` en çok ~60 karakterlik virgüllü liste (nokta ve iki nokta yok).

## 2. Detay
- Model gerçek bir mekanizma çalıştırsın (dinamik sistem, ajan tabanlı model, oyun kuramı turnuvası, olasılık hesabı...), sadece önceden yazılmış sonuçları göstermesin. Kullanıcı girdileri değiştirince sonuç modelden çıksın.
- Kitaptaki gerçek bulguları modelin kalibrasyon noktası yap (ör. Asch eğrisi 3 kişide belirginleşip ~6'da doyuma ulaşsın).
- Rastlantı varsa tohumlu RNG kullan: `import { mulberry32, shuffle, normal } from '../rng'` (ortak modül `src/sims/rng.ts`; kendi kopyanı yazma) — testler deterministik olsun; kullanıcıya "yeniden çalıştır" düğmesi ver.
- Zaman içinde gelişen süreçlerde küçük bir zaman grafiği ekle (mevcut simülasyonlardaki `.chart` üslubu).

## 3. Dil
- Türkçe, sade, kısa cümleler. Terimler: ilk geçtiğinde Türkçe + parantezde İngilizce (ör. "uyma (konformite)"). "frontal korteks" (asla "ön korteks").
- Kitaptan birebir alıntı yok; kendi cümlelerin.
- Kullanıcıya hitap: "sen" değil, nötr/öneri kipi ("Kaydırıcıyı artır", "Şuna bak").

## 4. Teknik kurallar
- Klasör: `src/sims/<isim>/` içinde `meta.ts` (`export const meta: SimMeta = { id, chapter, title, blurb, order }`), `model.ts` (saf, DOM yok), `model.test.ts` (Vitest; kitap bulgularını kalibrasyon testi olarak da yaz), `view.ts` (`export function mount(container: HTMLElement): () => void`), `view.css` (yalnızca kendi kök sınıfı altında kapsamlı).
- Kayıt otomatik (`registry.ts` `meta.ts` dosyalarını bulur). **Paylaşılan dosyalara dokunma**: `registry.ts`, `kit.ts`, `tour.ts`, `sim.css`, `bar.ts`, `rng.ts`, `ui.ts`, `src/styles/*`, sayfalar, `content/chapters.json`. Ortak bir yardımcıya ihtiyacın olursa kendi klasörüne koy ve son mesajında belirt. Hazır yardımcılar: `rng.ts` (tohumlu RNG), `ui.ts` (`slider`, `chips`, `bookBox`, `repBadge`, `lazyNotes`, biçimleyiciler).
- `Scope` (`kit.ts`) ile tüm dinleyiciler/döngüler; `scope.loop(frame, { root, onResume })` (ekran dışında durur). Duraklatılmışken ya da durum değişmiyorken her karede DOM'u yeniden kurma.
- Global id yok: `uid()` öneki, `data-ref` + `ref()`.
- Renkler yalnızca `src/styles/tokens.css` jetonlarından (açık/koyu tema). Metin kontrastı ≥ 4.5:1 (renkli metin için `--*-text` jetonları). Rengin yanında her zaman metin/şekil ipucu.
- Mobil öncelikli: 390 px'te yatay taşma yok, dokunma hedefleri ≥ 40 px; geniş ekranda simülasyon sağ panelde (≤ 560 px genişlik) gösterilir.
- Erişilebilirlik: kontrollerde etiket, SVG'de `role`/`aria-label`, `scope.announcer` ile kullanıcı eyleminden sonra özet duyurusu.
- Performans: JS parçası makul (≤ ~40 kB min; 45 kB'ı geçme), ajan sayısı mobilde akıcı kalacak düzeyde. Parça büyürse önce sayfa altı notlarını (`how` + `book` + `foot`) `data-notes` yer tutucularına `lazyNotes` (`ui.ts`) ile tembel yükle (örnek: `ahlak/notes.ts`, `noroplastisite/notes.ts`); yetmezse ilk açılmayan sekmeleri (panel + kendi turu) ayrı modüllere böl ve sekme ilk seçilince `import()` et (örnek: `savas-baris/panel-*.ts`, `noron/panel-*.ts`; testlerde `vi.waitFor`, unmount sırasında yükleme biterse hiçbir şey yazma).

## 5. Doğrulama (bitirmeden önce)
- `npm run typecheck && npm test && npm run build && npm run check:dist` temiz.
- Playwright (`/opt/node-tools/node_modules/playwright`, `scripts/verify.mjs`'e bak; `playwright install` ÇALIŞTIRMA): `npm run build && npx vite preview --port <benzersiz port>` ile `PW=/opt/node-tools/node_modules/playwright node scripts/verify.mjs http://localhost:<port>/` çalıştır (yeni `meta.ts` dosyaları otomatik taranır: her sekme ve tur adımında kontrast, taşma ve SVG etiket çakışması denetlenir); ayrıca ilgili bölümü 390 ve 1280 px'te aç; turu baştan sona tıkla, kaydırıcıları oynat, başka bölüme geçip döngünün durduğunu kontrol et; konsol hatası yok. Ekran görüntüsünü `docs/screenshots/sims/<isim>-390.png` ve `-1280.png` olarak kaydet (küçük tut). Preview sürecini kapat.

## 6. Hassas içerik (ırk, cinsiyet, sınıf)
Kitabın ele aldığı çalışmalar (ör. ırk ipucu ve amigdala, Correll ateş etme görevi, Kurzban yeniden kategorileştirme) aslına uygun modellenebilir. Kurallar:
- Çalışmanın kendi kategorilerini nötr, akademik dille kullan ("Siyah ve Beyaz yüzler", "kendi grubundan / başka gruptan").
- Figürler şematik, karikatürsüz ve saygılı olsun; ten tonu dışında stereotip özellik çizme.
- Bulgunun ne gösterdiğini ve ne göstermediğini açıkça yaz: otomatik, öğrenilmiş, bağlama duyarlı bir tepki; bilinçli tutum ya da doğuştan bir özellik değil. Kitabın vurguladığı gibi kategori yeniden çizilebilir.
- Replikasyon durumunu `content/chapters.json`'dan dürüstçe ver.
