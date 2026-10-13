// Sonsöz simülasyonu: kullanıcıya görünen tüm Türkçe metin.
type Tier = 'biz' | 'ara' | 'onlar' | 'ego';
const TIERW: Record<Tier, string> = { biz: 'biz', ara: 'arada', onlar: 'onlar', ego: 'merkez' };

export const TR = {
  common: {
    inputs: 'Girdiler',
    presets: 'Hazır durumlar',
  },
  view: {
    lede: `"İnsanlar şöyledir" demek neden yanıltır, ve biz/onlar sınırı ne kadar kolay kayar?`,
    tabsAria: 'Simülasyon bölümleri',
    barAria: 'Anlık çıktılar',
    tabs: {
      ort: 'Ortalama mı, dağılım mı?',
      biz: 'Biz/Onlar kaydırıcısı',
      harita: 'Geri bakış: kitabın haritası',
    } as Record<'ort' | 'biz' | 'harita', string>,
  },
  model: {
    shareLt: (pctText: string): string => `<${pctText}`,
    ort: {
      none: 'Ortalama aynı; ama eşik iki popülasyonun da çok uzağında, kimse aşmıyor. Eşiği indir ya da bağlamı kaydır.',
      main: (mean: number, a: string, b: string, tail: string, need: string): string =>
        `Ortalama aynı (${mean}) ama eşiği aşan A'da ${a}, B'de ${b}: ${tail}.${need}`,
      tailAll: (big: string): string => `eşiği aşanların neredeyse hepsi ${big}'den`,
      tailPct: (big: string, p: string): string => `eşiği aşanların ${p}'i ${big}'den`,
      need: (n: number): string => ` A'nın B'ye yetişmesi için ortalamasının ${n} puan artması gerekir.`,
    },
    biz: {
      head: (nBiz: number, total: number, nAra: number): string =>
        `Seçili kişi için ${nBiz} / ${total} kişi "biz"${nAra ? `, ${nAra} kişi arada` : ''}.`,
      same: (head: string): string => `${head} Sınır eski gruptan geçiyor: kendi grubu "biz", öbürü "onlar".`,
      redrawn: (head: string, gained: number, lost: number): string =>
        `${head} Sınır yeniden çizildi: eski dış gruptan ${gained} kişi biz sayıldı, eski grubundan ${lost} kişi artık "biz" değil.`,
      widened: (head: string, gained: number): string => `${head} Sınır genişledi: eski dış gruptan ${gained} kişi de "biz" sayıldı.`,
      narrowed: (head: string, lost: number): string => `${head} Eski grubundan ${lost} kişi "biz"in dışına çıktı.`,
    },
  },
  ort: {
    scenarios: { same: 'Aynı ortalama', tense: 'Gergin bağlam', twin: 'İki tepeli B', far: 'Çok uç eşik' } as Record<string, string>,
    cardAria: 'İki popülasyonun dağılımı',
    cardTitle: 'Aynı ortalama, iki dağılım',
    legend: ['dolu: eşiği aşan, boş: aşmayan', 'modelin dağılım eğrisi', 'eşik'] as string[],
    pick: 'Birer kişi çek',
    reseed: 'Başka örneklem',
    pickHint: 'Üçgen çekilen kişiyi gösterir; bağlam değişince aynı kişi yer değiştirir.',
    sliders: {
      mean: { name: 'Ortalama eğilim', hint: 'İki popülasyonun ortak ortalaması: bir davranışa yatkınlık puanı.' },
      sdA: { name: 'A: bireysel yayılım', hint: 'Küçük: herkes birbirine benzer.' },
      sdB: { name: 'B: bireysel yayılım', hint: 'Büyük: insanlar birbirinden çok farklı.' },
      thr: { name: 'Eşik (ör. şiddet eşiği)', hint: 'Bu puanın üstüne çıkan kişi davranışa geçer.' },
      ctx: { name: 'Bağlam', hint: 'Sağa: gergin, tehditli ortam. Sola: sakin ortam. İki popülasyonu da aynı miktar kaydırır.' },
    } as Record<'mean' | 'sdA' | 'sdB' | 'thr' | 'ctx', { name: string; hint: string }>,
    ctxVal: (v: number): string => (v > 0 ? `+${v} gergin` : v < 0 ? `${v} sakin` : '0'),
    shapeChips: { bell: 'B: tek tepeli', twin: 'B: iki tepeli' } as Record<'bell' | 'twin', string>,
    shapeAria: 'B popülasyonunun biçimi',
    aLabel: (sd: number): string => `A: yayılım ${sd}`,
    bLabel: (sd: number, twin: boolean): string => `B: yayılım ${sd}${twin ? ', iki tepeli' : ''}`,
    over: (share: string): string => `eşiği aşan ${share}`,
    meanAxis: (n: number): string => `ortalama ${n}`,
    thrAxis: (n: number): string => `eşik ${n}`,
    plotAria: (desc: string): string => `A ve B popülasyonlarının dağılımı. ${desc}`,
    noteNoA: `A'da eşiği aşan neredeyse yok; B'de belirgin bir kuyruk var. Ortalamalar aynı.`,
    noteRatio: (x: string): string => `Eşiği aşanların oranı B'de A'nın yaklaşık ${x} katı; ortalamalar aynı.`,
    noteAHeavier: `Bu ayarda kuyruk A'da daha ağır; ortalamalar aynı.`,
    noteClose: 'Bu ayarda iki popülasyonun kuyrukları birbirine yakın.',
    picked: (a: number, aAbove: boolean, b: number, bAbove: boolean): string =>
      `Çekilen kişiler: A'dan ${a} (eşiğin ${aAbove ? 'üstünde' : 'altında'}), B'den ${b} (eşiğin ${bAbove ? 'üstünde' : 'altında'}). Ortalama bunu söylemez.`,
    meters: { a: 'A: eşiği aşan', b: 'B: eşiği aşan', fromB: `Aşanların B'den payı` },
    tour: [
      {
        title: 'Aynı ortalama, iki popülasyon',
        text: `A'da herkes ortalamaya yakın; B'de insanlar birbirinden çok farklı. İkisinin ortalaması da 50. Eşik, bir kişinin davranışa geçtiği nokta (ör. şiddet eşiği).`,
        look: `Eşik çizgisinin sağındaki dolu sütunlar: A'da yok, B'de var.`,
      },
      {
        title: 'Ortalama kuyruğu söylemez',
        text: `Birer kişi çek: ortalamaları aynı olduğu için hangisinin puanı yüksek diye sorsan neredeyse yazı tura. Yine de eşiği aşanların çok büyük kısmı B'den gelir.`,
        look: `Alt çubuktaki "aşanların B'den payı" ve üçgen işaretler.`,
      },
      {
        title: 'Bağlam dağılımı kaydırır',
        text: 'Gergin bir ortam herkesi aynı miktar sağa iter. Aşan sayısı en çok geniş dağılımda patlar; dar dağılım hâlâ eşiğin çok altında. Eşiği aşan pay, ortalamadan çok kuyruğa bağlıdır.',
        look: 'A ve B yüzdelerinin ikisi de artar; B ile A arasındaki oran ise çok büyük kalır.',
      },
      {
        title: 'Biçim de önemli',
        text: `B'yi iki tepeli yap: ortalama ve yayılım aynı, ama insanlar iki kümeye ayrılmış ve ortada neredeyse kimse yok. Eşik 60'ta B'nin payı A'nınkinin kat kat üstünde.`,
        look: 'Ortalamanın (kesikli çizgi) tam üstünde sütun yok: "ortalama insan" yok.',
      },
      {
        title: '"İnsanlar şöyledir" yanıltır',
        text: 'Bulgular çoğu zaman ortalama eğilimi anlatır; bireysel farklılık ve istisna her yerdedir (Sonsöz). Ortalamayı bilmek, kimin hangi uçta olduğunu bilmek değildir.',
        look: 'Kaydırıcıları oyna: ortalamayı değiştirmeden yayılımı artırınca da eşiği aşan pay artıyor.',
      },
    ] as Array<{ title: string; text: string; look: string }>,
  },
  biz: {
    presets: { base: 'Başlangıç', label: 'Ortak etiket', goal: 'Ortak hedef', contact: 'Temas + hedef', threat: 'Tehdit' } as Record<string, string>,
    netAria: 'Kişiler ağı',
    netTitle: `Kimin "biz" olduğu: merkezdeki kişiye göre`,
    netSvgAria: '24 kişi: iki ilk grup ve iki ortak etiket. Merkezdeki kişi seçilir; halkalı olanlar biz sayılır.',
    netNote: 'Merkezdeki kişiyi değiştirmek için bir kişiye dokun ya da yukarıdaki düğmeleri kullan.',
    legend: [
      'kare: ilk grup 1', 'daire: ilk grup 2', 'mavi: ortak etiket 1', 'taralı: ortak etiket 2',
      'düz halka: biz', 'kesikli: arada', 'soluk: onlar',
    ] as string[],
    groupLabels: ['İlk grup 1 (kareler)', 'İlk grup 2 (daireler)'] as string[],
    center: TIERW.ego,
    person: (n: number, circle: boolean, hatched: boolean, tier: Tier): string =>
      `Kişi ${n}: ${circle ? 'daire' : 'kare'}, ${hatched ? 'taralı' : 'mavi'} etiket, ${TIERW[tier]}`,
    egoChips: { e0: 'Kare grubundan bak', e1: 'Daire grubundan bak' } as Record<'e0' | 'e1', string>,
    egoAria: 'Merkezdeki kişi',
    sliders: {
      goal: { name: 'Ortak hedef', hint: 'İki grubun birlikte ulaşması gereken bir amaç.' },
      label: { name: 'Yeni ortak etiket', hint: 'Gruplar arasını kesen bir etiket (ör. aynı forma rengi) öne çıkıyor.' },
      contact: { name: 'Temas', hint: 'Gruplar arası gerçek karşılaşma; ortak hedef varsa daha iyi işler.' },
      threat: { name: 'Tehdit', hint: 'Ortamdaki baskı: sınırı sertleştirir, öteki etkileri azaltır.' },
      time: { name: 'Geçen süre', hint: 'Hedef, etiket ve temas hemen değil, zamanla oturur.' },
    } as Record<'goal' | 'label' | 'contact' | 'threat' | 'time', { name: string; hint: string }>,
    timeVal: (v: number): string => (v < 15 ? 'ilk günler' : v < 45 ? 'haftalar' : v < 85 ? 'aylar' : 'yıllar'),
    play: 'Zamanı oynat',
    pause: 'Duraklat',
    tlAria: 'Zaman çizelgesi',
    tlTitle: `Zaman çizelgesi: kim "biz" sayılıyor?`,
    tlLegend: ['eski grubundan biz sayılan', 'eski dış gruptan biz sayılan'] as string[],
    tlStart: 'başlangıç',
    tlMid: 'orta',
    tlEnd: 'uzun süre',
    tlYAxis: 'biz sayılan kişi',
    tlXAxis: 'geçen süre',
    tlSvgAria: (oldStart: number, newStart: number, oldEnd: number, newEnd: number): string =>
      `Geçen süreye göre biz sayılanlar: başlangıçta eski grubundan ${oldStart}, eski dış gruptan ${newStart}; uzun sürede ${oldEnd} ve ${newEnd}.`,
    tlNote: (old: number, nIn: number, neu: number, nOut: number): string =>
      `Şu an (dikey çizgi): eski grubundan ${old} / ${nIn}, eski dış gruptan ${neu} / ${nOut} kişi "biz".`,
    meters: { count: `"Biz" sayısı`, within: 'Eski grup içi yakınlık', outside: 'Eski grup dışı yakınlık' },
    tour: [
      {
        title: 'Etiket sınırı çizer',
        text: `Merkezdeki kişi için "biz", kendi ilk grubudur; öbür grup "onlar". Kitaba göre anlamsız bir ölçüt bile içgrup kayırmacılığı doğurur (minimal grup deneyleri).`,
        look: 'Düz halkalı kişiler yalnızca merkezle aynı şekilde olanlar.',
      },
      {
        title: 'Yeni bir ortak etiket',
        text: 'İki grubu kesen bir etiket (aynı forma rengi) öne çıkınca ırk benzeri kategoriler solar. Kitaptaki gömlek rengi deneyinde karıştırmalar böyle kaydı. Sınır silinmez, yeniden çizilir.',
        look: 'Mavi (ya da taralı) kişilerin halkası iki gruptan da geliyor.',
      },
      {
        title: 'Ortak hedef sınırı yumuşatır',
        text: `Birlikte ulaşılması gereken bir hedef, karşı gruptakileri "onlar"dan "arada"ya taşır. Tek başına tam bir "biz" yapmaz.`,
        look: 'Kesikli halkalar ve çizelgede yükselen kesikli çizgi.',
      },
      {
        title: 'Temas, koşullar uygunsa',
        text: `Gruplar arası temas ancak ortak hedef gibi uygun koşullarla işe yarar ve zaman ister. Kitapta temasın yararı ve koşulları var; çalışmaların toplam sonucu "karışık".`,
        look: 'Zaman çizelgesinde yükselişin başlangıçta değil, süre geçince gelmesi.',
      },
      {
        title: 'Tehdit işleri bozar',
        text: 'Aynı iyi koşullar (ortak hedef, etiket, temas) ama ortam tehditli: sınır sertleşir, ortak payda daha az işler. Bu etki modelin varsayımıdır.',
        look: `Tehdit düşükken ve yüksekken "biz" sayısının farkı.`,
      },
      {
        title: '"Biz" bir ayardır',
        text: 'Sınır sabit değil, kolayca yönlendirilebilir: hedef, etiket, temas, tehdit ve zaman onu iki yöne de kaydırır (Sonsöz). Bu, nefretin de, ortak paydanın da aynı mekanizmadan geldiği anlamına gelir.',
        look: 'Tehdidi indirip hedefi artır: sınırın yeniden çizildiğini izle.',
      },
    ] as Array<{ title: string; text: string; look: string }>,
  },
  map: {
    groups: {
      hepsi: 'Hepsi', zaman: 'Saniyelerden aylara', gelisim: 'Gelişim, gen, kültür, evrim', biz: 'Biz/Onlar ve seçimler', ek: 'Giriş ve ekler',
    } as Record<string, string>,
    chapters: {
      intro: { label: 'Giriş', title: 'Giriş', lesson: 'Bir davranışın nedeni tek kutuda aranmaz: biyoloji gerekir ama yetmez, açıklamalar zaman merdiveninde birbirini içerir.' },
      ch01: { label: 'Bölüm 1', title: 'Davranış', lesson: 'Saldırganlık, özveri ve empati gibi kavramlar tanımlaması zor ve değer yüklüdür; kitap davranışın en iyi ve en kötü hâllerini birlikte inceler.' },
      ch02: { label: 'Bölüm 2', title: 'Bir saniye önce', lesson: 'Amigdala, frontal korteks ve dopamin devreleri birbirini dengeler; frontal korteks, doğru olan zor olduğunda o zoru yaptırır.' },
      ch03: { label: 'Bölüm 3', title: 'Saniyeler ila dakikalar önce', lesson: 'Fark edilmeyen duyusal ve sosyal ipuçları davranışı kaydırır; insan sanıldığından daha az özerk ve rasyonel karar verir.' },
      ch04: { label: 'Bölüm 4', title: 'Saatler ila günler önce', lesson: 'Hormonlar davranışı doğrudan üretmez, bağlamdaki eğilimi güçlendirir; oksitosinin bağ etkisi çoğunlukla "biz" ile sınırlıdır.' },
      ch05: { label: 'Bölüm 5', title: 'Günler ila aylar önce', lesson: 'Deneyim sinapsları ve devreleri yeniden biçimlendirir; nöroplastisite değer yüklü değildir, hem iyileştirebilir hem zarar verebilir.' },
      ch06: { label: 'Bölüm 6', title: 'Ergenlik', lesson: 'Frontal korteks yirmili yaşların ortasına kadar olgunlaşır; bu sırada ödül ve akran onayı öne geçer.' },
      ch07: { label: 'Bölüm 7', title: 'Çocukluk ve rahim', lesson: 'Erken yaşantılar eğilimleri kalıcı biçimde kaydırır ama tek başına kader değildir.' },
      ch08: { label: 'Bölüm 8', title: 'Genler', lesson: 'Genler kesinlik değil eğilim, duyarlılık ve kırılganlık verir; ne anlama geldikleri çevreye bağlıdır.' },
      ch09: { label: 'Bölüm 9', title: 'Yüzyıllar ila binyıllar önce', lesson: 'Kültür ekoloji ve geçim biçimiyle birlikte davranışı şekillendirir; kalabalık şiddeti tek başına üretmez, mevcut eğilimleri büyütür.' },
      ch10: { label: 'Bölüm 10', title: 'Davranışın evrimi', lesson: `Bireysel seçilim, akraba seçilimi ve karşılıklı özgecilik işbirliğini açıklar; "türün iyiliği için" varsayımı çürütülür.` },
      ch11: { label: 'Bölüm 11', title: 'Biz ve Onlar', lesson: 'Beyin Biz/Onlar ayrımını hızlı ve otomatik kurar; anlamsız bir işaret bile kayırmacılık doğurur, sınır ise yeniden çizilebilir.' },
      ch12: { label: 'Bölüm 12', title: 'Hiyerarşi, itaat ve direniş', lesson: 'Statünün anlamı stresi ve sağlığı belirler; durumsal baskı uymayı ve itaati güçlendirir ama direniş de mümkündür.' },
      ch13: { label: 'Bölüm 13', title: 'Ahlak', lesson: 'Ahlaki kararların çoğu önce sezgiyle verilip sonra gerekçelendirilir; sezgi mi akıl mı gerektiği sorunun türüne bağlıdır.' },
      ch14: { label: 'Bölüm 14', title: 'Empati', lesson: 'Empati tek bir duygu değil, bulaşmadan bakış açısı almaya uzanan bir spektrumdur; yardım çoğu zaman yakına ve kendi gruba yönelir.' },
      ch15: { label: 'Bölüm 15', title: 'Metaforlar', lesson: `Beyin metaforla gerçeği karıştırır; bir grubu "böcek" diye anan dil insanlıktan çıkarmaya zemin hazırlar, kutsal değerlere saygı ise uzlaşmaya kapı açabilir.` },
      ch16: { label: 'Bölüm 16', title: 'Özgür irade ve ceza adaleti', lesson: `Kararları veren ayrı bir "homunkülüs" fikri biyoloji karşısında aşınır; ceza hak edilmişliğe değil, korunmaya odaklanabilir.` },
      ch17: { label: 'Bölüm 17', title: 'Savaş ve barış', lesson: 'Aynı mekanizmalar hem şiddeti hem barışı besler; Biz/Onlar sınırları bağlama göre kayar, uygun koşullarda temas ve işbirliği önyargıyı azaltabilir.' },
      app1: { label: 'Ek 1', title: 'Nörobilim 101', lesson: 'Nöron bir eşik değerine göre tam ya da hiç ateşler; sinapslar ve devreler, davranışın temel malzemesidir.' },
      app2: { label: 'Ek 2', title: 'Endokrinolojinin temelleri', lesson: 'Hormonlar kanla taşınır, etkileri saatler ve günler sürer; etkiyi hedef hücredeki reseptör ayarlar.' },
      app3: { label: 'Ek 3', title: 'Protein temelleri', lesson: `Proteinin işlevi üç boyutlu şekline bağlıdır; DNA'dan RNA'ya ve proteine akış, mutasyonlar ve alel çeşitliliği hormon ve reseptörlerin temelidir.` },
    } as Record<string, { label: string; title: string; lesson: string }>,
    themes: [
      { term: 'Ortalama ve bireysel varyasyon', text: 'Bulgular ortalama eğilimleri anlatır; bireyler arasındaki fark çoğu zaman en ilginç kısımdır.' },
      { term: 'Bağlam', text: 'Genler ve hormonlar davranışı tek başına belirlemez; aynı biyolojik etki ortama göre iyi ya da kötü sonuç verebilir.' },
      { term: 'Gen-çevre etkileşimi', text: 'Genler kesinlik değil yatkınlık ve kırılganlık taşır.' },
      { term: 'Biz ve Onlar', text: 'Gruplar arası ayrım doğal olarak kurulur ve saniyeler içinde, bilinç dışı ipuçlarıyla değiştirilebilir.' },
      { term: 'Rasyonalizasyon', text: 'Gerekçeler çoğu zaman duyguların ardından, onları savunmak için gelir.' },
      { term: 'Biliş ve duygu', text: 'Akıl yürütme ile duygular birlikte çalışır; soru, hangisinin baskın olduğudur.' },
      { term: 'Statü ve hiyerarşi', text: 'Sosyoekonomik statü, hiyerarşik primatlarda görülmemiş bir boyun eğdirme biçimi yaratmıştır.' },
      { term: 'Beyin ve kültürün birlikte evrimi', text: 'Beyin yapısı ile kültürel normlar birbirini etkileyerek değişir.' },
    ] as Array<{ term: string; text: string }>,
    listAria: 'Bölüm bölüm harita',
    listTitle: 'Bölüm bölüm harita',
    themesAria: 'Sonsöz temaları',
    themesTitle: `Sonsöz'ün tekrar eden temaları`,
    simsAria: 'Simülasyonlar',
    here: (tab: 'ort' | 'biz'): string => `Bu simülasyonda: ${tab === 'ort' ? '1. sekme' : '2. sekme'}`,
    chipsAria: 'Bölüm grubu',
    say: (chapters: number, group: string, withSim: number, sims: number): string =>
      `Haritada ${chapters} bölüm (${group.toLowerCase()}); ${withSim} bölümün simülasyonu var, toplam ${sims} simülasyon. Bir bölümün satırından simülasyona geçilir.`,
    meters: { shown: 'Gösterilen bölüm', withSim: 'Simülasyonlu bölüm', sims: 'Simülasyon' },
    tour: [
      {
        title: 'Bir haritada kitap',
        text: 'Kitap bir davranışı zaman merdiveninde açar: bir saniye önceden evrime kadar. Her satırda bölümün tek cümlelik dersi ve varsa simülasyonlarına giden düğmeler var.',
        look: 'Satırların altındaki ▸ düğmeleri ilgili simülasyonu açar.',
      },
      {
        title: 'Saniyelerden aylara',
        text: 'Önce beyin ve hormonlar: amigdala, frontal korteks, dopamin, hormonlar ve deneyim. Hiçbiri tek başına davranışı üretmez; bağlam hepsinin üzerinde.',
        look: 'Bölüm 4 satırı: hormon bir eğilimi büyütür, davranışı yaratmaz.',
      },
      {
        title: 'Gelişim, gen, kültür, evrim',
        text: 'Ergenlikten evrime uzanan basamaklarda ortak ders aynı: eğilim var, kader yok. Çocukluk, genler ve kültür birbirinden ayrılamaz.',
        look: 'Bölüm 8 satırı: genler eğilim ve kırılganlık verir.',
      },
      {
        title: 'Biz/Onlar ve seçimler',
        text: 'Kitabın ikinci yarısı Biz/Onlar sınırına, uymaya, ahlaka, empatiye ve savaşa bakar. Sınırın bağlamla kayabilmesi hem tehlike hem umut.',
        look: 'Bölüm 11 ve 17 satırları: ikisi de sınırın yeniden çizilebildiğini anlatır.',
      },
      {
        title: 'Ortak ders',
        text: 'Ortalama değil dağılım, tek neden değil bağlam, sabit değil kaydırılabilir sınır. Sonsöz buna şunu ekler: karmaşıklık umutsuzluk değil sorumluluk gerektirir; bilimsel düşünce ile şefkat karşıt değildir.',
        look: 'Temalar listesi: her tema için kitapta nereye bakılacağı yazılı.',
      },
    ] as Array<{ title: string; text: string; look: string }>,
  },
  notes: {
    epilogue: 'Sonsöz',
    ort: {
      how: [
        'Her popülasyon bir dağılımdır. A dar bir çandır. B ya geniş bir çandır ya da iki tepelidir (iki alt küme; ortalaması ve toplam yayılımı aynı kalır). Eşiği aşanların payı, dağılımın eşiğin üstünde kalan kuyruk alanıdır (sütunlar 400 kişilik bir örneklemdir, yüzdeler dağılımdan hesaplanır).',
        'Bağlam iki dağılımı da aynı miktar kaydırır. Ortalama aynıyken kuyruk payı yayılıma ve biçime bağlıdır: eşik ortalamadan uzaksa küçük bir kayma, geniş dağılımda payı çok daha fazla büyütür. "Birer kişi çek", aynı kişiyi kaydırıcılar oynarken izletir.',
        'Kitapta bu simülasyonun sayılarından hiçbiri yok: dağılım parametreleri, eşikler ve bağlam kayması modelin varsayımıdır. Kitaptan gelen yalnızca ilkedir.',
      ] as string[],
      football: {
        text: 'Futbol yenilgisi ve aile içi şiddet',
        note: 'Takım beklenmedik biçimde kaybedince erkeklerin partnerine yönelik şiddeti yaklaşık %10 arttı; yenilgi beklenen ya da takım kazanmışsa artış yoktu. Aynı insanlarda bağlam davranışı kaydırdı. Bu sayı modele girmez.',
      },
      epi: 'bilimsel bulgular çoğu zaman ortalama eğilimleri anlatır; bireyler arasındaki farklılık ve istisna her yerde bulunur. Bağlamın önemi de aynı bölümde tekrarlanır.',
    },
    biz: {
      how: [
        'Merkezdeki kişi başkalarına 0-1 arası bir yakınlık verir. Başlangıçta yakınlığı ilk grup belirler: kendi grubuna yüksek, öbürüne düşük. Ortak etiket (iki grubu kesen bir özellik) arttıkça ilk grubun ağırlığı azalır, ortak etiketin ağırlığı artar. Ortak hedef herkese yakınlık ekler. Temas yalnızca karşı gruba yakınlık ekler ve ortak hedef varsa daha iyi işler.',
        'Hedef, etiket ve temas zamanla oturur (zaman geçtikçe doygunluğa yaklaşır). Tehdit hemen etki eder: ilk grubun ağırlığını artırır, karşı gruba yakınlığı azaltır ve öteki üç etkiyi zayıflatır. Yakınlık 0,5 ve üstü "biz", 0,3-0,5 "arada", altı "onlar" sayılır. Her kişinin küçük, sabit bir kişisel farkı vardır.',
        'Eşikler, ağırlıklar ve zaman oturması modelin varsayımıdır. Kitaptan gelen yön: sınırın bağlama göre kayması, ortak kategorinin eski kategoriyi gölgelemesi ve temasın koşullara bağlı olması.',
      ] as string[],
      minimal: {
        text: `Tajfel'in minimal grup deneyleri`,
        note: 'Anlamsız bir ölçüte dayalı gruplar bile kaynakları iç gruba kayırdı; etki dış grubu kötülemekten çok iç grubu yüceltme yönündeydi.',
      },
      shirt: {
        text: 'Gömlek rengiyle yeniden kategorileştirme',
        note: 'Gömlek renkleri eklenince karıştırmalar ırka değil çoğunlukla gömlek rengine göre oldu: kategori yeniden çizilebilir.',
      },
      contact: {
        text: 'Gruplar arası temas meta-analizi (Pettigrew ve Tropp)',
        note: 'Eşit statü, kurumsal destek ve ortak hedef gibi uygun koşullarda temas önyargıyı genellikle azalttı.',
      },
      relA: 'Biz ve Onlar (Bölüm 11)',
      relB: 'Savaş ve barış (Bölüm 17)',
      related: (a: string, b: string): string => `İlgili simülasyonlar: ${a}, ${b}.`,
    },
    harita: {
      how: [
        `Satırlardaki cümleler chapters.json bölüm özetlerinden kısaltılmıştır; yeni bir iddia eklenmemiştir. Simülasyon düğmeleri uygulamadaki kayıttan üretilir: bir bölüme yeni simülasyon eklenince buraya kendiliğinden gelir.`,
        `Temalar, Sonsöz'ün tekrar eden maddeleridir. Her birinin yanında kitapta en çok ilgili bölümlere bağlantı vardır.`,
      ] as string[],
      epi: 'kitap boyunca tekrarlanan temaları kısa maddeler hâlinde toplar; karmaşıklığın umutsuzluk değil sorumluluk gerektirdiğini ve bilimsel düşünme ile şefkatin birbirinin karşıtı olmadığını savunur.',
      introLabel: 'Giriş',
      intro: 'kitabın yöntemi, davranışın nedenlerini bir zaman merdiveninde aramaktır.',
    },
    foot: 'Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler yalnızca ilkeler ve yönlerdir: ortalama eğilim ile bireysel farklılık (Sonsöz), bağlamın etkisi (Bölüm 4 örneği), minimal gruplar ve yeniden kategorileştirme (Bölüm 11), temasın koşulları (Bölüm 17), her bölümün özeti. Dağılım parametreleri, eşikler, yakınlık formülü, tehdit ve zaman etkileri modelin varsayımıdır; kitapta bunların sayısal karşılığı yoktur.',
  },
};

export type Strings = typeof TR;
