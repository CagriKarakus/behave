# İçerik Denetimi: `content/chapters.json` (Behave, Türkçe içerik haritası)

Denetlenen dosya: `content/chapters.json` (22 kayıt). Kaynak: `.book/chapters/<id>.txt`.
Satır numaraları ilgili `.txt` dosyasına göredir. Alıntılar en fazla 10 kelimedir.
Bu rapor dosyayı değiştirmez; düzeltmeler aşağıda uygulanabilir metinle verilmiştir.

## 1. Genel değerlendirme

Harita genel olarak sağlam. Anılan çalışmaların neredeyse tamamı kitapta geçiyor ve sayılar çoğunlukla doğru aktarılmış: Milgram %65, Asch'ın üçte bir oranı ve 3/6 kişi eşiği, Schultz'un on kat ödül aralığı, %50 belirsizlik bulgusu, Caspi'deki üç kat artış, GWAS'taki %0,02 değeri, Henrich çalışmasında 25 kültür ve Hadza'nın %73 payı, Herrmann'ın Umman/Yunanistan bulgusu, Fry ve Söderberg'deki %86, Kidd'in 7R verisi, Cohn'un %20 bulgusu. MAO-A doğru bölümde, ch08'de duruyor. Uydurma bir çalışma bulunmadı.

Sorunlar şu türlerde yoğunlaşıyor:

- **Anlamı tersine çeviren birkaç aktarım hatası var.** Babun yer değiştirme saldırganlığı, Fehr'in TMS bulgusu ve Clark çalışmalarındaki "bebek bezi" çevirisi bunlara örnek.
- **Bazı ayrıntılar karışmış.** Macbeth çalışmalarında iki ayrı deney tek kayıtta birleşmiş. SHRP (stres yanıtının bastırıldığı dönem) ile Kohlberg açıklamaları bulanık kalmış.
- **Terimler tutarsız.** "Ön korteks", "önden gelen korteks" ve "ön lob" ifadeleri, uygulamanın genelinde kullanılan "frontal korteks" ile çelişiyor. Bazı `titleTr` alanlarına kitapta olmayan alt başlıklar eklenmiş.
- **`verifyNotes` alanları güncel değil.** Bu notların çoğu artık doğrulanmış durumda; bir kısmı ise yanlış. Örneğin ch02'deki Schultz notu ve "ergenlik bölümü numarasız" notu hatalı.
- **Zaman ekseninde bir veri tutarsızlığı var.** ch16 metin olarak bir zaman etiketi taşıyor ama saniye değeri null.

Telif: Sorun bulunmadı. Kitapla 5 kelime ve üzerinde örtüşen İngilizce dizilerin tamamı bölüm adları ve özel adlar (bkz. §4).

**Önem dağılımı: 3 yüksek, 16 orta, 32 düşük (toplam 51 bulgu).**

## 2. Bulgular

Biçim: **Bxx [önem] `JSON yolu`.** Ardından sorun, kanıt ve düzeltme verilir. Düzeltmede "→" işaretinden sonra gelen metin alana birebir yazılacak metindir.

### intro

**B01 [orta] `chapters[intro].summary`**
- Sorun: Kitabın kurgusunu taşıyan zaman merdiveni yöntemi özette yok. Yazar bunu "kitabın en önemli fikri" diye tanıtıyor ve uygulama da bu fikir üzerine kurulu. Açılış sahnesi ise belirsiz bırakılmış.
- Kanıt: intro.txt:201 "this is the most important idea in the book". intro.txt:11 "“Adolf Hitler,” I announce".
- Düzeltme:
  1. "bir açılış sahnesiyle" → "yazarın Hitler'i yakalayıp cezalandırma fantezisiyle"
  2. Son cümleden ("Son olarak insanın…") önce şu cümleyi ekle: "Kitabın yöntemi de burada kurulur: bir davranışın nedenleri, bir saniye önceki beyin olaylarından hormonlara, çocukluğa, genlere, kültüre ve evrime uzanan bir zaman merdiveninde aranır; yazara göre kitabın en önemli fikri, bu basamakların ayrı kutular olmadığı, her açıklamanın kendinden öncekilerin hepsini içerdiğidir."

**B02 [orta] `chapters[intro].keyStudies[1].finding`**
- Sorun: Moniz'in kitaptaki asıl rolü eksik. Kitap onu lobotomiye (frontal lökotomi) ve 1949 Nobel'ine bağlıyor; bu bilgi kayıtta yok.
- Kanıt: intro.txt:264-265 "Nobel Prize in 1949 for his development of frontal leukotomies".
- Düzeltme: "Moniz sinaptik ayarlamayla zihinsel bozuklukların tedavi edilebileceğini öne sürmüş" → "Moniz zihinsel bozuklukları 'sinaptik ayarlamaları' değiştirerek düzeltme iddiasıyla frontal lökotomiyi (sonradan lobotomi) geliştirip 1949'da Nobel almış"

### ch01

**B03 [yüksek] `chapters[ch01].keyStudies[1].finding`**
- Sorun: Babun örneği ters aktarılmış. Kitapta yenilen beta erkek kaçmıyor, en alttaki erkeğe saldırıyor. Yer değiştirme saldırganlığının özü de budur.
- Kanıt: ch01.txt:66-67 "loses a fight to the alpha, and he chases the omega male".
- Düzeltme: "düşük sıradaki bir babun üstünlerinden kaçar" → "alfa erkeğe yenilen beta erkek babun, en alttaki (omega) erkeği kovalar"

### ch02

