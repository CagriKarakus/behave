// Nöroplastisite simülasyonunun kullanıcıya görünen tüm Türkçe metni.
// Sayı/yüzde/işaretli değerler çağıran tarafta biçimlenir; şablon fonksiyonları yalnızca cümleyi kurar.
export const TR = {
  lede: 'Deneyim, günler ve aylar içinde beynin fiziksel yapısını nasıl değiştirir?',
  tabsAria: 'Simülasyon bölümleri',
  tabs: { syn: 'Sinaps', prac: 'Pratik ve harita', str: 'Stres ve yapı' },
  sayAria: 'Anlık açıklama',
  inputs: 'Girdiler',

  /* ---------- Biçimleyici birimleri ---------- */
  fmt: {
    hz: (f: string): string => `${f} Hz`,
    sec: (s: number): string => `${s} sn`,
    min: (m: string): string => `${m} dk`,
    now: 'hemen sonra',
    afterMin: (m: number): string => `${m} dk sonra`,
    afterHr: (h: string): string => `${h} sa sonra`,
    afterDay: (d: string): string => `${d} gün sonra`,
    days: (d: number): string => `${d} gün`,
    daysWeeks: (d: number, w: number): string => `${d} gün (${w} hf)`,
    daysMonths: (d: number, m: number): string => `${d} gün (≈${m} ay)`,
    daysYears: (d: number, y: string): string => `${d} gün (≈${y} yıl)`,
    dayN: (d: number): string => `gün ${d}`,
  },

  /* ---------- 1) Sinaps ---------- */
  synNote: 'Tek bir sinaps. Presinaptik uç glutamat salar; glutamat AMPA ve NMDA reseptörlerine bağlanır. NMDA kanalı dinlenimde Mg²⁺ tıkacıyla kapalıdır; yeterli depolarizasyon tıkacı iter, kalsiyum (Ca²⁺) girer. Ca²⁺ düzeyi sinapsın kaderini belirler.',
  synChipsAria: 'Hazır uyarım örnekleri',
  synPresets: ['Zayıf: 1 Hz', 'Orta: 5 Hz', 'Yoğun: 100 Hz', 'Hebb: 1 Hz + ateşleme'],
  synSvgAria: 'Sinaps diyagramı: üstte presinaptik uç ve glutamat, altta AMPA ve NMDA reseptörlü postsinaptik dikencik; dikencikteki yeşil seviye kalsiyum düzeyini gösterir',
  synLegend: { glu: 'Glutamat', ampa: 'AMPA reseptörü', nmda: 'NMDA kanalı', mg: 'Mg²⁺ tıkacı', ca: 'Ca²⁺' },
  synLab: {
    pre1: 'Presinaptik', pre2: 'uç', cleft1: 'Sinaptik', cleft2: 'aralık', spine1: 'Dikencik', spine2: '(postsin.)',
    ampa: 'AMPA', nmda: 'NMDA', mg: 'Mg²⁺ tıkacı', dend: 'Dendrit', release: 'Glutamat salımı',
    thrD: 'LTD eşiği', thrP: 'LTP eşiği',
    dendFiring: (p: string): string => `Dendrit: postsinaptik nöron ateşleniyor (${p})`,
    dendPlain: 'Dendrit (postsinaptik nöron)',
  },
  synRun: 'Uyarımı yeniden oynat',
  synRunning: 'Uyarım sürüyor…',
  synChartAria: 'Sinaps gücü grafiği',
  synChartH: 'Sinaps gücü zaman içinde',
  synChartSvgAria: 'Uyarım sırasında ve sonraki dakika, saat ve günlerde sinaps gücünün seyri',
  synInputsAria: 'Uyarım girdileri',
  synChart: {
    stim: 'uyarım',
    ticks: ['10 dk', '1 sa', '1 gün', '1 hf'],
    axis: 'uyarımdan sonraki süre (logaritmik)',
    ltp: 'LTP', ltd: 'LTD', none: 'değişim yok',
  },
  synSliders: {
    f: { name: 'Presinaptik uyarım frekansı', hint: 'Saniyedeki uyarı sayısı. Seyrek uyarı sinapsı etkilemez; çok sık uyarı dendriti depolarize eder.' },
    d: { name: 'Uyarımın süresi', hint: 'Toplam uyarı sayısı = frekans × süre. Etki uyarı sayısıyla büyür ve doyar.' },
    p: { name: 'Postsinaptik nöron aynı anda ateşleniyor', hint: 'Hebb: alıcı nöron da ateşlenirse zar daha çok depolarize olur ve Mg²⁺ tıkacı kalkar.' },
    a: { name: 'Uyarımdan sonra bak', hint: 'Zamanda ileri git: erken evredeki değişim saatler içinde söner, kalıcılaşan değişim sürer.' },
  },
  zoneText: { ltp: 'LTP eşiğinin üstünde', ltd: 'iki eşik arasında (LTD bölgesi)', yok: 'alt eşiğin altında' },
  synHead: (f: string, d: string, pulses: number, post: string, unblock: string, zone: string): string =>
    `${f} × ${d} (${pulses} uyarı)${post ? `, postsinaptik ateşleme ${post}` : ''}: Mg²⁺ tıkacı ${unblock} kalktı, Ca²⁺ ${zone}.`,
  synNoChange: 'Sinaps gücü belirgin değişmiyor.',
  synTail: {
    stays: 'Değişim kalıcılaşıyor.',
    fades: 'Değişim kalıcılaşmıyor, saatler içinde sönüyor.',
    part: 'Değişimin bir kısmı kalıcılaşıyor.',
  },
  synUp: (base: string, to: string, now: string): string => `Sinaps gücü ${base} → ${to}${now ? ` (şimdi ${now})` : ''}; yeni AMPA reseptörleri yerleşiyor.`,
  synDown: (base: string, to: string, now: string): string => `Sinaps gücü ${base} → ${to}${now ? ` (şimdi ${now})` : ''}; AMPA reseptörleri azalıyor.`,
  synMeters: { unblock: 'Mg²⁺ tıkacı kalktı', ca: 'Ca²⁺ düzeyi', w: 'Sinaps gücü', ltp: 'LTP', ltd: 'LTD', sub: 'eşik altı' },
  hebb: {
    base: 'Hebb: birlikte ateşlenen birlikte bağlanır. Sinapsı uyaran nöronla alıcı nöron aynı anda etkinse bağ güçlenir.',
    ltpPost: 'Hebb ilkesi işliyor: sinaps uyarılırken alıcı nöron da ateşleniyor. Birlikte ateşlenen iki nöronun arasındaki bağ güçleniyor.',
    ltpFreq: 'Güçlenme bu kez postsinaptik ateşlemeden değil, çok sık gelen glutamatın tek başına yeterince sodyum sokup zarı depolarize etmesinden geliyor.',
    ltd: 'Orta düzey Ca²⁺ girişi: sinaps zayıflıyor (LTD). Gereksiz sinyalleri silmek, önemli sinyali belirginleştirir; genel unutma değildir.',
    postOnly: 'Postsinaptik ateşleme var ama kalsiyum girişi hâlâ eşiğin altında.',
  },

  /* ---------- 2) Pratik ve harita ---------- */
  pracNote: 'Motor korteks haritasında bir beceriyi yöneten alan, pratikle genişler. Hızlı bileşen (Hebb tipi güçlenme) pratikle kurulur ve bırakılınca bir günden kısa sürede söner. Yavaş bileşen (yapısal, yeni bağlantılar) birikir ve haftalarca kalır.',
  pcChipsAria: 'Hazır senaryolar',
  pracPresets: [
    { n: 'Piyano, 5 gün',
      note: 'Pascual-Leone: müzisyen olmayanlar günde 2 saat, birkaç gün piyano parmak alıştırması yaptı; el alanı büyüdü, pratik kesilince artış bir günden kısa sürede kayboldu.' },
    { n: 'Yalnızca hayal ederek',
      note: 'Aynı alıştırmayı yalnızca zihninde canlandıran grupta da yeniden haritalanma görüldü. Bu modelde zihinsel pratiğin payı fiziksel pratiğin yarısı kabul edildi (kitaptaki bulgu: etki var; replikasyon notu: genellikle daha küçük).' },
    { n: 'Piyano, 4 hafta',
      note: 'Dört haftalık alıştırmada genişleme pratikten sonra günlerce sürdü: uzun pratik kalıcı (yapısal) bir pay bırakır.' },
    { n: 'Jonglörlük, 3 ay',
      note: 'Draganski: üç ay jonglörlük öğrenenlerde hareketin görsel işlenmesiyle ilgili bölgede genişleme; bırakılınca artış kısmen geriledi. Günlük 60 dk bu modelin varsayımıdır.' },
    { n: 'Londra taksi, ≈3 yıl',
      note: 'Maguire: taksi şoförlerinde arka hipokampüs büyüktü. Ölçülen bölge hipokampüs (hacim), motor harita değil; burada aynı iki bileşenli mantık (hızlı + kalıcı) uygulanıyor.' },
    { n: 'Taksi adayı 4 ayda bırakır',
      note: 'Woollett ve Maguire: hipokampüs yalnızca sınavı geçen adaylarda büyüdü. Erken bırakan adayda kalıcı pay zamanla söner (burada da hipokampüs hacmi yerine aynı mantık kullanılıyor).' },
  ],
  pcSvgAria: 'Motor korteks haritası: el ve parmak alanı pratikle genişler, komşu alanlar daralır',
  pcLegend: { base: 'Başlangıç alanı', slow: 'Kalıcı (yapısal) genişleme', fast: 'Hızlı, geçici genişleme' },
  pcPlay: { pause: 'Duraklat', replay: 'Yeniden oynat', play: 'Oynat' },
  pcStop: 'Pratiği şimdi bırak',
  pcReset: 'Baştan',
  pcChartAria: 'Harita alanı grafiği',
  pcChartH: 'Harita alanı zaman içinde',
  pcChartSvgAria: 'Pratik sırasında ve bırakıldıktan sonra harita alanının seyri',
  pcInputsAria: 'Pratik girdileri',
  terr: ['Gövde', 'Omuz, kol', 'Bilek', 'El', 'Yüz'],
  map: {
    title: 'Motor korteks (şematik kesit)',
    baseSize: 'başlangıç boyutu',
    area: (s: string): string => `${s}% alan`,
    imagine: 'hayal',
    ongoing: (day: number, total: number): string => `Pratik sürüyor: gün ${day} / ${total}`,
    stopped: (n: number): string => `Pratik bırakıldı: ${n} gün önce`,
    none: 'Pratik yok',
  },
  pcChart: { practice: 'pratik', days: 'gün', total: 'toplam', slow: 'kalıcı pay' },
  pcSliders: {
    m: { name: 'Günlük pratik süresi', hint: 'Sürenin tamamı fiziksel ya da hayal edilen pratik olabilir. Süre arttıkça etki doyar.' },
    x: { name: 'Hayal ederek pratik oranı', hint: 'Zihinsel prova: parmak oynamadan alıştırmayı zihinde canlandırmak. Etkisi fiziksel pratiğin yarısı kabul edildi.' },
    d: { name: 'Pratik yapılan gün sayısı', hint: 'Sonra pratik bırakılır. Kısa pratik hızlı bileşeni, uzun pratik kalıcı payı doldurur.' },
    t: { name: 'Zaman', hint: 'Oynatmayı duraklatıp kaydırarak istenen güne bak.' },
  },
  pracSay: {
    none: 'Pratik yapılmıyor.',
    ongoing: (mental: string): string => `Pratik sürüyor${mental ? ` (${mental} hayal)` : ''}.`,
    stopped: (n: number): string => `Pratik ${n} gündür bırakıldı.`,
    line: (day: number, gain: string, slow: string, state: string): string => `Gün ${day}: el alanı ${gain}% (kalıcı pay ${slow}%). ${state}`,
  },
  pracMeters: { area: 'Harita alanı', slow: 'Kalıcı pay', dose: 'Günlük etkin doz' },

  /* ---------- 3) Stres ve yapı ---------- */
  strNote: 'Aynı stres, iki bölgede zıt yönde iz bırakır. Hipokampüsün dendritleri ve dikenleri kısalır; bazolateral amigdalanın (BLA) dendritleri uzar. Stres bitince hipokampüs toparlanır; amigdaladaki değişiklik çok daha kalıcıdır.',
  stChipsAria: 'Stres türü',
  stressKinds: [
    { n: 'Kronik stres', note: 'Kronik stres: hipokampüs dendritleri küçülür, bazolateral amigdala (BLA) dendritleri genişler (Vyas ve ark.).' },
    { n: 'Tek doz glukokortikoid', note: 'Mitra ve Sapolsky: tek bir kortikosteron dozu bile kaygıyı artırmaya ve BLA dendrit büyümesine yetti; sonuç 12 gün sonra ölçüldü.' },
    { n: 'Gönüllü koşu', note: 'Bağlam: kitaba göre korkuyla salgılanan glukokortikoid hipokampüs dendritlerini küçültürken, gönüllü koşuyla salgılanan benzer miktar onları büyütür. Amigdalanın devrede olup olmaması farkı belirliyor gibidir.' },
  ],
  stSvgAria: 'İki nöronun dendrit çizimi: solda hipokampüs nöronu, sağda amigdala nöronu',
  stLegend: { hip: 'Hipokampüs dendriti', amy: 'Amigdala (BLA) dendriti', spine: 'Dendrit dikeni' },
  stNeurons: { hip: 'Hipokampüs nöronu', amy: 'Amigdala (BLA) nöronu' },
  stTxtH: (d: string, s: string): string => `dendrit ${d} · diken ${s}`,
  stTxtA: (d: string): string => `dendrit ${d}`,
  stChartAria: 'Dendrit grafiği',
  stChartH: 'Dendrit uzunluğu zaman içinde',
  stChartSvgAria: 'Stres sırasında ve sonrasında hipokampüs ve amigdala dendrit uzunluğunun seyri',
  stInputsAria: 'Stres girdileri',
  stChart: { run: 'koşu', stress: 'stres', days: 'gün', amy: 'Amigdala', hip: 'Hipokampüs (kesik: diken)' },
  stSliders: {
    d: { name: 'Kronik stres süresi', hint: 'Stres ne kadar uzun sürerse hipokampüs dendritleri o kadar kısalır, amigdala dendritleri o kadar uzar.' },
    r: { name: 'Stres bittikten sonra geçen süre', hint: 'Stres kalkınca hipokampüs toparlanır; amigdaladaki değişiklik çok daha yavaş geri döner.' },
    t: { name: 'Zaman', hint: 'Oynatmayı duraklatıp kaydırarak istenen güne bak.' },
  },
  strSay: {
    runOn: 'Gönüllü koşu sürüyor',
    runOff: (n: number): string => `Koşu ${n} gündür bitti`,
    stOn: 'Stres sürüyor',
    stOff: (n: number): string => `Stres ${n} gündür bitti`,
    line: (day: number, phase: string, hipPct: string, hipShort: boolean, amyPct: string, amyLong: boolean): string =>
      `Gün ${day}: ${phase}. Hipokampüs dendritleri ${hipShort ? `${hipPct} kısalmış` : `${hipPct} uzamış`}, amigdala dendritleri ${amyPct} ${amyLong ? 'uzamış' : 'kısalmış'}.`,
  },
  strMeters: { hip: 'Hipokampüs dendriti', spine: 'Hipokampüs dikeni', amy: 'Amigdala dendriti' },

  /* ---------- Rehberli tur ---------- */
  tour: [
    {
      title: 'Yetersiz uyarım: sinaps değişmez',
      text: 'Tek bir sinaps ve saniyede bir uyarı. Glutamat AMPA reseptörlerine bağlanır ama zar yeterince depolarize olmaz, Mg²⁺ tıkacı yerinde kalır ve NMDA kanalından neredeyse hiç kalsiyum girmez.',
      look: 'dikenciğin içindeki yeşil Ca²⁺ seviyesi alt eşiğin altında kalıyor; grafik düz.',
    },
    {
      title: 'Orta düzey kalsiyum: LTD',
      text: 'Frekans orta düzeye çıkınca Ca²⁺ iki eşik arasında kalır. Bu orta düzey sinapsı zayıflatır: AMPA reseptörleri azalır (uzun süreli depresyon, LTD). Böylece gereksiz sinyaller silinir.',
      look: 'AMPA reseptörlerinin (mavi çubuklar) sayısı azalıyor, grafik aşağı iniyor.',
    },
    {
      title: 'Yoğun uyarım: LTP',
      text: 'Lømo ve Bliss tipi yoğun uyarımda (saniyede 100 uyarı) glutamat o kadar sık gelir ki zar depolarize olur, Mg²⁺ tıkacı kalkar ve Ca²⁺ yüksek eşiği aşar. Yeni AMPA reseptörleri yerleşir ve sinaps saatler boyunca güçlü kalır.',
      look: 'Mg²⁺ tıkacı kanaldan çıkıyor; grafikteki eğri yükselip uzun süre yüksek kalıyor.',
    },
    {
      title: 'Hebb: birlikte ateşlenen birlikte bağlanır',
      text: 'Frekans yine saniyede bir, ama alıcı nöron da aynı anda ateşleniyor. Depolarizasyon tıkacı kaldırıyor; tek başına etkisiz olan uyarı artık sinapsı güçlendiriyor.',
      look: 'aynı 1 Hz uyarının sonucu: ilk adımda düz, şimdi LTP.',
    },
    {
      title: 'Pratik haritayı büyütür, bırakmak geri alır',
      text: 'Günde 2 saat, 5 gün piyano alıştırması el alanını büyütür. Pratik kesilince büyümenin çoğu bir günden kısa sürede kaybolur: kısa pratik yalnızca geçici, Hebb tipi bir genişleme bırakır.',
      look: 'pratik bırakıldığında amber (hızlı) şeridin hızla küçülmesi.',
    },
    {
      title: 'Stres iki bölgeyi zıt yönde değiştirir',
      text: 'Dört hafta kronik stres: hipokampüs dendritleri ve dikenleri kısalır, amigdala dendritleri uzar. Stres bitince hipokampüs toparlanır, amigdaladaki değişiklik ise aylarca kalır. Plastisite iyi ya da kötü değildir: hem öğrenmeyi hem kaygıyı kalıcılaştırabilir.',
      look: 'oynatma sonunda mavi eğri 100%’e dönüyor, kırmızı eğri hâlâ yüksek.',
    },
  ],

  /* ---------- Sayfa altı notları ---------- */
  notes: {
    syn: {
      how: [
        'Her presinaptik uyarı AMPA reseptörlerinden sodyum sokar; uyarılar sık geldikçe toplanır ve zar depolarize olur. Depolarizasyon NMDA kanalındaki Mg²⁺ tıkacını iter. Postsinaptik nöronun aynı anda ateşlenmesi depolarizasyonu ayrıca artırır (Hebb eşleşmesi).',
        'Ca²⁺ girişi = saniyedeki uyarı sayısı × tıkacın kalkma oranı. Ca²⁺ düzeyi iki eşiğe göre okunur: alt eşiğin altında değişim yok, iki eşik arasında LTD (AMPA reseptörleri azalır), üst eşiğin üstünde LTP (yeni AMPA reseptörleri yerleşir). Değişimin boyu toplam uyarı sayısıyla büyür ve doyar.',
        'Varsayım (kitapta yok): yetersiz uyarımda değişim erken evrede kalır ve saatler içinde söner; yeterince güçlüyse kalıcılaşır. Eşikler, hızlar ve süreler nitel ayarlardır.',
      ],
      book: [
        { text: 'Lømo (1966), Bliss ve Lømo (1973): yoğun uyarım sonrası sinaps uzun süre güçlü kalır (LTP)', note: 'Tartışma olgunun varlığında değil, doğal öğrenmedeki payında.' },
      ],
      foot: "Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan: Hebb ilkesi, NMDA eşiği, Ca²⁺ aracılı LTP ve LTD'nin sinyali keskinleştirmesi. Kitap dışı: Mg²⁺ tıkacı ayrıntısı, frekans değerleri ve sürelerin kendisi. Bliss ve Lømo deneyi anestezili tavşanda perforan yola yüksek frekanslı uyarı verip saatlerce izleme düzeneğidir (kitap dışı bilgi).",
    },
    prac: {
      how: [
        'Günlük etkin pratik = fiziksel dakikalar + 0,5 × hayal edilen dakikalar. Hızlı bileşen bu dozla doyarak yükselir (yarı doyum: günde ≈ 60 dk) ve pratik kesilince birkaç saatlik bir zamanla söner. Yavaş bileşen hızlı bileşenin sürdüğü sürece birikir ve ≈ 160 günlük bir zamanla yavaşça söner. Harita alanı = 1 + hızlı + yavaş; komşu alanlar toplam yüzey sabit kalacak biçimde daralır.',
        'Tüm katsayılar nitel ayardır; kitaptaki bulguların yönünü ve sırasını yakalamak için seçildi.',
      ],
      book: [
        { text: 'Pascual-Leone (1995): piyano alıştırması, hayal edilen pratik ve bırakınca hızlı kayıp', note: 'Zihinsel pratiğin etkisi raporlanmış ama genellikle fiziksel pratikten küçük.' },
        { text: 'Draganski (2004): üç ay jonglörlük ve gri madde', note: 'Ancak MR hacim ölçümlerinin hücresel anlamı ve küçük örneklemler eleştirilmiş.' },
        { text: 'Maguire ve ark.: Londra taksi şoförlerinde hipokampüs', note: 'Örneklemler görece küçük, büyük bağımsız replikasyonlar sınırlı.' },
      ],
      foot: 'Nitel model. Kitaptan: günde 2 saat piyano alıştırması, birkaç gün ve dört hafta koşulları, hayal etme, bırakınca bir günden kısa sürede kayıp; üç ay jonglörlük ve kısmi gerileme; taksi şoförleri. Günlük 60 dk jonglörlük süresi ve tüm katsayılar kitap dışı varsayımdır.',
    },
    str: {
      how: [
        "Stres sürerken hipokampüs dendrit uzunluğu alt sınıra (başlangıcın ≈ %68'i) ≈ 2 haftalık zamanla yaklaşır; diken kaybı dendrit kaybından biraz büyüktür. Stres bitince ≈ 3 haftalık zamanla toparlanır.",
        'Amigdalada glukokortikoid, hızlı kurulan ve yavaş sönen gizli bir programı (BDNF artışı gibi düşünülebilir) tetikler. Dendrit büyümesi bu programın karekökünü izler; bu yüzden tek doz bile görünür bir büyüme verir. Büyüme çabuk, geri çekilme çok yavaştır.',
        'Gönüllü koşuda hipokampüs dendritleri büyür, amigdala devreye girmez. Katsayılar nitel ayardır; BLA dikenleri modelde değişmez.',
      ],
      book: [
        { text: 'Vyas ve ark. (2002), Mitra ve Sapolsky (2008): stres hipokampüs dendritlerini küçültür, BLA dendritlerini büyütür', note: 'Birçok laboratuvarda tekrarlandı. Bağlam önemli: koşuyla gelen glukokortikoid farklı etki eder.' },
      ],
      foot: 'Nitel model. Kitaptan: yön (hipokampüs küçülür, BLA büyür), tek dozun bile yetmesi (12. gün ölçümü), amigdala etkisinin kalıcı kaygıyla ilişkisi ve bağlam uyarısı. Kitap dışı: toparlanma zamanları ve yüzde değerleri. Çizimler şematiktir, gerçek morfoloji değildir.',
    },
  },
};

export type Strings = typeof TR;
