// Kitabın haritası: her bölümün tek cümlelik dersi. Cümleler content/chapters.json bölüm özetlerinden
// (summary) kısaltılmıştır; kitapta olmayan iddia içermez. Simülasyon bağlantıları registry'den gelir.
export type Group = 'zaman' | 'gelisim' | 'biz' | 'ek';

export interface MapChapter { id: string; label: string; title: string; group: Group; lesson: string }

export const GROUPS: Array<{ key: Group | 'hepsi'; label: string }> = [
  { key: 'hepsi', label: 'Hepsi' },
  { key: 'zaman', label: 'Saniyelerden aylara' },
  { key: 'gelisim', label: 'Gelişim, gen, kültür, evrim' },
  { key: 'biz', label: 'Biz/Onlar ve seçimler' },
  { key: 'ek', label: 'Giriş ve ekler' },
];

export const CHAPTERS: MapChapter[] = [
  { id: 'intro', label: 'Giriş', title: 'Giriş', group: 'ek', lesson: 'Bir davranışın nedeni tek kutuda aranmaz: biyoloji gerekir ama yetmez, açıklamalar zaman merdiveninde birbirini içerir.' },
  { id: 'ch01', label: 'Bölüm 1', title: 'Davranış', group: 'ek', lesson: 'Saldırganlık, özveri ve empati gibi kavramlar tanımlaması zor ve değer yüklüdür; kitap davranışın en iyi ve en kötü hâllerini birlikte inceler.' },
  { id: 'ch02', label: 'Bölüm 2', title: 'Bir saniye önce', group: 'zaman', lesson: 'Amigdala, frontal korteks ve dopamin devreleri birbirini dengeler; frontal korteks, doğru olan zor olduğunda o zoru yaptırır.' },
  { id: 'ch03', label: 'Bölüm 3', title: 'Saniyeler ila dakikalar önce', group: 'zaman', lesson: 'Fark edilmeyen duyusal ve sosyal ipuçları davranışı kaydırır; insan sanıldığından daha az özerk ve rasyonel karar verir.' },
  { id: 'ch04', label: 'Bölüm 4', title: 'Saatler ila günler önce', group: 'zaman', lesson: 'Hormonlar davranışı doğrudan üretmez, bağlamdaki eğilimi güçlendirir; oksitosinin bağ etkisi çoğunlukla "biz" ile sınırlıdır.' },
  { id: 'ch05', label: 'Bölüm 5', title: 'Günler ila aylar önce', group: 'zaman', lesson: 'Deneyim sinapsları ve devreleri yeniden biçimlendirir; nöroplastisite değer yüklü değildir, hem iyileştirebilir hem zarar verebilir.' },
  { id: 'ch06', label: 'Bölüm 6', title: 'Ergenlik', group: 'gelisim', lesson: 'Frontal korteks yirmili yaşların ortasına kadar olgunlaşır; bu sırada ödül ve akran onayı öne geçer.' },
  { id: 'ch07', label: 'Bölüm 7', title: 'Çocukluk ve rahim', group: 'gelisim', lesson: 'Erken yaşantılar eğilimleri kalıcı biçimde kaydırır ama tek başına kader değildir.' },
  { id: 'ch08', label: 'Bölüm 8', title: 'Genler', group: 'gelisim', lesson: 'Genler kesinlik değil eğilim, duyarlılık ve kırılganlık verir; ne anlama geldikleri çevreye bağlıdır.' },
  { id: 'ch09', label: 'Bölüm 9', title: 'Yüzyıllar ila binyıllar önce', group: 'gelisim', lesson: 'Kültür ekoloji ve geçim biçimiyle birlikte davranışı şekillendirir; kalabalık şiddeti tek başına üretmez, mevcut eğilimleri büyütür.' },
  { id: 'ch10', label: 'Bölüm 10', title: 'Davranışın evrimi', group: 'gelisim', lesson: 'Bireysel seçilim, akraba seçilimi ve karşılıklı özgecilik işbirliğini açıklar; "türün iyiliği için" varsayımı çürütülür.' },
  { id: 'ch11', label: 'Bölüm 11', title: 'Biz ve Onlar', group: 'biz', lesson: 'Beyin Biz/Onlar ayrımını hızlı ve otomatik kurar; anlamsız bir işaret bile kayırmacılık doğurur, sınır ise yeniden çizilebilir.' },
  { id: 'ch12', label: 'Bölüm 12', title: 'Hiyerarşi, itaat ve direniş', group: 'biz', lesson: 'Statünün anlamı stresi ve sağlığı belirler; durumsal baskı uymayı ve itaati güçlendirir ama direniş de mümkündür.' },
  { id: 'ch13', label: 'Bölüm 13', title: 'Ahlak', group: 'biz', lesson: 'Ahlaki kararların çoğu önce sezgiyle verilip sonra gerekçelendirilir; sezgi mi akıl mı gerektiği sorunun türüne bağlıdır.' },
  { id: 'ch14', label: 'Bölüm 14', title: 'Empati', group: 'biz', lesson: 'Empati tek bir duygu değil, bulaşmadan bakış açısı almaya uzanan bir spektrumdur; yardım çoğu zaman yakına ve kendi gruba yönelir.' },
  { id: 'ch15', label: 'Bölüm 15', title: 'Metaforlar', group: 'biz', lesson: 'Beyin metaforla gerçeği karıştırır; bir grubu "böcek" diye anan dil insanlıktan çıkarmaya zemin hazırlar, kutsal değerlere saygı ise uzlaşmaya kapı açabilir.' },
  { id: 'ch16', label: 'Bölüm 16', title: 'Özgür irade ve ceza adaleti', group: 'biz', lesson: 'Kararları veren ayrı bir "homunkülüs" fikri biyoloji karşısında aşınır; ceza hak edilmişliğe değil, korunmaya odaklanabilir.' },
  { id: 'ch17', label: 'Bölüm 17', title: 'Savaş ve barış', group: 'biz', lesson: 'Aynı mekanizmalar hem şiddeti hem barışı besler; Biz/Onlar sınırları bağlama göre kayar, uygun koşullarda temas ve işbirliği önyargıyı azaltabilir.' },
  { id: 'app1', label: 'Ek 1', title: 'Nörobilim 101', group: 'ek', lesson: 'Nöron bir eşik değerine göre tam ya da hiç ateşler; sinapslar ve devreler, davranışın temel malzemesidir.' },
  { id: 'app2', label: 'Ek 2', title: 'Endokrinolojinin temelleri', group: 'ek', lesson: 'Hormonlar kanla taşınır, etkileri saatler ve günler sürer; etkiyi hedef hücredeki reseptör ayarlar.' },
  { id: 'app3', label: 'Ek 3', title: 'Protein temelleri', group: 'ek', lesson: 'Proteinin işlevi üç boyutlu şekline bağlıdır; DNA\'dan RNA\'ya ve proteine akış, mutasyonlar ve alel çeşitliliği hormon ve reseptörlerin temelidir.' },
];