**B04 [yüksek] `chapters[ch02].keyStudies[2].finding`**
- Sorun: Fehr çalışmasının anlamı tersine çevrilmiş. "İleride daha iyi teklif umuduyla" yapılan şey, normalde kötü teklifi reddetmektir. dlPFC susturulunca katılımcılar bu reddi yapamıyor. Bu bulgu ch02'deki "Ultimatum Oyunu" simülasyonunun da temeli.
- Kanıt: ch02.txt:1019-1021 "accepted lousy offers that they’d normally reject in the hopes". ch02.txt:1023-1024 "rated lousy offers as being equally unfair".
- Düzeltme: İlk cümle → "dlPFC geçici olarak susturulduğunda katılımcılar, normalde ileride daha iyi teklif almak umuduyla reddedecekleri kötü teklifleri dürtüsel biçimde kabul etti." Sona şu cümleyi ekle: "Kötü teklifleri kontrol grubu kadar adaletsiz bulmaya devam ettiler; sorun adalet yargısında değil, bu yargıyı uygulamadaydı."

**B05 [orta] `chapters[ch02].keyStudies[5].name` ve `chapters[ch02].verifyNotes[1]`**
- Sorun: %50 belirsizlik bulgusu metinde açıkça Schultz grubuna atfediliyor; Knutson'ın katkısı yalnızca medial PFC bulgusu. verifyNote ise tersini iddia ediyor ve yanlış.
- Kanıt: ch02.txt:1512 "Schultz’s group has shown that the magnitude of an anticipatory". ch02.txt:1520 "only 50 percent of the time". ch02.txt:1539-1541 "work from Knutson’s group shows ... medial PFC".
- Düzeltme:
  - name → "Schultz grubunun ödül olasılığı deneyleri"
  - finding'deki ikinci cümlenin sonuna ekle: "Knutson'ın grubu ise ödül olasılığı arttıkça medial PFC etkinliğinin arttığını gösterdi."
  - `verifyNotes[1]` silinsin.

**B06 [düşük] `chapters[ch02].keyStudies[1]`**
- Sorun: Ultimatum Oyunu bulgusu genel olarak "amigdala hasarı" için verilmiş. "BLA hasarı" ifadesi ise güven oyunundaki alıntıya ait.
- Kanıt: ch02.txt:516-517 "People with damaged amygdalae are atypically generous". ch02.txt:524-525 "generosity in the trust game of our BLA-damaged".
- Düzeltme:
  - name → "Amigdala hasarlı bireylerle Ultimatum Oyunu"
  - finding sonuna ekle: "Bazolateral amigdala hasarlı bireylerin güven oyunundaki cömertliğini yazarlar 'patolojik özgecilik' olarak niteler."

**B07 [düşük] `chapters[ch02].summary`**
- Sorun: Bölümün frontal korteks için tekrar ettiği ana formül özette yok.
- Kanıt: ch02.txt:1240-1241 "it makes you do the harder thing when that is the right thing".
- Düzeltme: Son cümleden önce ekle: "Yazarın frontal korteks için formülü şudur: doğru olan daha zor olduğunda, o zor şeyi yaptırır."

### ch03

**B08 [düşük] `chapters[ch03].keyStudies[0].finding`**
- Sorun: "Erken ERP yanıtlarının oranı" ifadesi belirsiz. Kitap P200/N200 oranını anlatıyor.
- Kanıt: ch03.txt:178-180 "The greater the P200/N200 ratio".
- Düzeltme: → "Silah ya da cep telefonu tutan kişilerin hızla gösterildiği ve yalnızca silahlılara ateş edilmesinin istendiği görevde, beyaz katılımcılarda siyah yüzler daha güçlü bir P200 (tehdit) ve daha zayıf bir N200 (frontal 'dur, bir düşün') dalgası üretti; P200/N200 oranı büyüdükçe silahsız bir siyah kişiyi vurma olasılığı arttı."

