// Ergen beyni: kullanıcıya görünen tüm Türkçe metin. Dinamik cümleler şablon fonksiyonudur;
// yüzdeler çağıran tarafta biçimlenir (`pc`/`percent`) ve hazır metin olarak gelir.
export const TR = {
  lede: 'Ergenler neden daha fazla risk alır, ve bu neden bir "kusur" değil de bir gelişim dengesizliğidir?',
  tabsAria: 'Üç bakış',
  tabs: ['Olgunlaşma çizelgesi', 'Akranlarla sürüş', 'Haber güncelleme'],
  outputsAria: 'Anlık çıktılar',
  you: 'Sen',
  agent: 'Ajan',
  alone: 'yalnız',
  /** Yaş değeri (kaydırıcı, aria-valuetext, profil alt etiketi). */
  ageN: (n: number): string => `${n} yaş`,

  // Grup ve profil adları
  groups: { teen: 'Ergen', young: 'Genç yetişkin', adult: 'Yetişkin' },
  groupsLc: { teen: 'ergen', young: 'genç yetişkin', adult: 'yetişkin' },
  profiles: { child: 'Çocuk (10)', teen: 'Ergen (15)', young: 'Genç yetişkin (21)', adult: 'Yetişkin (26)' },
  rewardLevels: { small: 'küçük', mid: 'orta', big: 'büyük' },
  events: [
    'Bir yıl içinde cep telefonunu kaybetmek',
    'Bir yıl içinde bisikletinin çalınması',
    'Hayatın boyunca ciddi bir araba kazası geçirmek',
    'Hayatın boyunca kemik kırığı yaşamak',
    'Bir yıl içinde ağır bir gıda zehirlenmesi geçirmek',
  ],

  // ---- Sekme 1: olgunlaşma ----
  brainAria: 'Beyin silüeti: frontal korteks ve limbik sistem yaşa göre renk yoğunluğu değiştirir',
  brainLabels: { frontal: 'Frontal', limbic: 'Limbik', accumbens: 'akumbens', cerebellum: 'beyincik', front: 'ön', back: 'arka' },
  brainLegend: [
    'Frontal korteks (olgunluk)',
    'Limbik sistem, dopamin (etkinlik)',
    'Noktalar: gri madde (sinaps yoğunluğu)',
    'Mor çizgiler: miyelinli bağlantı',
  ],
  ageChipsAria: 'Hızlı yaş seçimi',
  ageChips: ['Çocuk · 8', 'Ergen · 15', 'Yirmilerin başı · 21', 'Yirmilerin ortası · 25'],
  ageLabel: 'Yaş',
  ageHint: '5 ile 30 arasında gez. Frontal korteks en son, yirmili yaşların ortasında olgunlaşır; dopamin sistemi ergenlikte tepe yapar.',
  chart1Aria: 'Olgunlaşma eğrileri',
  chart1H: 'Yaşa göre olgunlaşma',
  chart1Svg: 'Dopamin sistemi ergenlikte tepe yapar, frontal korteks yirmilerin ortasına kadar yükselir; aradaki boşluk gölgeli',
  chart1Legend: ['Dopamin / limbik', 'Frontal korteks', 'Gri madde (budanma)', 'Miyelinleşme', 'Boşluk'],
  axisAge: 'yaş',
  gapWord: 'boşluk',
  frontalMature: 'frontal ≈ olgun',
  meters1: ['Dopamin · limbik', 'Frontal olgunluk', 'Boşluk'],

  // ---- Sekme 2: sürüş ----
  sceneAria: 'Sarı ışıklı kavşak: araç sarıda geçer ya da durur; kenarda izleyen akranlar',
  crashWord: 'Çarpışma!',
  sceneLegend: ['Kırmızı', 'Sarı', 'Yeşil', 'Kenardaki yüzler: izleyen akranlar'],
  lights: { r: 'KIRMIZI', y: 'SARI', g: 'YEŞİL' },
  playerAria: 'Oynayan',
  modeAgent: 'Ajan oynasın',
  modeUser: 'Ben oynayayım',
  agent1: 'Ajan: 1 tur',
  agent50: '50 tur hızlı',
  reset: 'Yeniden çalıştır',
  uNew: 'Yeni tur',
  uGo: 'Geç',
  uStop: 'Dur',
  uReset: 'Sıfırla',
  inputsH: 'Girdiler',
  grpLabel: 'Yaş grubu',
  grpHint: 'Ergen (~15), genç yetişkin (~21), yetişkin (~30). Yalnızken üçü de benzer davranır.',
  peersLabel: 'İzleyen akran',
  peersHint: 'Kitaptaki deneyde iki akran vardı. Etki, yaşa bağlı olarak ergende büyür.',
  rewLabel: 'Ödül büyüklüğü',
  rewHint: 'Sarıda geçince kazanılan puan. Büyük ödülde ergen accumbens tepkisi yetişkininkinin çok üstüne çıkar.',
  chart2Aria: 'Risk alma oranı',
  chart2H: 'Sarıda geçme oranı (modelin beklentisi)',
  chart2Svg: 'Üç yaş grubunda yalnızken ve akranlarla sarıda geçme oranı',
  chart2Legend: ['Yalnız', 'Akranlarla'],
  chart2Note: 'Akran sayısı 0: akranlarla çubuğu için kaydırıcıyı artır.',
  chart3Aria: 'Accumbens tepkisi',
  chart3H: 'Ödüle accumbens tepkisi (Galvan)',
  chart3Svg: 'Çocukta düz, yetişkinde orantılı artan, ergende büyük ödülde çok yüksek accumbens tepkisi',
  chart3Legend: ['Çocuk', 'Ergen', 'Yetişkin', 'Seçili grup'],
  axisReward: 'ödül büyüklüğü',
  meters2: ['Risk alma oranı', 'Ödül sinyali · accumbens', 'Frontal denetim'],
  peerWatching: (n: number): string => `${n} akran izliyor`,
  peersVal: (n: number): string => `${n} akran`,
  rewardVal: (level: string, pts: number): string => `${level} (+${pts} puan)`,
  // Sahne
  approaching: 'Araç kavşağa yaklaşıyor...',
  yellowWait: (sec: string, risk: string): string => `Sarı: kalan süre ~${sec} sn, geçersen çarpışma riski ${risk}.`,
  crashMsg: (loss: number): string => `Çarpışma! ${loss} puan.`,
  crossing: 'Geçiyor...',
  safeMsg: (pts: number): string => `Güvenle geçti: +${pts} puan.`,
  stoppedMsg: 'Durdu: 0 puan.',
  stopping: 'Duruyor...',
  batchDone: '50 tur çalıştırıldı.',
  // Sayaç
  tallyLine: (who: string, n: number, go: number, goPct: string, crash: number, score: number): string =>
    `${who}: ${n} tur, ${go} kez geçti (${goPct}), ${crash} çarpışma, toplam ${score} puan.`,
  tallyAgent: (exp: string): string => ` Modelin beklentisi ${exp}.`,
  tallyUser: (groupLc: string, exp: string): string =>
    ` Aynı ayarda ${groupLc} ajanın beklentisi ${exp}. Akran ve yaş grubu yalnızca ajanı etkiler; sen oynarken akranlar seyirci olarak görünür.`,
  tallyEmptyAgent: 'Henüz tur yok. Ajan 1 tur ya da 50 tur çalıştır; ayar değişince sayım sıfırlanır.',
  tallyEmptyUser: 'Henüz tur yok. Yeni tur başlat, sarıda Geç ya da Dur seç.',

  // ---- Sekme 3: haber ----
  contestedNote:
    'Ergenlerin kötü haberi tahminlerine katmadığı bulgusu, kullanılan iyi/kötü haber paradigmasının asimetriyi istatistiksel bir yapaylıktan üretebileceği gerekçesiyle eleştirildi (Shah ve ark. 2016). Sharot\'un ekibi yeni çalışmalarla asimetriyi savundu; tartışma sürüyor. Aşağıdaki profiller kitaptaki sonucun basit bir modelidir, kesin bir bilgi değil.',
  profAria: 'Yaş profili',
  estLabel: 'İlk tahminin',
  estHint: 'Bu olay sana ya da yaşıtlarına ne olasılıkla olur? Oyundaki gerçek olasılıklar kurgusaldır.',
  kindAria: 'Haber türü',
  kindChips: ['Haber: olayın kendi olasılığı', 'İyi haber', 'Kötü haber'],
  newsBtn: 'Haberi öğren',
  nextEv: 'Başka olay',
  secLabel: 'Yeni tahminin',
  secHint: 'Haberi ne kadar dikkate alırsan o kadar kaydır.',
  upd: 'Güncelle',
  chart4Aria: 'Güncelleme oranları',
  chart4H: 'Habere güncelleme oranı',
  chart4Svg: 'Her yaş profilinde iyi ve kötü haberde güncelleme oranı',
  chart4Legend: ['İyi haber', 'Kötü haber', 'Oran: tahminin haber yönünde kat ettiği payı (haber farkının yüzdesi)'],
  eventOf: (i: number, n: number): string => `Olay ${i} / ${n}`,
  goodNews: (actual: string, gap: number): string => `<b class="k-good">İyi haber:</b> gerçek olasılık ${actual}, düşündüğünden ${gap} puan düşük.`,
  badNews: (actual: string, gap: number): string => `<b class="k-bad">Kötü haber:</b> gerçek olasılık ${actual}, düşündüğünden ${gap} puan yüksek.`,
  noNews: 'Tahmin gerçeğe çok yakın: bu olayda haber yok. Başka olay seç ya da tahmini değiştir.',
  meters3: ['İyi haber güncellemesi', 'Kötü haber güncellemesi', 'Asimetri (puan)'],

  // ---- Betimleyici cümleler (model) ----
  ageHigh: (a: number, d: string, f: string): string => `${a} yaş: ödül sistemi güçlü (${d}), frontal korteks ancak ${f} olgun. Gaz pedalı hazır, fren henüz tam değil.`,
  ageChild: (a: number): string => `${a} yaş: ödül sistemi ve frontal korteks henüz düşük düzeyde; ikisi de gelişiyor.`,
  ageMid: (a: number, f: string): string => `${a} yaş: ödül sistemi sönmeye başladı, frontal korteks (${f}) yetişiyor; boşluk kapanıyor.`,
  ageAdult: (a: number, f: string): string => `${a} yaş: frontal korteks olgun (${f}), ödül sistemi daha sakin; denge yetişkin düzeyinde.`,
  driveAlone: (group: string, now: string): string => `Yalnız ${group}: sarıda geçme oranı yaklaşık ${now}.`,
  driveSame: (peers: number, group: string, alone: string, now: string): string => `${peers} akran izliyor ama ${group} grubunda risk neredeyse değişmiyor: ${alone} → ${now}.`,
  driveRatio: (peers: number, group: string, alone: string, now: string, ratio: string): string => `${peers} akran izliyor: ${group} grubunda risk ${alone} → ${now} (yaklaşık ${ratio} kat).`,
  newsBoth: (name: string, g: string, b: string): string => `${name}: iyi haberde farkın ${g}'i, kötü haberde ${b}'i kadar güncelleme. İki haber de tahmine işliyor.`,
  newsBadWeak: (name: string, g: string, b: string): string => `${name}: iyi haberde farkın ${g}'i, kötü haberde yalnızca ${b}'i kadar güncelleme. Kötü haber büyük ölçüde işlenmiyor.`,

  // ---- Alt bölümler ----
  how: [
    '<b>Çizelge.</b> Frontal korteks olgunluğu yaşa göre S biçimli bir eğridir ve yirmilerin ortasında doyar. Dopamin / limbik etkinlik ~15 yaşında tepe yapar, sonra söner. İkisi arasındaki fark "boşluk"tur. Gri madde çocuklukta artar, tepe yaptıktan sonra budanır; miyelinleşme tek yönlü artar. Eğrilerin biçimi çizimsel bir varsayımdır.',
    '<b>Sürüş.</b> Her turda sarının kalan süresi çarpışma riskini belirler. Ajan, sarıda geçme olasılığını şu kuralla bulur: ödül sinyali (Galvan accumbens eğrisi) eksi frontal denetim çarpı çarpışma riski. Akranlar yalnızca "akran duyarlılığı" yüksek yaşlarda (ödül sistemi güçlü ve frontal olgunluk düşük) accumbens sinyalini artırır ve vmPFC denetimini azaltır (Chein). Yalnızken denetim üç grupta da yeterli olduğundan oranlar benzerdir.',
    '<b>Haber.</b> İyi haberde güncelleme oranı her profilde aynıdır; kötü haberde oran yaşla artar. Yeni tahmin = ilk tahmin + oran × haber farkı. Kötü haber oranının yaş eğrisi, kitaptaki "ergen neredeyse hiç güncellemez, yetişkin ikisini de eder" bulgusuna uydurulmuş bir varsayımdır.',
  ],
  /** "Kitapta" kutusu: bağlantı metni, iki nokta sonrası açıklama, replikasyon rozetinden sonra gelen kuyruk. */
  book: [
    {
      link: 'Gardner ve Steinberg 2005; Chein ve ark. 2011',
      body: 'yalnızken ergen ve yetişkin benzer risk alır; iki akran ergende riski yaklaşık üç katına çıkarır, yetişkinde değiştirmez. Akranlar varken ergende vmPFC etkinliği azalır, ventral striatum artar.',
      tail: ' (etki büyüklükleri değişken, bazı çalışmalar yaşa özgü etkiyi bulamadı).',
    },
    {
      link: 'Galvan ve ark. 2006',
      body: 'çocukta accumbens tepkisi ödülden bağımsız; yetişkinde ödülle orantılı; ergende büyük ödülde çok güçlü, küçükte zayıf.',
      tail: ' (örneklem 37 kişi; bazı çalışmalar azalmış tepki buldu).',
    },
    {
      link: 'Moutsiana ve ark. 2013',
      body: 'ergenler iyi haberle tahminini yetişkin gibi günceller, kötü haberle neredeyse hiç.',
      tail: '.',
    },
    {
      link: 'Shaw ve ark. 2006',
      body: 'gri madde kalınlaşma ve budanma zamanlaması.',
      tail: '.',
    },
  ],
  foot: 'Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: frontal korteksin yirmili yaşların ortasında olgunlaşması, ergenlikte dopamin tepesi, akranlarla ergen riskinin yaklaşık üç katına çıkması ve yetişkinde değişmemesi, Galvan\'ın ödül büyüklüğü örüntüsü, ergenlerde kötü habere zayıf güncelleme. Tepe yaşları, eğri biçimleri, genç yetişkin değerleri ve haber oyunundaki olasılıklar modelin varsayımıdır.',

  // ---- Rehberli tur ----
  tour: [
    { title: 'Çocuk beyni', text: '8 yaşında hem ödül sistemi hem frontal korteks düşük düzeyde. İkisi de gelişmeye başlıyor.', look: 'Beyin silüetinin soluk renkleri ve çizelgedeki iki eğrinin düşük başlangıcı.' },
    { title: 'Ergenlikte boşluk', text: '15 yaşında dopamin sistemi tepe yapar, frontal korteks ise henüz yarı yolda. Gaz pedalı hazır, fren eksik: bu bir kusur değil, bir zamanlama farkı.', look: 'Çizelgede amber eğri ile mavi eğri arasındaki gölgeli boşluk.' },
    { title: 'Yirmilerin ortası', text: 'Frontal korteks en son olgunlaşır: 25 yaşında neredeyse tamamlanmıştır. Gri madde budanmış, miyelinli bağlantılar sağlamlaşmıştır, boşluk kapanmıştır.', look: 'Boşluğun sıfıra inmesi ve mor miyelin çizgilerinin kalınlaşması.' },
    { title: 'Yalnızken fark yok', text: 'Sarı ışık oyununda ergen, genç yetişkin ve yetişkin tek başına benzer sıklıkta geçer. Ergenin soğukkanlı muhakemesi yetişkininkine yakındır.', look: 'Üç grubun gri çubuklarının neredeyse aynı yüksekliği.' },
    { title: 'Akranlar izleyince', text: 'İki akran izlediğinde ergenin sarıda geçme oranı yaklaşık üç katına çıkar; yetişkinde neredeyse hiç değişmez. Modelde akranlar ergenin ödül sinyalini artırır, frontal denetimi azaltır.', look: 'Ergenin kırmızı çubuğu ile yetişkinin kırmızı çubuğu; ödül sinyali göstergesi.' },
    { title: 'Büyük ödül', text: 'Galvan örüntüsü: büyük ödülde ergenin accumbens tepkisi yetişkininkinin çok üstüne çıkar, küçük ödülde ise düşer. Ödül kaydırıcısını oynat; oyunu kendin de oynayabilirsin.', look: 'Accumbens grafiğinde seçili nokta; ödül büyüdükçe ergen eğrisinin yükselişi.' },
    { title: 'Kötü haber ve tartışma', text: 'Ergen profili iyi haberle tahminini günceller, kötü haberle neredeyse hiç. Ama bu bulgunun replikasyonu tartışmalı: asimetrinin istatistiksel bir yapaylık olabileceği öne sürüldü.', look: 'Ergen kümesinde yeşil ve kırmızı çubuk farkı; üstteki "tartışmalı" notu.' },
  ],
};

export type Strings = typeof TR;
