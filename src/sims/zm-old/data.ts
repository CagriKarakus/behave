// Zaman merdiveni içeriği: basamaklar, davranışlar, etken kartları ve basamaklar arası bağlar.
// Kartlar ilgili bölümlerin kavram ve bulgularından (content/chapters.json) derlenmiş örneklerdir;
// kitabın bu davranışlara özgü bir sonucu değildir.

export type Dir = 'for' | 'against' | 'ctx';

export interface Rung {
  ch: string;
  sim: string;
  /** Zaman etiketi (bölümün timescale alanından). */
  when: string;
  /** Bölümün Türkçe başlığı (kısa). */
  name: string;
}

/** Yukarıdan aşağıya: en yakın zamandan en uzağa. */
export const RUNGS: Rung[] = [
  { ch: 'ch02', sim: 'bir-saniye-once', when: 'Bir saniye önce', name: 'Bir saniye önce' },
  { ch: 'ch03', sim: 'saniyeler-once', when: 'Saniyeler ila dakikalar önce', name: 'Saniyeler-dakikalar' },
  { ch: 'ch04', sim: 'hormon-baglam', when: 'Saatler ila günler önce', name: 'Saatler-günler' },
  { ch: 'ch05', sim: 'noroplastisite', when: 'Günler ila aylar önce', name: 'Günler-aylar' },
  { ch: 'ch06', sim: 'ergen-beyni', when: 'Ergenlik (yaklaşık on yıl önce)', name: 'Ergenlik' },
  { ch: 'ch07', sim: 'cocukluk', when: 'Çocukluk ve rahim (on yıllar önce)', name: 'Çocukluk ve rahim' },
  { ch: 'ch08', sim: 'gen-cevre', when: 'Döllenme anı: genom', name: 'Döllenme' },
  { ch: 'ch09', sim: 'kultur-ekoloji', when: 'Yüzyıllar ila binyıllar önce', name: 'Yüzyıllar-binyıllar' },
  { ch: 'ch10', sim: 'isbirligi-evrimi', when: 'Evrimsel zaman (milyon yıl ve öncesi)', name: 'Evrim' },
];

export interface Card { title: string; text: string; dir: Dir }
export interface Behavior { key: string; label: string; cards: Card[] }