**B09 [düşük] `chapters[ch03].keyStudies[5]`**
- Sorun: "Kısa süre" ifadesi yanlış; çalışma günler sürdü (ch11'e göre iki hafta). Etki yalnızca Hispanik göçmenlere yönelikti.
- Kanıt: ch03.txt:395 "for a number of days". ch03.txt:399-400 "toward Hispanic (but not other) immigrants".
- Düzeltme:
  - name → "Tren istasyonu deneyi (Boston banliyöleri)"
  - finding → "Beyazların çoğunlukta olduğu Boston banliyölerinde, muhafazakâr giyimli Hispanik çiftlerin günlerce tren istasyonlarında sessizce İspanyolca konuşması, beyaz yolcuların Hispanik (diğer gruplara değil) göçmenlere karşı daha dışlayıcı tutumlar bildirmesine yol açtı."

**B10 [düşük] `chapters[ch03].keyStudies[4].finding`**
- Sorun: Cümle bozuk ("Tanık sayısı ve olayın tümü görülmediği için…") ve kitabın ayrımı eksik.
- Kanıt: ch03.txt:414-416 "the number was less than thirty-eight". ch03.txt:425-426 "in dangerous situations, the more people present".
- Düzeltme: → "1964'teki 'otuz sekiz tanık hiçbir şey yapmadı' anlatısı gerçeği yansıtmıyor: tanıklar daha azdı, kimse olayın tamamını görmedi ve pencereler kapalıydı. Seyirci etkisi tehlikesiz durumlarda görülür; tehlikeli acil durumlarda kalabalık büyüdükçe müdahale olasılığı artar."

### ch04

**B11 [düşük] `chapters[ch04].keyStudies[1].finding`**
- Sorun: "İnanç, gerçek hormondan daha güçlü etkiledi" diye bir karşılaştırma kitapta yok; abartılmış.
- Kanıt: ch04.txt:242-243 "Subjects who believed it was testosterone ... made less generous offers".
- Düzeltme: "inanç, davranışı gerçek hormondan daha güçlü biçimde etkiledi" → "yani bencil davranışı hormonun kendisi değil, hormonun etkisine dair inanç doğurdu"

**B12 [düşük] `chapters[ch04].keyStudies[3].finding`**
- Sorun: Koşul eksik (yüksek finansal risk) ve isim deneyi bulanık anlatılmış.
- Kanıt: ch04.txt:540-541 "oxytocin made them more likely to preemptively stab".
- Düzeltme: → "Oksitosin takım içi cömertliği artırdı; ancak finansal risk yüksekken karşı takımdan oyuncuya Mahkûm İkilemi'nde önleyici ihanet olasılığını da artırdı. İkinci çalışmada oksitosin Orta Doğulu ve Alman dış gruplara karşı örtük önyargıyı büyüttü ve katılımcıları Hollandalı isimli kişiyi (Dirk, Peter) feda etmeye daha isteksiz yaptı."

**B13 [orta] `chapters[ch04].links[3]` (to: ch09)**
- Sorun: Bağlantı dayanaksız. ch09 metninde "oxytocin" hiç geçmiyor. Oksitosin ile iç grup kayırmacılığı ch11'de işleniyor.
- Kanıt: `grep -i oxytocin ch09.txt` → sonuç yok. ch11.txt:58 "Oxytocin exaggerates Us/Them-ing."
- Düzeltme: Kaydı şununla değiştir: `{"to": "ch11", "why": "Oksitosinin iç grubu kayırıp dış gruba karşı önyargıyı büyütmesi, ch11'de Biz/Onlar ayrımının biyolojisi olarak yeniden ele alınır."}`

### ch05

**B14 [düşük] `chapters[ch05].keyStudies[4].finding`**
- Sorun: "Eski bir fikir" ifadesi belirsiz bırakılmış.
- Kanıt: ch05.txt:157-162 "discarded idea that memory requires the formation of new synapses".
- Düzeltme: "bu, eski bir fikrin yeniden canlanmasına yol açtı" → "bu, Hebb'den sonra terk edilen 'bellek yeni sinaps gerektirir' fikrini yeniden canlandırdı"

### ch06

**B15 [orta] `chapters[ch06].titleTr`**
- Sorun: Uygulamanın genelinde "frontal korteks" kullanılıyor; başlıktaki "Ön Korteksim" bununla çelişiyor. Noktalamada da İngilizcedeki "; or," yapısı birebir taşınmış.
- Kanıt: İngilizce başlık "Dude, Where's My Frontal Cortex?".
- Düzeltme: → "Ergenlik ya da Dostum, Frontal Korteksim Nerede?"

### Genel terim tutarlılığı

**B16 [orta] Çok sayıda alan: "ön korteks", "önden gelen korteks", "ön lob"**
- Sorun: Aynı yapı için üç farklı Türkçe karşılık kullanılmış. Uygulama standardı "frontal korteks".
- Kanıt: İngilizce metinde hep "frontal cortex" geçiyor (ör. ch06.txt:21).
- Düzeltme, birebir değiştirme:
  - "önden gelen korteks" → "frontal korteks"; "Önden gelen korteks" → "Frontal korteks"
  - "ön korteks" → "frontal korteks"; "Ön korteks" → "Frontal korteks"
  - "ön lob" → "frontal korteks"
  - Ekleri koru (…in/…i/…le).
  - **Dokunma:** "ön singulat korteks" (anterior cingulate) ve "ön ada" (insula) aynen kalacak.
- Etkilenen yollar:
  - ch03: `summary`, `simulationIdeas[0].shows`, `simulationIdeas[0].inputs[2]`
  - ch04: `links[0].why`
  - ch05: `summary`, `simulationIdeas[2].outputs[1]`, `links[0].why`
  - ch06: `summary` (2 yer), `keyConcepts[0].term`, `keyConcepts[0].explanation`, `keyConcepts[2].explanation`, `simulationIdeas[0].title` ("Frontal Korteks Olgunlaşma Zaman Çizelgesi"), `links[0].why`, `links[2].why`, `links[4].why`
  - ch07: `keyConcepts[2].explanation`, `keyStudies[0].finding`, `keyStudies[3].finding` (2 yer), `keyStudies[4].finding`, `links[0].why`
  - ch11: `links[0].why` ("ön lob performansının" → "frontal korteks performansının")
  - ch12: `links[3].why`
  - ch14: `keyConcepts[4].explanation`
  - ch16: `keyConcepts[6].explanation` (ayrıca bkz. B37)

### ch07

**B17 [orta] `chapters[ch07].keyConcepts[6].explanation`**
- Sorun: SHRP yanlış anlatılmış. Mekanizma "her uyarana bağlanmayı güçlendirmek" değil. Anne yanındayken glukokortikoid salgılanmadığı için yavru itici uyaranlardan bile kaçmıyor, onlara bağlanıyor.
- Kanıt: ch07.txt:569-571 "adrenal glands atrophy dramatically". ch07.txt:581-583 "I should get attached to any strong stimulus".
- Düzeltme: → "Yeni doğan sıçanlarda böbreküstü bezlerinin glukokortikoid salgısının birkaç hafta boyunca geçici olarak baskılandığı dönemdir. Bu dönemde anne yanındaki yavru, itici bir uyarana bile kaçınma yerine bağlanma geliştirir; bağlanma, bakımın kalitesinden bağımsız kurulur."

**B18 [düşük] `chapters[ch07].keyConcepts[3].explanation`**
- Sorun: Kohlberg'in düzey adı yanlış verilmiş. "İlişkisel" geleneksel düzeyin bir niteliği, düzeyin adı değil.
- Kanıt: ch07.txt:282-283 "Conventional moral reasoning is relational … most adolescents and adults".
- Düzeltme: "çoğu insan ilişkisel düzeyde kalır" → "çoğu ergen ve yetişkin, ilişkisel nitelikteki 'geleneksel' düzeydedir"

### ch10

**B19 [düşük] `chapters[ch10].timescale`**
- Sorun: Etiket "milyonlarca yıl" diyor. Kitabın kendi çerçevesi ise birinci kısmı "bir saniyeden bir milyon yıla" diye özetliyor. Değer (3e13 s ≈ 0,95 milyon yıl) kitapla uyumlu; uyumsuz olan etiket.
- Kanıt: ch10.txt (bölüm sonu) "from a second to a million years earlier".
- Düzeltme: → "Evrimsel zaman (yaklaşık bir milyon yıl önce ve öncesi)". `timescaleSeconds` aynen kalsın (bkz. §3).

**B20 [düşük] `chapters[ch10].keyConcepts[8].explanation`**
- Sorun: İkinci cümle bozuk ve anlamı kaymış.
- Kanıt: ch10.txt:1418-1420 "much of this chapter becomes mostly irrelevant".
- Düzeltme: İkinci cümle → "Gradualist sosyobiyolojinin karşısında durur: evrim çoğunlukla durağansa, bireyler arasındaki her küçük uyum farkının evrimsel sonuç doğurduğu varsayımı ve bölümdeki pek çok optimizasyon açıklaması sanıldığından daha az önemli olabilir."

### ch11

**B21 [yüksek] `chapters[ch11].keyStudies[4].name`**
- Sorun: "Doll" kelimesi "bebek bezi" (diaper) diye çevrilmiş. Kartta görünen bir çeviri hatası.
- Kanıt: ch11.txt:844-846 "famed “doll studies,” … white dolls over black ones".
- Düzeltme: name → "Clark ve Clark'ın oyuncak bebek çalışmaları (1940'lar)". finding'de "Brown v. Board" cümlesinden önce ekle: "Etki en çok ayrı okullardaki siyah çocuklarda belirgindi."

**B22 [düşük] `chapters[ch11].keyConcepts[7].explanation`**
- Sorun: "Aynı localığa ait olmak" bozuk ve anlamsız bir ifade.
- Düzeltme: "aynı localığa ait olmak ya da aynı yemeği sevmek gibi" → "aynı takımı tutmak ya da kişinin hangi yemeği seveceğini düşünmek gibi" (kanıt: ch11.txt:641-642 Wheeler-Fiske sebze koşulu).

### ch12

**B23 [düşük] `chapters[ch12].keyStudies[0].name`**
- Sorun: İsim İngilizce-Türkçe karışık yazılmış.
- Düzeltme: → "Esir makaklarda grup büyüklüğü ve beyin yapısı (nörogörüntüleme)"

**B24 [düşük] `chapters[ch12].keyStudies[4].finding`**
- Sorun: Perry eleştirisi yalnızca verifyNote'ta duruyor. Bulgu metnine taşınmalı.
- Kanıt: ch12.txt:1166 "65 percent of them administered the maximum shock". ch12.txt:1268 "roughly 60 percent compliance".
- Düzeltme: Sona ekle: "Gina Perry'nin arşiv incelemesi bazı verilerin şişirilmiş olabileceğini gösterir; şişirme ayıklandığında bile uyum oranı yaklaşık yüzde 60'tır."

### ch13

**B25 [orta] `chapters[ch13].keyConcepts[1].term`**
- Sorun: "Ahlaki dehşet" yanlış bir karşılık. Moral dumbfounding "şaşkınlık" demek.
- Kanıt: ch13.txt:151-152 "something Haidt calls “moral dumbfounding”".
- Düzeltme: → "Ahlaki şaşkınlık (moral dumbfounding)"

**B26 [orta] `chapters[ch13].summary`**
- Sorun: Bölümün kapanış çerçevesi özette yok: Greene'in "Ben/Biz" ile "Biz/Onlar" ayrımı ve "sağduyu ahlakının trajedisi". Özetteki "uzun vadeli stratejik düşünme…" cümlesinin de metinde karşılığı yok.
- Kanıt: ch13.txt:936 "“Me Versus Us” and “Us Versus Them”". ch13.txt:974-975 "the Tragedy of Commonsense Morality".
- Düzeltme: Son cümle ("Sonuçta uzun vadeli…") → "Bölüm Greene'in ayrımıyla kapanır: 'Ben mi, Biz mi' sorunlarında (ortak malın trajedisi) hızlı ahlaki sezgiler iyi işler; farklı grupların sezgilerinin çatıştığı 'Biz mi, Onlar mı' sorunlarında (sağduyu ahlakının trajedisi) ise yavaş, bilinçli akıl yürütme gerekir. En dürüst davranışın çoğu zaman bir irade mücadelesi değil, otomatikleşmiş bir alışkanlık olduğu da savunulur."

**B27 [düşük] `chapters[ch13].keyStudies[2].finding`**
- Sorun: "Benlik çıkarı" yorumu çalışmanın yazarlarına değil Sapolsky'ye ait.
- Kanıt: ch13.txt:238-240 "But this is worlds away … Instead it’s self-".
- Düzeltme: "Yazarlar bunu" → "Sapolsky bunu"

**B28 [düşük] `chapters[ch13].keyStudies[3].finding`**
- Sorun: Hangi oyunun kastedildiği belirsiz bırakılmış.
- Kanıt: ch13.txt:611-613 "kept an average of 73 percent … in the Dictator Game". ch13.txt:619-620 "would pretty much accept any offer above zero".
- Düzeltme: "oyunda yaklaşık yüzde 73 pay aldı ve küçük topluluklarında teklifi reddetmek neredeyse hiç görülmedi" → "Diktatör Oyunu'nda paranın ortalama yüzde 73'ünü kendine ayırdı ve Ultimatom Oyunu'nda sıfırın üzerindeki hemen her teklifi kabul etti"

**B29 [düşük] `chapters[ch13].links[3].why` (to: ch10)**
- Sorun: Bozuk ifade ("kin kişilere", "dünya ahlakı").
- Kanıt: ch13.txt:146-148 "vmPFC readily advocate sacrificing one relative to save five".
- Düzeltme: → "vmPFC hasarlı kişilerin beş yabancıyı kurtarmak için bir akrabayı feda etmeyi kolayca savunması ch10'da anlatılır; işbirliğinin nasıl başlatılıp sürdürüleceği sorusu da ch10'a dayanır."

### ch14

**B30 [düşük] `chapters[ch14].keyStudies[4].name`**
- Sorun: Eğitim karşılaştırma çalışmaları Ricard'a ait değil, kitapta "başka çalışmalar" olarak geçiyor.
- Kanıt: ch14.txt:758 "In other studies volunteers underwent either empathy training".
- Düzeltme: → "Empati eğitimi ile şefkat eğitimi karşılaştırması"

**B36 [düşük] `chapters[ch14].links[0].why` (to: ch02)**
- Sorun: "İlk bu bölümde tanıtır" ifadesi belirsiz; okuyucu ch14'ü anlayabilir. Kavramlar ch02'de tanıtılıyor.
- Kanıt: ch14.txt'de ch02'ye atıflar var (ör. "chapter 2"). ACC'nin empatideki rolü için ch04.txt:1026-1027 "Recall from chapter 2 … anterior cingulate cortex in pain empathy".
- Düzeltme: → "Ön singulat korteks (ACC) ve somatik işaretleyici kavramları ch2'de tanıtılır; bu bölüm onları empati bağlamında kullanır."

### ch15

**B31 [orta] `chapters[ch15].keyStudies[2]`**
- Sorun: İki ayrı çalışma tek kayıtta birleştirilmiş: Zhong ile Liljenquist'in mendil deneyi ve ağızla/elle yalan söyleme deneyi. "İlgili beden bölgesi" ifadesi de belirsiz.
- Kanıt: ch15.txt:340-341 "In another study subjects were instructed to lie". ch15.txt:349-352 "activated parts of the sensorimotor cortex related to the mouth".
- Düzeltme:
  - name → "Ahlaki ihlal ve Macbeth etkisi (Zhong ve Liljenquist ve izleyen çalışmalar)"
  - finding → "Zhong ve Liljenquist'in çalışmasında kendi ahlaki ihlalini hatırlayanlar, hediye olarak kalem yerine antiseptik mendili daha sık seçti. Başka bir çalışmada sözlü yalan söyleyenler gargarayı, yazılı yalan söyleyenler el sabununu tercih etti; görüntülemede sözlü yalancılarda ağızla, yazılı yalancılarda elle ilgili duyusal-motor korteks bölgeleri etkinleşti."

**B32 [düşük] `chapters[ch15].links[5].why` (to: ch13)**
- Sorun: Gerekçe yanlış bölümü anlatıyor. Muhafazakâr/liberal iğrenme konusu ch12'de. Bu bölümün ch13'e asıl bağı Greene'in çobanları.
- Kanıt: ch15.txt:620-621 "straight out of Greene’s world of two different cultures of shepherds".
- Düzeltme: → "Kutsal değerler, ch13'te Greene'in ortak meraya farklı ahlaki vizyonlarla bakan çoban toplulukları örneğinin ('sağduyu ahlakının trajedisi') doğrudan devamıdır."

**B33 [düşük] `chapters[ch15].keyStudies[5].finding` (son cümle)**
- Sorun: Bozuk ifade ("sembolik ve maddi bir fayda sağlamayan").
- Kanıt: ch15.txt:628-629 "using material incentives … insultingly counterproductive".
- Düzeltme: → "Yazarlar, maddi karşılığı olmayan sembolik jestlerin (özür, tanınma) kalıcı barış için kilit olduğunu, kutsal değerler karşısında maddi tekliflerin ise ters tepebileceğini savundu."

### ch16

**B34 [orta] `chapters[ch16].timescale`**
- Sorun: Kurala göre zaman ekseni ch02–ch10 arası; ch16'da her iki alan da null olmalı. Şu an metin dolu, saniye null. Bu durum zaman çizelgesi bileşeninde boş ya da hatalı bir düğüm üretebilir.
- Düzeltme: `"timescale": null` ("Bugün: hukuk ve sorumluluk tartışması" silinsin).

**B35 [orta] `chapters[ch16].links[1]` (to: ch07)**
- Sorun: Steinberg'in ergen beyni çalışmaları ch06'da. Kitap burada kendisi yanlış olarak "chapter 7" diyor ve kayıt bu hatayı taşımış. ch06 bağlantısı zaten mevcut. Buna karşılık ch02'nin ch16'ya yaptığı atfın karşılığı eksik.
- Kanıt: ch16.txt:396-397 "covered heavily in chapter 7". Steinberg aslında ch06.txt:295-305'te. ch02.txt:983 "More to come in chapter 16."
- Düzeltme: Kaydı şununla değiştir: `{"to": "ch02", "why": "Frontal korteks hasarı ile suç davranışı ve nörohukuk tartışması ch2'de açılır; kitap ayrıntıyı bu bölüme bırakır."}`

**B37 [düşük] `chapters[ch16].keyConcepts[6].explanation`**
- Sorun: Çelişki var: "ön korteks yerine limbik sistemde, özellikle vmPFC…" diyor, ama vmPFC frontal korteksin parçası. Kitaptaki karşıtlık dlPFC ile vmPFC arasında.
- Kanıt: ch16.txt:888-891 "culpability … dlPFC … punishment activates the emotional vmPFC".
- Düzeltme: → "Suçun sorumluluğuna karar vermenin bilişsel dlPFC ile, uygun cezaya karar vermenin ise duygusal vmPFC, amigdala ve insula ile ilişkili olduğu ve cezalandırmanın dopaminerjik ödül sistemini etkinleştirdiği fikridir."

### ch17

**B38 [düşük] `chapters[ch17].keyConcepts[0].explanation`**
- Düzeltme: "olayın sürüsüne" → "olayın süresine"

**B39 [düşük] `chapters[ch17].keyStudies[2]`**
- Sorun: Çalışmanın adı yanlış ("kömür ormanları oyunu"). Ormanlar kömür ormanı değil; köylüler ormandan kestikleri odundan kömür yapıyor.
- Kanıt: ch17.txt:651-656 "selling charcoal made from wood from local forests".
- Düzeltme:
  - name → "Etiyopya'da orman ortak malı ve maliyetli cezalandırma"
  - finding → "Yerel ormandan odun kesip kömür satan Etiyopya köylerinde, ekonomik oyunda maliyetli cezalandırmaya ortalama istekliliği yüksek olan köyler aşırı kesime karşı daha çok devriye tutuyor ve ormanları daha sağlıklı oluyordu."

**B40 [orta] `chapters[ch17].simulationIdeas[0]`**
- Sorun: "Temas Koşulları Simülatörü", ch11'deki 3. simülasyonla (`simulationIdeas[2]`) neredeyse aynı. Bölümün kendine özgü ve iyi belgelenmiş "Live and Let Live" mekanizması ise simülasyonsuz kalmış.
- Kanıt: ch17.txt:1561 "Live and Let Live truces could withstand perturbations". ch17.txt:1570-1572 "brass in the rear would intervene, rotating troops".
- Düzeltme: Nesneyi şununla değiştir:
  - title: "Yaşa ve Yaşat Siperleri"
  - shows: "Birinci Dünya Savaşı siperlerinde karşılıklı kısıtlamanın yemek saatlerinde ateş kesmekten ritüelleşmiş keskin nişancı işaretlerine nasıl evrildiğini; kaza atışlarına 'iki mermiyle karşılık' kuralının ateşkesi nasıl ayakta tuttuğunu ve komuta müdahalelerinin (birlik rotasyonu, baskın emri) onu nasıl çökerttiğini gösterir."
  - inputs: ["Aynı birliklerin karşı karşıya kalma süresi (hafta)", "Ritüel işaretin düzenliliği", "Kaza atışı olasılığı", "Komuta müdahalesi sıklığı (rotasyon, baskın emri)"]
  - outputs: ["Ateşkesin sürme olasılığı", "İntikam döngüsüne geçiş anı", "Günlük karşılıklı atış sayısı"]

**B41 [düşük] `chapters[ch17].simulationIdeas[2].shows`**
- Sorun: Model yalnızca "mesafe arttıkça direnç azalır" diye okunursa, drone pilotu bulgusuyla çelişir.
- Kanıt: ch17.txt:993-994 "their rates of PTSD are just as high".
- Düzeltme: Sona ekle: "Drone pilotlarında olduğu gibi fiziksel mesafe büyük olsa da hedef bireyselleştikçe öldürmenin psikolojik bedeli yüksek kalır."

### epilogue

**B42 [orta] `chapters[epilogue].keyConcepts[4].explanation`**
- Sorun: Anlam kaymış. Kitap "eylemden kaçmak"tan değil, karşı çıkılan bir eylemi istisna gerekçeleriyle meşrulaştırmaktan söz ediyor.
- Kanıt: epilogue.txt (madde listesi) "cite some particular circumstances that should make them exceptions".
- Düzeltme: → "Dünyadaki acının büyük kısmı, korkunç bir eylemin serbest olduğuna inananlardan değil; o eyleme ilke olarak karşı çıkıp kendi durumlarını istisna sayan insanlardan kaynaklanır."

**B43 [düşük] `chapters[epilogue].keyConcepts[6]` ve `[7]`**
- Düzeltme:
  - [6]: "hiyerarşik primatlarda görülmemiş bir alt ediş biçimi" → "hiyerarşik primatlarda eşi görülmemiş bir boyun eğdirme biçimi"
  - [7]: "karşıt akıl yürütmelerle" → "kalıba uymayan (nonkonformist) akıl yürütmelerle"

**B44 [düşük] `chapters[epilogue].links` ve eksik bağlantılar**
- Sorun: Sonsöz yalnızca ch17'ye bağlı, oysa maddeleri kitabın tamamını özetliyor. ch02 de kitabın açıkça atıf yaptığı ch13'e bağlı değil.
- Kanıt: ch02.txt:1009 "as we’ll see in chapter 13". Sonsöz maddeleri: "The homunculus has no clothes.", "We implicitly divide the world into Us and Them".
- Düzeltme:
  - `epilogue.links` sonuna ekle:
    - `{"to":"intro","why":"Kategorik kutulardan kaçınma ve 'karmaşık' çok etkenli açıklama, girişte kurulan yaklaşımın vardığı sonuçtur."}`
    - `{"to":"ch11","why":"Biz/Onlar ayrımının bilinçaltında ve saniyeler içinde yönlendirilebilmesi ch11'in ana bulgusudur."}`
    - `{"to":"ch16","why":"'Homunkülüsün üstünde elbise yok' maddesi ch16'daki özgür irade tartışmasını özetler."}`
  - `ch02.links` sonuna ekle: `{"to":"ch13","why":"Ahlaki yargının soruluş biçimine göre değişmesi ve sezgi ile akıl yürütmenin dengesi ch13'te ele alınır."}`

### app2

**B45 [orta] `chapters[app2].simulationIdeas[0].shows`**
- Sorun: Kullanıcıya gösterilecek metne iç not sızmış ("Bu simülasyon kullanıcının mevcut uygulamasıdır."). İlk cümlede de dilbilgisi hatası var ("eksenlerinin ile"). Simülasyonun ilk sırada olması (Endokrin Eksen) doğru.
- Düzeltme:
  - İlk cümle → "HPA ve HPG eksenlerinin ve pankreastaki glukoz-insülin ilişkisinin geri bildirimle nasıl dengelendiğini gösterir."
  - "Bu simülasyon kullanıcının mevcut uygulamasıdır." cümlesi silinsin.

**B46 [düşük] `chapters[app2].links[3].why` (to: ch04)**
- Sorun: Gerekçe metni içerik değil, iç provenans notu ("…ch17'deki atıftan çıkarıldı").
- Kanıt: ch04.txt hormonlar konusunda appendix 2'ye atıf yapıyor (grep: "appendix 2").
- Düzeltme: → "Glukokortikoidler, testosteron ve oksitosin gibi hormonların davranış üzerindeki etkileri ch4'te ele alınır; bu ek, o bölümün endokrin temelini açıklar."

### Başlıklar (titleTr)

**B47 [orta] `chapters[ch08|ch09|ch13].titleTr`**
- Sorun: Kitapta olmayan alt başlıklar eklenmiş; başlıklar kart için fazla uzun ve kaynağa sadık değil.
- Düzeltme:
  - ch08: "Döllenme anına geri dönüş: Genler, çevre ve davranış" → "Henüz Döllenmiş Bir Yumurta Olduğun Zamana Dönüş"
  - ch09: "Yüzyıllar ila binyıllar önce: Kültür, ekoloji ve iyi-kötü davranışın kökleri" → "Yüzyıllar ila Binyıllar Önce"
  - ch13: "Ahlak: doğrunun ne olduğu bulunduktan sonra doğruyu yapmak" → "Ahlak ve Doğru Olanı Yapmak (Ne Olduğunu Anladıktan Sonra)"

**B48 [düşük] Diğer `titleTr` alanları (büyük harf kullanımı ve kaynağa sadakat)**
- Sorun: Bir kısmı başlık düzeninde (Giriş, Bir Saniye Önce, Beşiğe Geri, Rahme Geri, Savaş ve Barış), bir kısmı cümle düzeninde yazılmış. Zaman ekseni başlıklarının kalıbı da tutarsız.
- Düzeltme:
  - ch03 → "Saniyeler ila Dakikalar Önce"
  - ch04 → "Saatler ila Günler Önce"
  - ch05 → "Günler ila Aylar Önce"
  - ch10 → "Davranışın Evrimi"
  - ch12 → "Hiyerarşi, İtaat ve Direniş"
  - ch14 → "Birinin Acısını Hissetmek, Anlamak ve Hafifletmek"
  - ch15 → "Uğruna Öldürdüğümüz Metaforlar" ("we kill by" vurgusu için)
  - ch16 → "Biyoloji, Ceza Adaleti Sistemi ve (Ah, Neden Olmasın?) Özgür İrade"

### verifyNotes, kitap adı ve biçim

**B49 [düşük] `verifyNotes` temizliği**
Doğrulanmış, yanlış ya da iç süreç notu olan kayıtlar:
- ch01: `[]`. ch04.txt:984-986 yer değiştirme saldırganlığını ve glukokortikoidleri doğruluyor.
- ch02: `[]`.
  - [0] yanlış: ch02.txt:1136 "Chapter 6 discusses".
  - [1] yanlış: bkz. B05.
  - [2] iç not.
- ch09: `[]`. "Final chapter" ch17'ye karşılık geliyor; ch17.txt:173-180 Pinker tartışmasını içeriyor.
- ch10: `[]`.
  - [0]: ch17 = son bölüm (ch17.txt:1541 vd. işbirliğinin başlaması).
  - [1]: ch10.txt (sonu) "we’ve finished this first part of the book".
- ch11:
  - [1] silinsin; Noel ateşkesi ch17.txt:1492'de.
  - [0] → "‘Son iki bölüm’ ifadesi ch16–ch17 olarak yorumlandı." (ch12'deki otoriterlik kısmı doğrulandı: ch12.txt:683.)
- ch12: `[]`.
  - [0] gereksiz (null kural gereği).
  - [1] var olmayan bir ifadeye atıf yapıyor ("Dört ülkede…" keyStudies'te yok).
  - [2] B24'e taşındı.
  - [3] iç not.
  - [4] doğrulandı: ch12.txt:1415-1416.
  - [5] genel uyarı.
- ch13: `[]`.
  - [1]: ch17 doğrulandı, ch17.txt:629-657.
  - [2]: Hadza %73 doğrulandı, ch13.txt:611-612.
  - Diğerleri iç not.
  - Ayrıca `links[6].why` → "Metin, işbirliğinin nasıl sağlanabileceğine dair yanıtları son bölüme (ch17: açık defter oyunu, üçüncü taraf cezası) bırakır."
- ch14, ch15, epilogue, app2, app3: `[]`. Hepsi ya null kuralının tekrarı ya da artık doğrulanmış.
- ch16, ch17: İsteğe bağlı olarak korunabilir (genel ihtiyat notları).

**B50 [düşük] `book.titleTr`**
- "Davranış: En İyi ve En Kötü Hâlimizle İnsan Biyolojisi" bir çeviri önerisi. Resmî bir Türkçe baskı adını doğrulayamadım; bu yüzden ad, resmî ad gibi sunulmamalı.
- Öneri: Arayüzde özgün adı ("Behave") öne çıkarın ve Türkçe adı "(önerilen çeviri)" ibaresiyle gösterin. İsterseniz veriye `"titleTrNote": "Önerilen çeviri; resmî Türkçe baskı adı doğrulanmadı."` alanı ekleyin. Yayıncı kaydıyla doğrulanırsa not kaldırılabilir.

**B51 [düşük] Tırnak ve simülasyon başlığı biçimi**
- ch17, epilogue, app1–app3 kıvrık tırnak (‘ ’) kullanıyor, diğer kayıtlar düz kesme işareti ('). Hepsi `'` olarak normalize edilsin. Örnek: "Kutsal Kitap’a" → "Kutsal Kitap'a".
- `simulationIdeas[].title` alanlarının bir kısmı cümle düzeninde: ch03, ch04, ch05, ch08, ch09, ch10, ch11, ch12, ch13'teki tüm başlıklar. Diğerleri başlık düzeninde (ör. "Bir Saniye Önce Devresi"). Tek bir düzen seçilmeli; öneri başlık düzeni.

## 3. Zaman ölçeği kontrolü

| id | timescaleSeconds | yaklaşık karşılık | değerlendirme |
|---|---|---|---|
| ch02 | 1 | 1 sn | uygun |
| ch03 | 60 | 1 dk | uygun |
| ch04 | 86 400 | 1 gün | uygun |
| ch05 | 7 800 000 | ≈ 90 gün | uygun |
| ch06 | 3e8 | ≈ 9,5 yıl | uygun ("yaklaşık on yıl önce") |
| ch07 | 6e8 | ≈ 19 yıl | uygun (çocukluk ve rahim) |
| ch08 | 9e8 | ≈ 28,5 yıl | uygun (döllenme ≈ yaş) |
| ch09 | 3e10 | ≈ 950 yıl | uygun (yüzyıllar–binyıllar) |
| ch10 | 3e13 | ≈ 0,95 milyon yıl | **makul**: kitap birinci kısmı "bir saniyeden bir milyon yıla" diye özetliyor. Yalnızca etiket düzeltilmeli (B19). Etiket "milyonlarca yıl" olarak kalacaksa 1e14 (≈ 3,2 milyon yıl) seçilebilir; ancak kitaba en sadık değer mevcut olanı. |
| ch16 | null (timescale dolu) | – | **tutarsız**: timescale null yapılmalı (B34) |

Diğer bütün kayıtlarda iki alan da null; bu doğru. Değerler monoton artıyor.

## 4. Telif kontrolü

Yöntem: JSON'daki tüm metinler küçük harfe çevrildi ve İngilizce 5-gram'ları kitabın tüm bölüm metinlerinin 5-gram kümesiyle karşılaştırıldı. 6+ kelimelik eşleşmeler zaten bu kümenin alt kümesi.

Sonuç: Yalnızca `titleEn` alanları (ch06, ch07, ch08, ch13, ch14, ch16) ile özel adlar eşleşti: "Brown v. Board of Education" ve "The Better Angels of Our Nature". İçerik Türkçe yeniden ifade edilmiş. Kısa çevrilmiş alıntılar (ör. Naipaul: "daha güzel olsun diye") makul alıntı sınırında. **Düzeltme gerekmiyor.**

## 5. simulationIdeas kontrolü

- ch02 ilk madde "Bir Saniye Önce Devresi" ✓. app2 ilk madde "Endokrin Eksen" ✓ (metin düzeltmesi için bkz. B45).
- Simülasyonların hepsi bölüm içeriğine dayanıyor. Örnek doğrulamalar:
  - ch13 zar deneyi: ch13.txt:1131-1135
  - ch15 psikolojik mesafe grafiği: ch15.txt:420-445
  - ch05 korku ile koşu tekerleği glukokortikoid karşılaştırması: ch05.txt:206-211
  - ch08 transkripsiyon faktörü kombinasyonları 1/3/7/15/31: ch08.txt:140-142
  - ch09 heterojenlik ve parça büyüklüğü: ch09.txt:934-940
- Sorunlu olanlar: ch17[0] ch11[2]'nin tekrarı (B40); ch17[2] drone bulgusuyla tutarlı hâle getirilmeli (B41); ch06[0] başlığındaki terim (B16).

## 6. Uygulama sırası (öneri)

1. Yüksek önem: B03, B04, B21.
2. Veri ve gösterim hataları: B34, B45, B13, B35.
3. Terim değişikliği B16 ve başlıklar B15, B47, B48 (tek geçişte, değiştirme kuralları ile).
4. Orta önemdeki içerik düzeltmeleri: B01, B02, B05, B17, B25, B26, B31, B40, B42.
5. Düşük önemdekiler ve B49 `verifyNotes` temizliği.