/** Sonsöz'ün tekrarlanan temaları (keyConcepts), kendi cümlelerimizle. */
export const THEMES: Array<{ term: string; text: string; chapters: string[]; tab?: 'ort' | 'biz' }> = [
  { term: 'Ortalama ve bireysel varyasyon', text: 'Bulgular ortalama eğilimleri anlatır; bireyler arasındaki fark çoğu zaman en ilginç kısımdır.', chapters: [], tab: 'ort' },
  { term: 'Bağlam', text: 'Genler ve hormonlar davranışı tek başına belirlemez; aynı biyolojik etki ortama göre iyi ya da kötü sonuç verebilir.', chapters: ['ch04'] },
  { term: 'Gen-çevre etkileşimi', text: 'Genler kesinlik değil yatkınlık ve kırılganlık taşır.', chapters: ['ch08'] },
  { term: 'Biz ve Onlar', text: 'Gruplar arası ayrım doğal olarak kurulur ve saniyeler içinde, bilinç dışı ipuçlarıyla değiştirilebilir.', chapters: ['ch11', 'ch17'], tab: 'biz' },
  { term: 'Rasyonalizasyon', text: 'Gerekçeler çoğu zaman duyguların ardından, onları savunmak için gelir.', chapters: ['ch11', 'ch13'] },
  { term: 'Biliş ve duygu', text: 'Akıl yürütme ile duygular birlikte çalışır; soru, hangisinin baskın olduğudur.', chapters: ['ch02', 'ch13'] },
  { term: 'Statü ve hiyerarşi', text: 'Sosyoekonomik statü, hiyerarşik primatlarda görülmemiş bir boyun eğdirme biçimi yaratmıştır.', chapters: ['ch12'] },
  { term: 'Beyin ve kültürün birlikte evrimi', text: 'Beyin yapısı ile kültürel normlar birbirini etkileyerek değişir.', chapters: ['ch09'] },
];