export const BEHAVIORS: Behavior[] = [
  {
    key: 'yardim', label: 'Birine el uzatmak',
    cards: [
      { title: 'Amigdala ve frontal korteks', dir: 'ctx', text: 'Amigdala karşıdakinin durumunu hızla tartar; frontal korteks, doğru olan zor olduğunda bile onu yaptırmaya çalışır.' },
      { title: 'Fark edilmeyen ipuçları', dir: 'ctx', text: 'Yüz ve göz ifadesi, ortamın düzeni, "biz" kimliğinin hatırlatılması yardım kararını fark edilmeden kaydırabilir.' },
      { title: 'Oksitosin ve "biz" kapsamı', dir: 'ctx', text: 'Oksitosin güveni ve cömertliği artırır; ama etki çoğunlukla "biz" kapsamıyla sınırlıdır, dışarıdakine önyargıyı da büyütebilir.' },
      { title: 'Stres ve öğrenilmiş bağlar', dir: 'against', text: 'Kronik stres empatiyi ve karar almayı zayıflatır. Yardımın karşılık bulması ise ilgili bağlantıları güçlendirebilir (Hebb ilkesi).' },
      { title: 'Ergenlikte aşırı yoğun empati', dir: 'ctx', text: 'Ergenler başkasının acısını çok yoğun yaşar; bu bazen kendi sıkıntısına odaklanıp yardımı zorlaştırır.' },
      { title: 'Çocuklukta empati ve ahlak', dir: 'for', text: 'Empati acıyı paylaşmaktan karşıdakinin duygusunu anlamaya doğru olgunlaşır; zihin kuramı üç-dört yaş civarında belirir.' },
      { title: 'Genler eğilim sunar', dir: 'ctx', text: 'Oksitosin, dopamin ve serotonin sistemlerinin genleriyle davranış arasındaki ilişkiler küçük ve bağlama bağlıdır.' },
      { title: 'Kültür: paylaşma ve güven', dir: 'for', text: 'Avcı-toplayıcı gruplarda avın paylaşılması dolaylı karşılıklılığa dayanır; gelir eşitsizliği arttıkça karşılıklı yardım azalır.' },
      { title: 'Akraba ve karşılıklı özgecilik', dir: 'for', text: 'Akraba seçilimi akrabaya yardımı, karşılıklı özgecilik sık karşılaşan akrabasızlar arasındaki yardımı açıklar.' },
    ],
  },
  {
    key: 'vurma', label: 'Birine vurmak',
    cards: [
      { title: 'Hızlı amigdala, yavaş fren', dir: 'ctx', text: 'Amigdala öfkeli saldırganlığın merkezidir; frontal korteks dürtüyü frenler. Yorgunluk ve stres freni zayıflatır.' },
      { title: 'Saniyeler öncesinin ipuçları', dir: 'for', text: 'Fark edilmeyen yüz, koku ve ortam ipuçları amigdalayı uyarır; ağrı mevcut saldırganlık eğilimini güçlendirir.' },
      { title: 'Testosteron büyütür, yaratmaz', dir: 'ctx', text: 'Normal aralıktaki testosteron düzeyi saldırganlığı öngörmez; statü mücadelesi gibi bağlamlarda mevcut eğilimi büyütür.' },
      { title: 'Kronik stres', dir: 'for', text: 'Kronik stres amigdalayı güçlendirir, frontal korteks bağlantılarını zayıflatır. Nöroplastisite iyi ya da kötü yönde işleyebilir.' },
      { title: 'Ergenlik: fren geç olgunlaşır', dir: 'for', text: 'Şiddet geç ergenlik ve erken yetişkinlikte zirve yapar; frontal korteks yirmili yaşların ortasında olgunlaşır.' },
      { title: 'Çocuklukta ilgi ve istismar', dir: 'for', text: 'Annelik ilgisi eksikliği, istismar ve şiddete tanıklık, yetişkinlikte şiddet riskini artırabilir; tek başına kader değildir.' },
      { title: 'Gen × çevre: MAO-A', dir: 'ctx', text: 'Düşük aktiviteli MAO-A varyantı, yalnızca ağır çocukluk istismarı olanlarda riski yaklaşık üç kat artırdı (replikasyon karışık).' },
      { title: 'Onur kültürü, eşitsizlik', dir: 'ctx', text: 'Hakarete şiddetle karşılığı meşru sayan onur kültürü çobanlık kökenine bağlanır. Kalabalık tek başına şiddet üretmez.' },
      { title: 'Bireysel seçilim mantığı', dir: 'ctx', text: 'Langurlarda yeni erkeğin öncekinin yavrularını öldürmesi, gen aktarımı mantığıyla açıklanır; ama davranış bağlama bağlıdır.' },
    ],
  },
  {
    key: 'tetik', label: 'Tetiği çekmek',
    cards: [
      { title: 'Hız doğruluk pahasına', dir: 'ctx', text: 'Duyusal bilgi korteksi atlayıp doğrudan amigdalaya ulaşabilir, hareket de bilişsel onayı atlayabilir.' },
      { title: 'Ateş etme görevi (Correll)', dir: 'for', text: 'Beyaz katılımcılarda Siyah bir yüz, silah olsun olmasın, daha güçlü tehdit dalgası ve daha zayıf durdurucu dalga uyandırdı. Bu otomatik, öğrenilmiş, bağlama duyarlı bir tepkidir; bilinçli tutum ya da doğuştan özellik değil.' },
      { title: 'Stres karar almayı bozar', dir: 'for', text: 'Kronik stres karar almayı ve duygu düzenlemesini zayıflatır. Hormonlar yeni davranış icat etmez, mevcut eğilimi büyütür.' },
      { title: 'Deneyimin izi', dir: 'ctx', text: 'Birlikte ateşlenen bağlantılar güçlenir; kronik stres amigdala tepkisini artırırken frontal bağlantıları zayıflatır.' },
      { title: 'Akran etkisi ve ergenlik', dir: 'for', text: 'İki akranın varlığı sürüş oyununda ergenlerde risk almayı üç katına çıkardı, yetişkinleri etkilemedi (replikasyon karışık).' },
      { title: 'Çocuklukta dürtü kontrolü', dir: 'ctx', text: 'Çocukluk adversitesi yetişkinlikte dürtü kontrolü sorunlarıyla ilişkilidir; bekleyebilme yaşla birlikte gelişir.' },
      { title: '"Savaşçı gen" yoktur', dir: 'against', text: 'Basit determinist yorumlar desteklenmez. Genler eğilim sunar; anlamı çevreye bağlıdır.' },
      { title: 'Onur kültürü: hakaret', dir: 'ctx', text: 'Koridor deneyinde hakarete uğrayan Güneyli erkeklerde hayal edilen şiddet büyük ölçüde arttı (replikasyon durumu bilinmiyor).' },
      { title: 'Misilleme döngüsü', dir: 'for', text: 'Tit for Tat stratejisi sinyal hatasında karşılıklı misilleme döngüsüne kilitlenebilir; affedici türevler bunu çözer.' },
    ],
  },
];

