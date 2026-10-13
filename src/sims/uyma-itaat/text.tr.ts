// Uyma ve itaat simülasyonunun tüm kullanıcıya görünen Türkçe metni. İngilizce ikizi: text.en.ts (aynı yapı).

/** describeMilgram için koşul bayrakları. */
export interface MilCond {
  authorityFar: boolean;
  institutionOrdinary: boolean;
  learner: 0 | 1 | 2;
  diffused: boolean;
  peer: boolean;
}

export const TR = {
  lede: 'Bir grup ya da bir otorite, insanı açıkça yanlış olana ne kadar götürebilir ve bunu ne kırar?',
  tabsAria: 'Deney seçimi',
  tabAsch: 'Asch çizgi deneyi',
  tabMil: 'Milgram itaat deneyi',
  barAria: 'Anlık çıktılar',

  asch: {
    presetsAria: 'Asch senaryoları',
    presets: ['Temel (7 ortak)', 'İki ortak', 'Bir müttefik', 'Gizli cevap'],
    stageAria: 'Asch çizgi deneyi: bir referans çizgi, üç seçenek ve sırayla cevap veren katılımcılar',
    legendWrong: 'Yanlış cevap',
    legendRight: 'Doğru cevap',
    legendReal: 'Gerçek denek (en son konuşur)',
    legendAlly: 'Müttefik',
    play: 'Denemeyi oynat',
    rerun: 'Yeniden çalıştır',
    chartAria: 'Grup büyüklüğü ve uyma',
    chartTitle: 'Çoğunluk büyüklüğü ve uyma',
    chartSvgAria: 'Çoğunluk büyüklüğüne göre yanlışa uyma oranı eğrisi',
    legendCur: 'Şu anki ayar',
    legendBase: 'Temel koşul (oybirliği, açık cevap)',
    inputsAria: 'Asch girdileri',
    inputsTitle: 'Girdiler',
    capRef: 'Referans',
    capWhich: 'Hangisi referansla aynı uzunlukta?',
    seatsCap: (n: number) => `${n} ortak sırayla konuşur`,
    subject: 'denek',
    statusIdle: 'Deneme oynat: ortaklar sırayla cevap verir, denek en sona kalır.',
    statusSpoken: (spoken: number, n: number) => `${spoken} / ${n} ortak konuştu…`,
    statusOpenTurn: 'Sıra denekte…',
    statusPrivate: 'Denek cevabını gizlice yazıyor…',
    statusConform: (letter: string) => `Denek çoğunluğa uydu: yanlış cevap ${letter}.`,
    statusIndep: (letter: string) => `Denek bağımsız kaldı: doğru cevap ${letter}.`,
    tally: (played: number, conformed: number, p: number) =>
      `Oynatılan denemeler: ${played}, uyma: ${conformed} (tek tek denemelerde sonuç şansa bağlıdır; modelin oranı ${p}%).`,
    axisX: 'Oybirliğiyle yanlış söyleyen ortak sayısı',
    markNoticeable: 'belirgin',
    markPlateau: 'doyum',
    nameN: 'Çoğunluk büyüklüğü',
    hintN: 'Yanlışı oybirliğiyle söyleyen ortak sayısı; denek her zaman en son konuşur',
    fmtN: (v: number) => `${v} ortak + 1 denek`,
    nameAlly: 'Müttefik (doğruyu söyleyen bir muhalif) var',
    hintAlly: 'Odadaki tek bir kişi bile doğruyu söylerse oybirliği bozulur',
    nameOpen: 'Cevap nasıl veriliyor',
    optOpen: ['Açıkça, yüksek sesle', 'Gizlice, yazılı'],
    hintOpen: 'Gizli cevapta kimse denekle yüz yüze değildir',
    nameEasy: 'Çizgi farkı',
    hintEasy: 'Seçenekler birbirine ne kadar yakın: sola doğru ayırt etmek zorlaşır',
    fmtEasy: ['çok yakın', 'orta', 'belirgin'],
    meterRate: 'Uyma oranı',
    meterAny: 'En az bir kez uyan',
    meterNever: 'Hiç uymayan',
    /** tier: 0 az, 1 sınırlı, 2 yaklaşık üçte bir ya da fazla. r: tam yüzde. */
    say: (n: number, ally: boolean, open: boolean, r: number, tier: 0 | 1 | 2) => {
      const who = ally ? `${n} ortak yanlış, bir müttefik doğru söylüyor` : `${n} ortak oybirliğiyle yanlış söylüyor`;
      const how = open ? 'cevap açıkça veriliyor' : 'cevap gizlice yazılıyor';
      const tail = tier === 2 ? 'Denemelerin yaklaşık üçte biri ya da fazlasında uyuluyor.' : tier === 1 ? 'Uyma var ama sınırlı.' : 'Uyma belirgin biçimde az.';
      return `${who}; ${how}. Denemelerin ~%${r}'sinde yanlışa uyuluyor. ${tail}`;
    },
  },

  mil: {
    presetsAria: 'Milgram senaryoları',
    presets: ['Temel koşul', 'Otorite uzakta', 'Öğrenci aynı odada', 'Sorumluluk dağıldı', 'Akran direniyor'],
    stageAria: 'Voltaj merdiveni ve yüz ajanın ilerleyişi',
    legendGoing: 'Şok vermeye devam ediyor',
    legendQuit: 'Bıraktı',
    play: 'Merdiveni oynat',
    rerun: 'Yeniden çalıştır',
    chartAria: 'Bırakma noktaları',
    chartTitle: 'Kimler hangi voltta bıraktı',
    chartSvgAria: 'Her gerilimde şoka devam edenlerin oranı ve bırakma noktalarının dağılımı',
    legendStill: 'Hâlâ şok veren oranı',
    legendStopAt: 'Bu voltta bırakanlar',
    legendFull: "450 V'a kadar gidenler",
    inputsAria: 'Milgram girdileri',
    inputsTitle: 'Girdiler',
    stageThresholds: 'Çizgiler: modelde öğrencinin tepkisinin sertleştiği varsayılan eşikler',
    start: 'Başlangıç',
    going: (n: number) => `Şok vermeye devam eden: ${n}`,
    stopped: (n: number) => `Bırakan: ${n}`,
    reachedFull: (n: number) => `450 V'a kadar giden: ${n}`,
    expected: (p: number) => `Modelin beklentisi %${p}`,
    climbing: 'Merdiven çıkılıyor…',
    axisX: 'Son verilen şokun gerilimi',
    nameAuth: 'Otoritenin yakınlığı',
    hintAuth: 'Sağa doğru: araştırmacı yanı başında. Sola doğru: telefonla emir veriyor',
    fmtAuth: ['uzakta', 'ara', 'yanında'],
    namePres: 'Kurumun prestiji',
    hintPres: 'Sola doğru: sıradan bir büro. Sağa doğru: saygın bir üniversite',
    fmtPres: ['sıradan büro', 'orta', 'saygın'],
    nameLearn: 'Öğrencinin yakınlığı',
    learners: ['Ayrı oda', 'Aynı oda', 'Eli tutulacak kadar yakın'],
    hintLearn: 'Acıyı duymak, görmek ve dokunmak arttıkça şok vermek zorlaşır',
    nameDiff: 'Şoku başkası basıyor',
    hintDiff: 'Sorumluluk dağılır: öğretmen yalnızca yardımcı bir iş yapıyor',
    namePeer: 'İtaat etmeyen bir akran var',
    hintPeer: 'Yanındaki bir kişi bırakıp gidiyor: itirazın mümkün olduğunu gösterir',
    meterFull: "450 V'a ulaşan",
    meterEarly: '150 V öncesi bırakan',
    meterMedian: 'Ortanca son şok',
    /** med: ortanca son şokun gerilimi (V); 0 = hiç şok vermeden. */
    say: (c: MilCond, full: number, med: number) => {
      const bits: string[] = [];
      if (c.authorityFar) bits.push('otorite uzak');
      if (c.institutionOrdinary) bits.push('kurum sıradan');
      if (c.learner === 1) bits.push('öğrenci aynı odada');
      if (c.learner === 2) bits.push('öğrenci eli tutulacak kadar yakın');
      if (c.diffused) bits.push('şoku başkası basıyor');
      if (c.peer) bits.push('bir akran itaat etmiyor');
      const cond = bits.length ? bits.join(', ') : 'temel koşul';
      const m = med === 0 ? 'hiç şok vermeden' : `${med} V'ta`;
      return `${cond[0].toUpperCase() + cond.slice(1)}: katılımcıların %${full}'i 450 V'a kadar çıkıyor; ortanca katılımcı ${m} bırakıyor.`;
    },
  },

  how: {
    asch: 'Her kritik denemede uyma olasılığı, çoğunluk büyüklüğüne bağlı doyan bir eğriyle verilir: tek başına ~%1 hata, 3 kişide belirgin artış, ~6 kişide doyum ve oybirlikli 7 kişide yaklaşık üçte bir. Müttefik, gizli cevap ve çizgi farkı bu olasılığı çarpanlarla değiştirir. Sanal denekler 12 kritik deneme yapar ve her birinin duyarlılığı biraz farklıdır; sonuç tohumlu bir rastlantıyla çıkar.',
    mil: "Her ajanın bir toleransı vardır (ortalaması koşullara göre kayar, ayrıntısı rastlantı). Voltaj arttıkça zorlanma da artar; öğrencinin tepkisi sertleştikçe zorlanma üç eşikte (modelin varsayımı olarak 75, 150 ve 300 V) sıçrar. Ajan, zorlanma toleransını aşınca bırakır. Otoriteye yakınlık, kurumun prestiji ve sorumluluğun dağılması toleransı artırır; öğrencinin yakınlığı ve itaat etmeyen bir akran azaltır. Temel koşul %65'e göre ayarlıdır.",
    assumptions: 'Varsayımlar: ajanlar birbirinden bağımsızdır, gerçek insanlardaki bağlam, ikna ve etik kaygılar modele girmez.',
    aschLabel: 'Asch.',
    milLabel: 'Milgram.',
  },

  book: {
    /** rep: "(replikasyon: sağlam)" gibi hazır etiket. */
    asch: { link: 'Asch konformite deneyleri', note: 'Denemelerin yaklaşık üçte birinde uyma; üç kişide başlayıp altı kişi civarında en yükseğe çıkma. Etkinin içsel fikir değişiminden mi yoksa kamuya açık uyumdan mı geldiği tartışılıyor, bu yüzden açık/gizli cevap ayrımı var.' },
    mil: { link: 'Milgram itaat deneyleri', note: "İlk çalışmada %65 en yüksek şoka çıktı; araştırmacı başka odadayken, sıradan bir büroda ya da öğrenci aynı odadayken itaat azaldı. Gina Perry'nin arşiv çalışmasına göre öğretmenler şoku bildirilenden çok daha sık reddetmiş ve çoğu öğrencinin oyuncu olduğunu fark etmişti; bulguların anlamı (kör itaat mi, deneyin amacıyla özdeşleşme mi) tartışmalı." },
    sper: {
      link: 'Stanford Hapishane Deneyi',
      before: 'burada simüle edilmedi. Le Texier (2019) arşivlerle gardiyanlara ne yapacaklarının büyük ölçüde telkin edildiğini gösterdi; deney bugün ciddi yöntem sorunları olan bir gösterim sayılıyor. Aynı tasarımı yeniden kuran BBC çalışmasında (',
      after: ') mahkumlar direndi.',
    },
  },

  foot: "Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: Asch'ta tek başına ~%1 hata, oybirlikli çoğunlukta denemelerin ~üçte biri, 3 kişide belirginleşip ~6'da doyum; Milgram'da %65 temel koşul ve uzaklık/yakınlık yönleri. Müttefik, gizli cevap, sorumluluğun dağılması, akran direnişi ve eşik basamakları gibi büyüklükler modelin varsayımıdır; yalnızca yönleri kitaba ve genel bulgulara dayanır.",

  tour: [
    {
      title: 'Asch: oybirlikli çoğunluk',
      text: 'Yedi ortak sırayla aynı yanlış çizgiyi seçer; gerçek denek en son cevap verir. Kitaba göre denemelerin yaklaşık üçte birinde denek de yanlışa uyar. Tek başına cevaplayanlar ise yaklaşık %1 hata yapar.',
      look: 'Alt çubuktaki uyma oranı ve "Denemeyi oynat" ile sırayla cevap veren ortaklar.',
    },
    {
      title: 'Asch: kaç kişi yeter?',
      text: 'Çoğunluk üç kişiye çıkınca uyma belirgin artar. Kaydırıcıyı altıya, sonra on beşe çek: eğri düzleşir ve yeni kişiler pek bir şey eklemez.',
      look: 'Grafikte eğrinin 3 ile 6 arasında yükselip sonra düzleşmesi.',
    },
    {
      title: 'Asch: tek bir muhalif',
      text: 'Aynı yedi ortağa doğruyu söyleyen bir müttefik eklenince oybirliği bozulur ve uyma belirgin biçimde düşer. Denek artık tek başına olmadığını görür. Büyüklük nitel bir varsayımdır.',
      look: 'Kırmızı eğrinin kesikli temel eğrinin çok altına inmesi.',
    },
    {
      title: 'Milgram: temel koşul',
      text: 'Yüz ajan voltaj merdivenini (15 V ile 450 V) tırmanır; ayrı odadaki "öğrenciye" şok verdiklerini sanırlar. Kitaptaki ilk çalışmada %65 en yüksek gerilime kadar çıktı.',
      look: 'Izgarada kırmızı dolu noktaların sonda %65 civarında kalması.',
    },
    {
      title: 'Milgram: mesafe',
      text: 'Öğrenci aynı odaya, sonra eli tutulacak kadar yakına gelince ya da otorite uzaklaşınca itaat düşer. Kitap da bu yönü anlatır: araştırmacı başka odadayken, sıradan bir büroda ya da öğrenci aynı odadayken itaat azaldı.',
      look: 'Bırakma noktalarının sola kayması ve 450 V sütununun küçülmesi.',
    },
    {
      title: 'Ne kırar? Direniş mümkün',
      text: "İtaat etmeyen tek bir akran, itirazın mümkün olduğunu gösterir ve 450 V'a giden oranı çok düşürür. Sorumluluğu başkasına devretmek ise tersini yapar. Perry'nin arşiv çalışması, öğretmenlerin kitapta anlatılandan daha sık reddettiğini ve çoğunun öğrencinin oyuncu olduğunu fark ettiğini öne sürer; sonuçların anlamı tartışmalı.",
      look: 'Akran direniyor çipine, sonra "Sorumluluk dağıldı" çipine bas ve 450 V oranını karşılaştır.',
    },
  ],
};

export type Strings = typeof TR;
