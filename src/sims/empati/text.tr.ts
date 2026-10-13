// Empati simülasyonu (ch14): kullanıcıya görünen tüm Türkçe metin.
// Dinamik cümleler şablon fonksiyonudur; sayılar çağıran tarafından dile göre biçimlenip gelir.

/** Replikasyon durumu etiketleri (t() ile gelir; iç anahtarlar Türkçe kalır). */
export interface Reps { sağlam: string; karışık: string; tartışmalı: string; bilinmiyor: string }

export const TR = {
  lede: 'Başkasının acısını hissetmek bizi yardıma mı götürür, yoksa kendi sıkıntımıza mı kilitler?',
  tabs: ['Bulaşma ve şefkat', 'Kime yardım?', 'Bağış ve ödül'],
  tablistLabel: 'Bölümler',
  barLabel: 'Anlık çıktılar',
  inputs: 'Girdiler',
  groups: ['Kafes arkadaşı', 'Açık renkli yabancı', 'Koyu renkli yabancı'],
  targetName: { cage: 'kafes arkadaşı', light: 'açık renkli yabancı', dark: 'koyu renkli yabancı' },
  strainName: { light: 'açık renkli', dark: 'koyu renkli' },

  e: {
    chipsLabel: 'Eğitim koşulları',
    presets: ['Empati eğitimi', 'Şefkat eğitimi', 'Başlangıç'],
    stageLabel: 'Solda acı çeken kişi, sağda gözlemci. Gözlemcinin gövdesinin kırmızı dolgusu kendi sıkıntısını, amber daire şefkatini gösterir. Oklar dikkatin kendine ya da karşıdakine yönelişini gösterir.',
    attnOther: 'dikkat: karşıdakine',
    attnSelf: 'kendine',
    sufferer: 'acı çeken',
    observer: 'gözlemci',
    legendSelf: 'kırmızı dolgu ve çizgi: kendi sıkıntısı',
    legendComp: 'amber: şefkat',
    legendArrow: 'ok: dikkatin yönü',
    chartSection: 'Sıkıntı ve şefkat zaman grafiği',
    chartTitle: 'Gözlemcide sıkıntı ve şefkat',
    chartLabel: 'Zaman içinde ortalama gözlemcinin sıkıntı ve şefkat düzeyi, kaçınma eşiğiyle birlikte',
    timeAxis: 'zaman (saniye, şematik)',
    threshold: 'kaçınma eşiği',
    distress: 'sıkıntı',
    compassion: 'şefkat',
    dotsSection: 'Kırk gözlemcinin tepkisi',
    dotsTitle: 'Kırk gözlemci ne yaptı?',
    dotsLabel: 'Kırk gözlemcinin tepkisi: yardım edenler, etkisiz kalanlar ve sıkıntıdan kaçınanlar',
    legHelp: 'yardım ediyor',
    legIdle: 'etkisiz kalıyor',
    legAvoid: 'sıkıntıdan kaçınıyor',
    tally: (n: number, help: number, idle: number, avoid: number, r: string): string =>
      `${n} gözlemciden ${help} yardım etti, ${idle} etkisiz kaldı, ${avoid} sıkıntıdan kaçındı. Sıkıntı ile yardım olasılığı arasındaki ilişki r = ${r}.`,
    play: 'Oynat',
    stop: 'Durdur',
    rerun: 'Yeni gözlemciler',
    inputsSection: 'Bulaşma girdileri',
    meters: ['Sıkıntı', 'Şefkat', 'Yardım eden'],
    sliders: {
      pain: ['Gözlenen acının şiddeti', 'Yüksek: acı çeken kişi daha çok sıkıntıda.'],
      self: ['Benlik odaklı perspektif', 'Yüksek: "bana olsaydı" diye düşünmek. Düşük: "ona ne hissettiriyor" diye düşünmek.'],
      train: ['Şefkat eğitimi', 'Sıcaklık ve bakım odağı; sıkıntıyı yatıştırır.'],
      stress: ['Stres düzeyi', 'Yüksek stres bulaşmayı güçlendirir ve yardımı azaltır.'],
    },
    /** focus: dikkat nerede; kind: sonuç türü; avoid/help: biçimlenmiş yüzdeler. */
    say: (focus: 'self' | 'other' | 'split', kind: 'over' | 'warm' | 'weak', avoid: string, help: string): string => {
      const f = focus === 'self' ? 'Dikkat çoğunlukla gözlemcinin kendi sıkıntısında'
        : focus === 'other' ? 'Dikkat acı çeken kişide' : 'Dikkat kendisi ile acı çeken arasında bölünmüş';
      const tail = kind === 'over' ? `sıkıntı eşiğin üstünde; ${avoid} kaçınıyor, yalnızca ${help} yardım ediyor.`
        : kind === 'warm' ? `şefkat yükseliyor, sıkıntı eşiğin altında kalıyor; ${help} yardım ediyor.`
          : `sıkıntı eşiğin altında ama şefkat zayıf; ${help} yardım ediyor.`;
      return `${f}: ${tail}`;
    },
  },

  b: {
    chipsLabel: 'Kurtarılacak sıçan',
    stageLabel: 'Sol: serbest sıçan. Orta: kapalı bölmede kurtarılmayı bekleyen sıçan. Sağ: çikolata. Oklar kurtarma ve paylaşma olasılığını gösterir.',
    observerBorn: 'gözlemci (açık renkli doğdu)',
    rearedBy: (strain: string): string => `bakıcı: ${strain} soy`,
    chocolate: 'çikolata',
    legRescue: 'kurtarma',
    legShare: 'çikolatayı paylaşma',
    legArrow: 'ok kalınlığı: olasılık',
    chartSection: 'Hedefe göre kurtarma ve paylaşma',
    chartTitle: 'Kime ne kadar yardım edilir?',
    chartLabel: 'Üç hedef için kurtarma ve çikolata paylaşma olasılıkları, çikolata referansıyla birlikte',
    legShare2: 'çikolata paylaşma',
    legChoc: (p: string): string => `çikolata kapısını açma (${p}, referans)`,
    mouseSection: 'Fare acı bulaşması',
    mouseTitle: 'Fare izlediği acıyı hisseder mi?',
    mouseLabel: 'İzlenen farenin acısına göre izleyici farenin kendi acı yanıtı: kafes arkadaşı ve yabancı için',
    mouseY: 'izleyicinin kendi acı yanıtı',
    mouseAlone: 'tek başına',
    few: 'az',
    many: 'çok',
    mouseX: 'izlenen farenin acısı (yalama)',
    mouseCage: 'kafes arkadaşı',
    mouseStranger: 'yabancı',
    mouseTally: (familiar: boolean, resp: string, alone: string, gc: boolean): string =>
      `${familiar ? 'Kafes arkadaşını' : 'Yabancı fareyi'} izleyen farenin kendi acı yanıtı: ${resp} (tek başına ${alone}). ` +
      (gc ? 'Glukokortikoid engelli: yabancıda da bulaşma var.' : 'Kafes arkadaşı dışında bulaşma neredeyse yok.'),
    rearLabel: 'Gözlemciyi büyüten soy',
    rear: ['Açık renkli bakıcı (kendi soyu)', 'Koyu renkli bakıcı (çapraz bakım)'],
    inputsSection: 'Yardım hedefi girdileri',
    meters: ['Kurtarma', 'Çikolata paylaşma', 'Acı bulaşması'],
    days: ['Öteki soyla birlikte yaşama', 'Gözlemcinin, büyütüldüğü soydan farklı soyla geçirdiği gün (modelin ölçeği).'],
    daysVal: (v: number): string => `${v} gün`,
    cost: ['Kurtarmanın bedeli', 'Yüksek: kapıyı açmak zor ya da riskli; "biz" olmayana yardım önce düşer.'],
    pp: ['İzlenen farenin acısı', 'Az yalayan fareyi izlemek acı yanıtını azaltır, çok yalayanı izlemek artırır.'],
    gc: ['Stres hormonu (glukokortikoid) engellendi', 'Açıkken yabancıda da acı bulaşması görülür (Martin ve ark.).'],
    /** target: hedef adı; rescue/share: biçimlenmiş yüzdeler; contagious: acı bulaşıyor mu. */
    say: (target: string, rescue: string, share: string, contagious: boolean): string =>
      `Hedef: ${target}. Kurtarma ${rescue}, kurtarılırsa çikolata paylaşımı ${share}.` +
      (contagious ? ' Fare tanıdıksa izlenen acı bulaşıyor.' : ' Fare yabancıysa izlenen acı neredeyse bulaşmıyor.'),
  },

  g: {
    chipsLabel: 'Ödül yapısı',
    presets: ['Saf fayda ağırlıklı', 'Karışık', 'Yalnızca sıcak ışıltı'],
    barsSection: 'Ödül devresi etkinliği',
    barsTitle: 'Ödül devresi: para alma, vergi, bağış',
    barsLabel: 'Para alırken, zorunlu vergide ve gönüllü bağışta ortalama ödül devresi etkinliği',
    barNames: ['Para alma', 'Zorunlu vergi', 'Gönüllü bağış'],
    scSection: 'Vergi ödülü ile cömertlik',
    scTitle: 'Vergide ödül yüksekse bağış da yüksek mi?',
    scLabel: 'Kırk katılımcı için vergi sırasındaki ödül devresi etkinliği ve gönüllü cömertlik',
    scX: 'vergi sırasında ödül devresi etkinliği',
    scY: 'gönüllü cömertlik',
    scTally: (r: string): string => `Vergi sırasında ödül devresi daha güçlü yanıt verenler gönüllü olarak daha cömert: r = ${r} (kitaptaki yön).`,
    dunnSection: 'Parayı kendine ya da başkasına harcamak',
    dunnTitle: 'Parayı nereye harcamak mutlu eder?',
    dunnLabel: 'Kendine ve başkasına 5 ve 20 dolar harcamanın mutluluk değişimi, dışarıdan tahminle birlikte',
    dunnCond: ['Kendine 5 $', 'Kendine 20 $', 'Başkasına 5 $', 'Başkasına 20 $'],
    legBar: 'dolu çubuk: harcayanın gerçek değişimi',
    legForecast: 'çizgi: dışarıdan tahmin',
    inputsSection: 'Ödül girdileri',
    meters: ['Ödül: vergi', 'Ödül: bağış', 'r: ödül–bağış'],
    altru: ['Başkasının yararına duyarlılık', 'Yüksek: vergi sırasında bile ödül devresi, hayır kurumunun kazancına yanıt verir.'],
    warm: ['Sıcak ışıltı (vermenin kendi ödülü)', 'Yüksek: gönüllü bağış ve başkasına harcama kişiyi ayrıca mutlu eder.'],
    amount: ['Vergi ya da bağışın tutarı', 'Beklenmedik paranın ne kadarı gıda bankasına gidiyor.'],
    rep: ['Ön kayıtlı replikasyon düzeyi', 'Açıkken başkasına harcamanın etkisi küçülür (Aknin ve ark. 2020; ×0,4 modelin varsayımı).'],
    /** pts: gönüllü bağışın vergiye göre puan farkı (0 = hemen hemen aynı); level: ilişki gücü. */
    say: (pts: number, level: 'strong' | 'moderate' | 'weak', r: string): string =>
      `Gönüllü bağışta ödül devresi zorunlu vergiye göre ${pts > 0 ? `${pts} puan yüksek` : 'hemen hemen aynı'}; ` +
      `vergi sırasındaki ödül ile cömertlik arasındaki ilişki ${level === 'strong' ? 'güçlü' : level === 'moderate' ? 'orta' : 'zayıf'} (r = ${r}).`,
  },

  how: [
    '<b>Bulaşma ve şefkat.</b> İki durum değişkeni var. Sıkıntı, acının şiddeti ve dikkatin kendine dönüklüğüyle yükselir; şefkat, dikkat karşıdakine döndükçe ve şefkat eğitimiyle yükselir. Şefkat sıkıntıyı yatıştırır. Kişisel sıkıntı eşiği aşıldıkça kaçınma olasılığı hızla artar. Kaçınmayan gözlemci, paylaşılan duygu ve şefkatle orantılı bir olasılıkla yardım eder. Kırk gözlemcinin duyarlılığı ve eşiği biraz farklıdır.',
    '<b>Kime yardım?</b> Her hedefin "bizden" sayılma düzeyi: kafes arkadaşı tam; yabancı için gözlemcinin o soya aşinalığı belirleyici. Büyütüldüğü soya tam aşina, öteki soya birlikte yaşadıkça artan bir aşinalık var. Kurtarma, bu düzey eksi bedel üzerinden yumuşak bir eşikle belirlenir; çikolata paylaşımı kurtarılanla bağa göre artar. Fare bölümünde acı bulaşması tanıdıklıkla ağırlıklanır.',
    '<b>Bağış ve ödül.</b> Zorunlu vergide ödül yalnızca başkasının yararına duyarlılıktan gelir. Gönüllü bağışta buna sıcak ışıltı (vermenin kendi ödülü) eklenir. Cömertlik, ikisinin karışımıdır. Başkasına harcamanın mutluluğu, aynı sıcak ışıltıdan gelir ve miktardan bağımsızdır.',
    'Varsayımlar: katsayılar, eşik ve ölçekler modelin varsayımıdır; sanal katılımcılar bağımsızdır; sıçanlar ve fareler tek bir "biz" ağırlığıyla özetlenir.',
  ],

  book: {
    items: [
      (s: Reps): string => `<a href="#/bolum/ch14?deney=ch14-e9">Klimecki, Singer ve Ricard: empati ve şefkat eğitimi</a> (replikasyon: ${s.bilinmiyor}; küçük örneklem, uzman meditasyoncular). Empati eğitimi yoğun amigdala etkinliği ve kaygılı ruh hali getirdi; şefkat eğitimi dopamin devresiyle bağlantılı etkinlik, olumlu duygu ve daha çok prososyallik getirdi. Eğitim koşulları yalnızca bu yönde kalibre edildi.`,
      (s: Reps): string => `<a href="#/bolum/ch14?deney=ch14-e7">Eisenberg ve ark.: kalp hızı ve yardım</a> (${s.bilinmiyor}). Acıyı görünce kalp hızı belirgin artanlar daha az yardım etti. <a href="#/bolum/ch14?deney=ch14-e8">Martin ve ark.</a> (${s.bilinmiyor}; tek çalışma, küçük insan örneklemi): glukokortikoid engellenince yabancılara karşı empati ortaya çıktı.`,
      (s: Reps): string => `<a href="#/bolum/ch14?deney=ch14-e4">Bartal ve ark.: sıçanlar birbirini kurtarır</a> (replikasyon: ${s.karışık}). Kafes arkadaşını kurtarma çikolata kadar güçlü bir motivasyondu; ikisi de mümkünken zamanın yarısından fazlasında çikolata paylaşıldı. Farklı soydan biriyle büyüyen sıçan o soya yardım etti. Davranışın empati mi, kendi sıkıntısını azaltma ya da sosyal temas isteği mi olduğu tartışmalı.`,
      (s: Reps): string => `<a href="#/bolum/ch14?deney=ch14-e2">Langford ve ark.: farelerde acı paylaşımı</a> (${s.sağlam}; ama "empati" adı tartışmalı). Daha çok yalayan fareyi izleyen daha çok yaladı. Bu yalnızca kafes arkadaşları arasında görüldü.`,
      (s: Reps): string => `<a href="#/bolum/ch14?deney=ch14-e12">Harbaugh ve ark.: vergi ve gönüllü bağış</a> (${s.bilinmiyor}; tek fMRI, 19 katılımcı). Gönüllü bağışta dopamin etkinliği ve memnuniyet zorunlu vergiye göre yüksekti; yani öz-çıkar bileşeni var. <a href="#/bolum/ch14?deney=ch14-e11">Dunn ve ark.</a> (${s.karışık}): yalnızca başkasına harcamak mutluluğu artırdı, miktar fark etmedi; ön kayıtlı replikasyon (Aknin ve ark. 2020) etkiyi belirgin biçimde küçük buldu.`,
      (s: Reps): string => `<a href="#/bolum/ch14?deney=ch14-e5">Piff ve ark.: sosyal sınıf ve şeker kasesi</a> (replikasyon: ${s.tartışmalı}). Büyük ve temsili örneklemli çalışmalar (Trautmann ve ark. 2013; Korndörfer ve ark. 2015) üst sınıfın daha etik dışı davrandığı bulgusunu tekrarlayamadı. Bu yüzden modele alınmadı; sosyal sınıfın kişinin ahlakını belirlediğini göstermez.`,
    ],
    moreTitle: 'Burada simüle edilmeyenler',
    more: (s: Reps): string => `<a href="#/bolum/ch14?deney=ch14-e3">Prairie vole teselli davranışı</a> (${s.bilinmiyor}): stresli partneri yalayıp tımarlama, ACC'deki oksitosine bağlı; stresli yabancıya yönelmedi. <a href="#/bolum/ch14?deney=ch14-e6">Ayna nöronları</a> (makak bulgusu ${s.sağlam}; empatiyi açıkladığı iddiası zayıf kanıtlı). <a href="#/bolum/ch14?deney=ch14-e10">Akupunktörler</a> (${s.bilinmiyor}): tekrarlanan maruziyet başkasının acısına yanıtı azaltabilir.`,
  },

  foot: 'Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: empati eğitiminde sıkıntı ve kaçınma, şefkat eğitiminde olumlu duygu ve yardım (Klimecki/Singer); sıkıntısı yüksek olanın daha az yardım etmesi; kafes arkadaşını kurtarmanın çikolata kadar güçlü olması ve paylaşımın zamanın yarısından fazlası; büyütüldüğü soya yardım; acı bulaşmasının tanıdıklara özgü olması; gönüllü bağışta vergiye göre daha yüksek ödül; başkasına harcamanın miktardan bağımsız mutluluğu. Eşik (%55), katsayılar, gün ölçeği, yüzdeler, ödül birimleri ve replikasyonda etkinin ×0,4 küçülmesi modelin varsayımıdır. Sıçan soyları insan gruplarının karşılığı değildir; "biz"in deneyimle kurulduğunu gösterir.',

  tour: [
    {
      title: 'Acıyı izlemek',
      text: 'Gözlemci, acı çeken birini izliyor. Acının duygusu ona geçiyor: kırmızı çizgi kendi sıkıntısı, amber çizgi acı çekene yönelik şefkat.',
      look: '"Oynat"a basınca iki eğrinin zamanla nasıl ayrıştığına bak.',
    },
    {
      title: 'Kendi sıkıntısına kilitlenmek',
      text: 'Dikkat "bana olsaydı"ya yönelince (empati eğitimi koşulu) sıkıntı eşiği aşıyor. Eşiği aşan gözlemcilerin çoğu kaçınıyor, yardım eden azalıyor.',
      look: 'Kırmızı eğrinin eşik çizgisini geçmesi ve noktalardaki çarpı işaretleri.',
    },
    {
      title: 'Karşıdakine dönmek',
      text: 'Aynı acı, dikkat karşıdakine ve sıcaklığa çevrilince (şefkat eğitimi koşulu) başka sonuç veriyor: sıkıntı eşiğin altında kalıyor, şefkat yükseliyor, yardım artıyor.',
      look: 'Amber eğrinin yükselmesi ve mavi dolu noktaların çoğalması.',
    },
    {
      title: 'Yardım kime gider?',
      text: 'Sıçan, kafes arkadaşını kurtarmak için çikolata kadar çaba harcıyor. Modelde, tanımadığı ve başka soydan bir sıçan için çok daha az harcıyor.',
      look: 'Çubuk grafikte "Koyu renkli yabancı" grubunun kurtarma çubuğu.',
    },
    {
      title: '"Biz" deneyimle genişler',
      text: 'Öteki soyla birlikte geçen gün arttıkça o soydan yabancılara yardım da artıyor. Kitaptaki bulguya göre sıçan, biyolojik soyuna değil büyüdüğü soya yardım ediyor.',
      look: "Gün kaydırıcısı 14'te koyu renkli yabancının kurtarma çubuğu. Çapraz bakım çipini de dene.",
    },
    {
      title: 'Vermenin kendi ödülü',
      text: 'Zorunlu vergide ödül devresi yalnızca başkasının yararına yanıt verir; gönüllü bağışta buna vermenin kendi ödülü eklenir. Başkasına harcamak da kendine harcamaktan daha mutlu eder, oysa dışarıdan tahmin tersidir.',
      look: 'Gönüllü bağış çubuğunun vergiden yüksek olması; Dunn grafiğinde dolu çubuk ile tahmin çizgisinin ters yönde olması.',
    },
  ],
};

export type Strings = typeof TR;