export interface Link {
  /** Etkileyen (daha derin) basamak. */
  from: number;
  /** Etkilenen (daha yakın) basamak. */
  to: number;
  label: string;
}

export const LINKS: Link[] = [
  { from: 1, to: 0, label: 'Duyusal ipucu korteksi atlayıp doğrudan amigdalaya ulaşabilir.' },
  { from: 2, to: 0, label: 'Stres hormonu dürtü kontrolünü zayıflatır; amigdalanın hızlı tepkisi baskın kalır.' },
  { from: 3, to: 0, label: 'Aylarca süren stres amigdalayı güçlendirir, frontal korteks bağlantılarını zayıflatır.' },
  { from: 2, to: 1, label: 'İç durum (açlık, stres) hangi duyusal ipucunun etkili olacağını ayarlar.' },
  { from: 4, to: 0, label: 'Frontal korteks yirmili yaşların ortasına dek olgunlaşır; fren geç gelir.' },
  { from: 5, to: 4, label: 'Çocukluk deneyimi frontal korteksi şekillendirir.' },
  { from: 5, to: 2, label: 'Erken yaşam, stres tepkisini epigenetik olarak ayarlar.' },
  { from: 6, to: 5, label: 'Genin etkisi çocukluk ortamına bağlıdır (gen × çevre).' },
  { from: 7, to: 5, label: 'Kültür çocuklukta aşılanır: nasıl yetiştirildiğini belirler.' },
  { from: 8, to: 6, label: 'Evrim, genlerin sunduğu eğilimleri biçimlendirdi.' },
  { from: 8, to: 7, label: 'Gen-kültür eşevrimi: beyin kültürü, kültür beyni şekillendirir.' },
];

export interface Example {
  key: string;
  label: string;
  /** Eksen: alt ve üst sınır, birim. */
  lo: number; hi: number; unit: string;
  /** Çift arasındaki varsayılan fark. */
  delta: number; maxDelta: number; step: number;
  axis: string;
  hint: string;
  /** Şerit renkleri (token adları). */
  from: string; to: string;
  boxes: number;
}

export const EXAMPLES: Example[] = [
  { key: 'renk', label: 'Renk geçişi', lo: 0, hi: 100, unit: '%', delta: 6, maxDelta: 30, step: 1, axis: 'mavi karışım ↔ kırmızı karışım (%)', hint: 'İki ton yan yana, farkları sabit. Sınır ikisinin arasına girince biri "mavi", diğeri "mor" olur.', from: '--pfc', to: '--amy', boxes: 4 },
  { key: 'not', label: 'Sınav notu', lo: 0, hi: 100, unit: 'puan', delta: 2, maxDelta: 20, step: 1, axis: 'sınav puanı', hint: 'Aynı iki puan, ama harf sınırı arasına girince biri "geçti", diğeri "kaldı" sayılır.', from: '--lesion', to: '--gld', boxes: 4 },
  { key: 'boy', label: 'Boy', lo: 140, hi: 200, unit: 'cm', delta: 3, maxDelta: 20, step: 1, axis: 'boy (cm)', hint: 'İki kişinin boy farkı sabit. "Kısa" ile "uzun" arasındaki sınır ikisinin arasına düşünce fark büyük görünür.', from: '--hyp', to: '--pit', boxes: 4 },
];
