// "Biz ve Onlar" simülasyonunun tüm kullanıcıya görünen Türkçe metni. Dinamik cümleler şablon fonksiyonudur;
// yüzde ve ondalık biçimleri çağıran tarafta (fmt.ts) hazırlanıp dize olarak verilir.
export const TR = {
  lede: '"Biz" ve "Onlar" ayrımını ne kadar çabuk ve ne kadar keyfi kurarız, ve bu ayrım nasıl yeniden çizilir?',
  tabs: ['Minimal grup', 'Kategoriyi yeniden çiz', 'Sıcaklık–yetkinlik'],
  tabsLabel: 'Bölümler',
  barLabel: 'Anlık çıktılar',

  // ---- 1) Tajfel
  methods: [
    { name: 'Yazı tura', groups: ['Yazı', 'Tura'] },
    { name: 'Klee / Kandinsky', groups: ['Klee', 'Kandinsky'] },
    { name: 'Nokta tahmini', groups: ['Fazla tahminci', 'Az tahminci'] },
  ],
  /** Bir grubun görünen adı (ör. "Yazı grubu"). */
  grp: (n: string) => `${n} grubu`,
  t: {
    h1: '1. Keyfi etiket',
    methodsLabel: 'Etiket yöntemi',
    draw: 'Etiketimi ver',
    matrixLabel: 'Puan dağıtma matrisi',
    histLabel: 'Sanal katılımcıların seçimleri',
    prev: 'Önceki matris',
    next: 'Sonraki matris',
    inputsLabel: 'Minimal grup girdileri',
    inputsH: 'Sanal katılımcılar',
    rowIn: 'İç',
    rowOut: 'Dış',
    noLabel: 'Henüz etiket yok. Yöntem seçilip "Etiketimi ver"e basılınca puan dağıtma matrisi açılır.',
    label: (g: string) => `Etiketin: ${g} grubu. Ölçüt anlamsız: etiket rastgele verildi. Puanlar isimsiz kişilere gidecek; yalnızca hangi grupta olduğu bilinir.`,
    title: (i: number, n: number, kind: string) => `2. Puan dağıt: matris ${i} / ${n} (${kind} türü)`,
    needLabel: 'Önce etiket gerekli.',
    cap: (mine: string, other: string, control: boolean) =>
      `Bir sütun seç. Üst sayı: ${mine} grubu'ndan biri alır. Alt sayı: ${control ? `${mine} grubu'ndan başka biri` : `${other} grubu'ndan biri`} alır.`,
    colLabel: (n: number, own: string, other: string) => `Sütun ${n}: üst ${own}, alt ${other}`,
    fbWait: 'Seçimden sonra sanal katılımcıların dağılımı görünür.',
    fbPick: (own: string, other: string, diff: string, joint: string) => `Seçim: üst ${own}, alt ${other} (fark ${diff}, toplam ${joint}). `,
    verdictFair: 'Eşit dağıttı. ',
    verdictSacrifice: 'İç grubun mutlak kazancından vazgeçip farkı büyüttü. ',
    verdictFavors: 'İç grup lehine. ',
    verdictOther: 'Dış grup lehine. ',
    sofar: (text: string) => `Şimdiye kadar: ${text}. `,
    /** Sütun işaretleri sırası: en büyük toplam, en büyük iç grup kazancı, en büyük fark, eşit. */
    tags: ['T', 'İ', 'F', '='],
    tagsLegend: 'Sütun işaretleri: T en büyük toplam, İ en büyük iç grup kazancı, F en büyük fark, = eşit.',
    ident: 'Etikete bağlılık',
    identHint: 'Yüksek: "biz" duygusu güçlü; fark ağırlığı artar.',
    fair: 'Adalet duyarlılığı',
    fairHint: 'Yüksek: eşit dağıtmaya yönelim güçlenir.',
    control: 'Kontrol: iki alıcı da iç grup',
    controlHint: 'Etiket ayrımı kalkınca fark seçimi de azalır.',
    rerun: 'Yeni sanal katılımcılar',
  },
  profile: {
    diff: 'iç grubun mutlak kazancından vazgeçip farkı büyüttü',
    fair: 'çoğunlukla eşit dağıttı',
    gain: 'kazancı büyütmeye baktı, farkı değil',
    mixed: 'karma bir örüntü izledi',
  },

  // ---- 2) Kurzban
  race: ['Beyaz', 'Siyah'],
  /** Forma adları: 0 = sarı, 1 = gri. */
  shirt: ['sarı', 'gri'],
  k: {
    presetsLabel: 'Kurzban senaryoları',
    stageLabel: 'Sekiz şematik kişi: ten rengi tonu ve forma rengi değişir',
    legendSkin: (light: string, dark: string) => `Ten rengi tonu: açık = ${light}, koyu = ${dark} (şematik figürler; başka özellik yok)`,
    legendBadge: 'Rozet: daire ya da kare (yalnızca okunurluk için, anlam taşımaz)',
    legendShirt: 'Forma: düz = sarı takım, çizgili = gri takım',
    chartSection: 'Kim ne dedi hataları',
    chartH: 'Yanlış atfedilen cümleler nereye düştü?',
    chartLabel: 'Hatalı atıfların aynı ırktan ve aynı formadan kişilere düşme oranları, şans düzeyiyle birlikte',
    chance: (p: string) => `şans düzeyi ${p}`,
    barRace: 'Aynı ırktan kişiye',
    barShirt: 'Aynı formadan kişiye',
    noShirt: 'forma yok',
    inputsLabel: 'Kurzban girdileri',
    inputsH: 'Girdiler',
    rerun: 'Yeni sanal katılımcılar',
    person: (n: number, race: string, shirt: string | null) => `Kişi ${n}: ${race}${shirt ? `, ${shirt} forma` : ''}`,
    sentence: 'cümle',
    cap: (n: number) => `Seçili kişi ${n}: cümlesi yanlış atfedilirse her kişiye düşme olasılığı altta.`,
    tally: (n: number) => `${n} hatalı atıf (40 sanal katılımcı x 8 cümle). Her çubuk, hatalı atıfların o ortak işarete sahip kişilere düşen payıdır.`,
    presets: ['Aşama 1: yalnızca ırk', 'Aşama 2: forma eklendi', 'Forma var ama anlamsız'],
    shirts: 'Formalar giyildi',
    shirtsHint: 'İki takım forması: sarı ve gri.',
    vis: 'Forma ne kadar göze çarpıyor',
    visHint: 'Yüksek: forma rengi hemen fark edilir.',
    coal: 'Forma koalisyonu belli ediyor mu',
    coalHint: 'Yüksek: forma kimin kiminle birlikte olduğunu gösterir. Sıfır: anlamsız giysi.',
    raceSal: 'Irk ipucunun ağırlığı',
    raceSalHint: 'Forma yokken ırk, mevcut tek koalisyon ipucu gibi işlenir.',
  },

  // ---- 3) Fiske / Durante
  emo: { gurur: 'Gurur', kiskanclik: 'Kıskançlık', acima: 'Acıma', tiksinme: 'Tiksinme' },
  beh: { yardim: 'Yardım (aktif)', iliski: 'İlişki kurma (pasif)', dislama: 'Dışlama (pasif)', saldiri: 'Saldırı (aktif)' },
  behLow: { yardim: 'yardım (aktif)', iliski: 'ilişki kurma (pasif)', dislama: 'dışlama (pasif)', saldiri: 'saldırı (aktif)' },
  groups: ['Kendi grubum', 'Yaşlılar', 'Zenginler', 'Evsizler', 'Yeni grup'],
  f: {
    stageLabel: 'Sıcaklık–yetkinlik haritası. Grupları sürükle ya da ok tuşlarıyla taşı.',
    legendDot: 'Daire: bir grubun haritadaki yeri (sürükle)',
    legendSoc: 'Soluk noktalar: bir toplumun grupları',
    nameLabel: 'Seçili grubun adı',
    inputsLabel: 'Eşitsizlik girdileri',
    inputsH: 'Toplum katmanı',
    axisWarmth: 'Sıcaklık (iyi niyet algısı) →',
    axisLow: 'düşük',
    axisHigh: 'yüksek',
    axisComp: 'Yetkinlik →',
    tokLabel: (name: string, w: string, c: string) => `${name}: sıcaklık ${w}, yetkinlik ${c}`,
    head: (name: string, w: string, c: string) => `${name}: sıcaklık ${w}, yetkinlik ${c}`,
    defaultName: (n: number) => `Grup ${n}`,
    noteAmy: 'Kitapta (Harris ve Fiske): düşük sıcaklık ve düşük yetkinlikteki grupların görüntülerinde amigdala ve insula etkinleşti, iğrenç nesnelere verilen tepkiye benzer biçimde. Küçük fMRI örneklemi; replikasyonu bilinmiyor.',
    noteMix: 'Kitapta (Harris ve Fiske): karışık köşelerdeki grupların görüntülerinde vmPFC etkinleşti. Aynı grubu birey olarak düşünmek (ör. hangi yemeği seveceğini) beyin tepkisini değiştirebiliyor.',
    noteHigh: 'Yüksek sıcaklık ve yüksek yetkinlik: kendi gruba benzeyen gruplar için tipik köşe.',
    layer: 'Bir toplumun gruplarını göster',
    layerHint: 'Soluk noktalar bir ülkedeki 40 grubun algılanan yerleridir.',
    gini: 'Gelir eşitsizliği (Gini)',
    giniHint: 'Arttıkça gruplar "sıcak ama yetkinsiz" ya da "yetkin ama soğuk" köşelere kayar.',
    soc: (n: number, mixed: string, r: string) => `Toplumdaki ${n} grup: karışık köşede ${mixed}; sıcaklık ile yetkinlik arasındaki ilişki r = ${r}.`,
  },

  // ---- Alt çubuk
  bar: {
    favor: 'İç grup lehine',
    sacrifice: 'Kazançtan vazgeçip fark',
    fair: 'Eşit dağıtan',
    raceMix: 'Irka göre karışma',
    shirtMix: 'Formaya göre karışma',
    errors: 'Hatalı atıf',
    help: 'Yardım eğilimi',
    mixedSoc: 'Karışık algı (toplum)',
  },
  say: {
    tajfelControl: (fav: string, fair: string) => `İki alıcı da iç grupta: ayrım etiketi yok. İç grup lehine seçim ${fav}, eşit dağıtım ${fair}.`,
    tajfel: (fav: string, sac: string) => `Sanal katılımcıların ${fav}'i iç grup lehine seçti; A türü matrislerde ${sac}'i iç grubun mutlak kazancından vazgeçip farkı seçti.`,
    kurzbanShirts: (shirt: string, race: string, chance: string) => `Hatalı atıfların ${shirt}'i aynı formaya, ${race}'i aynı ırka gitti (şans ${chance}). Forma koalisyon ipucuysa ırka göre kümelenme azalır.`,
    kurzbanPlain: (race: string, chance: string) => `Forma yokken hatalı atıfların ${race}'i aynı ırktan kişiye gitti (şans ${chance}): ırk kodlanıyor.`,
    pos: (name: string, emo: string, share: string, beh: string) => `${name}: baskın duygu ${emo.toLowerCase()} (${share}); en güçlü eğilim ${beh}.`,
  },

  // ---- Model nasıl çalışıyor?
  how: [
    '<b>Minimal grup.</b> Her sanal katılımcı, matristeki her sütunu dört çekimin ağırlıklı toplamıyla değerlendirir: toplam kazanç, iç grubun kazancı, iç grup lehine fark ve adalet (eşitlik). Seçim bu değerlerin yumuşak (softmax) karışımıdır. Fark ağırlığı etikete bağlılıkla büyür; iki alıcı da iç gruptaysa neredeyse sıfırlanır.',
    '<b>Kurzban.</b> Bir cümle yanlış kişiye atfedilirken aday kişiler, ortak işaret sayısına göre ağırlıklanır. Irk ağırlığı sabit değildir: forma hem göze çarpıyor hem de kimin kiminle birlikte olduğunu gösteriyorsa (koalisyon ipucu), ırkın ağırlığı düşer, formanınki artar. Forma anlamsızsa ırk aynen kalır. Bu koşullu ağırlıklama kitaptaki sonucun yönünü verir; büyüklükleri modelin varsayımıdır.',
    '<b>Sıcaklık–yetkinlik.</b> Haritadaki konumdan dört duygunun payı çift doğrusal biçimde hesaplanır (toplamı 1). Davranış eğilimleri bu duyguların sabit ağırlıklı toplamıdır. Toplum katmanında düşük eşitsizlikte sıcaklık ve yetkinlik birlikte gider; eşitsizlik arttıkça gruplar karışık köşelere kayar.',
    'Varsayımlar: sanal katılımcılar bağımsızdır; gerçek insanlardaki bağlam, kültür ve kişilik farkları modele girmez.',
  ],

  // ---- Kitapta (rep: yerelleştirilmiş replikasyon durumu sözcüğü)
  book: {
    e3: (rep: string) => `<a href="#/bolum/ch11?deney=ch11-e3">Tajfel minimal grup deneyleri</a> (replikasyon: ${rep}). Anlamsız bir ölçütle ayrılan katılımcılar kaynakları isimsiz iç grup üyelerine kayırdı; kitaba göre bu çoğunlukla dış grubu kötülemekten çok iç grubu yüceltme yönünde işler. Meta-analize göre etki, karşılıklılık beklentisi olduğunda güçlü.`,
    e8: (rep: string) => `<a href="#/bolum/ch11?deney=ch11-e8">Kurzban ve ark.: forma rengiyle yeniden kategorileştirme</a> (replikasyon: ${rep}). Bu çalışma, ırkın otomatik ve değişmez bir kategori olmadığını, koalisyon ipucu olarak işlendiğini ve yeniden çizilebildiğini gösterir. Önceden kayıtlı replikasyon etkiyi orijinalden küçük buldu; ırk tamamen silinmiyor, belirgin biçimde azalıyor.`,
    e10: (rep: string) => `<a href="#/bolum/ch11?deney=ch11-e10">Harris ve Fiske: sıcaklık–yetkinlik ve beyin</a> (replikasyon: ${rep}; küçük fMRI örneklemi). Düşük sıcaklık ve düşük yetkinlikteki grupların görüntülerinde amigdala ve insula etkinleşti. Sıcaklık–yetkinlik yapısı kültürler arası çalışmalarla geniş biçimde desteklendi.`,
    e12: (rep: string) => `<a href="#/bolum/ch11?deney=ch11-e12">Durante ve ark.: 37 ülkede gelir eşitsizliği</a> (replikasyon: ${rep}, ilişki korelasyonel). Eşitsizliği yüksek ülkelerde "sıcak ama yetkinsiz" ya da "yetkin ama soğuk" ikircikli algılar daha yaygındı.`,
    e1: (rep: string) => `<a href="#/bolum/ch11?deney=ch11-e1">Örtük ilişkilendirme testi (IAT)</a> burada simüle edilmedi. Replikasyon: ${rep}. Ortalama grup etkileri büyük örneklemlerde tekrarlanıyor; ama test-tekrar güvenirliği düşük ve bireysel davranışı öngörme gücü zayıf. Örtük ölçümleri değiştiren müdahaleler davranışı değiştirmedi (Forscher ve ark. 2019).`,
    e2: `<a href="#/bolum/ch11?deney=ch11-e2">Makaklarda örtük grup önyargısı</a> (Mahajan ve ark. 2011) 2014'te geri çekildi, bu yüzden bu bulguya dayanılmamalı.`,
    contact: `Temas hipotezi: gruplar arası temas önyargıyı yalnızca dar koşullarda azaltır (eşit sayı, eşit muamele, uzun temas, ortak üstün hedef). Devamı için <a href="#/bolum/ch17">Savaş ve Barış</a> bölümüne bakılabilir.`,
  },
  foot: 'Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: keyfi etiketle bile iç grup kayırmacılığı (Tajfel), forma ipucunda ırka göre kümelenmenin belirgin azalması ama silinmemesi (Kurzban ve ark.), sıcaklık–yetkinlik köşelerinin duyguları, düşük–düşük köşede amigdala ve insula etkinleşmesi, eşitsizlikle artan karışık algı. Sütun puanları, ağırlıklar, yüzdeler, davranış eğilimi eşleşmeleri ve grupların haritadaki yerleri modelin varsayımıdır.',

  // ---- Tur
  tour: [
    {
      title: 'Keyfi bir etiket',
      text: 'Yazı tura gibi anlamsız bir ölçütle iki gruptan birine atanırsın. Sonra iki isimsiz kişiye puan dağıtırsın: biri senin grubundan, biri öbüründen.',
      look: 'Matriste bir sütun seç; ilk sayı iç grup üyesinin, ikincisi dış grup üyesinin puanı.',
    },
    {
      title: 'Fark mı, kazanç mı?',
      text: "Matris 1'de en büyük toplam ve en büyük iç grup kazancı sağ uçtadır; en büyük fark sol uçtadır. Sanal katılımcıların çoğu, iç grubun mutlak kazancından vazgeçip farkı seçer (kitapta: kayırmacılık, keyfi etiketle bile).",
      look: 'Sütun altlarındaki dağılımda sol uçta (F) kümelenme. "Kontrol" anahtarı ikinci alıcıyı da iç grup yapar ve fark seçimi çöker.',
    },
    {
      title: 'Irk: koalisyon ipucu',
      text: 'Kim ne dedi? Forma yokken yanlış atıflar çoğunlukla aynı ırktan kişiye gider. Irk burada otomatik bir kategori gibi görünür.',
      look: 'Irka göre çubuğun şans düzeyinin (%43) çok üstünde olması.',
    },
    {
      title: 'Forma gelince',
      text: 'İki takımın forması giyilince ve forma koalisyonu belli edince karışmalar formaya göre kümelenir; ırka göre kümelenme belirgin azalır ama tamamen silinmez. Irk değişmez bir kategori değil, yeniden çizilebilir bir ipucudur.',
      look: 'Irk çubuğunun küçülüp forma çubuğunun büyümesi. "Forma var ama anlamsız" çipine geçince ne olur?',
    },
    {
      title: 'Sıcaklık–yetkinlik haritası',
      text: 'Gruplar iki eksende konumlanır ve köşe duyguyu belirler. "Yeni grup" düşük–düşük köşeye sürüklenince tiksinme ve dışlama baskın olur. Sağ altta duran "Yaşlılar" ise acıma ve yardım uyandırır.',
      look: 'Bir daireyi sürükle; alt çubukta duygu ve davranış çubukları değişir.',
    },
    {
      title: 'Eşitsizlik ve karışık algı',
      text: "Toplum katmanını aç ve Gini'yi yükselt: gruplar karışık köşelere kayar ve karışık stereotip payı artar. Kitaptaki 37 ülke bulgusu korelasyoneldir.",
      look: 'Alt çubukta "Karışık algı (toplum)" yüzdesi.',
    },
  ],
};
export type Strings = typeof TR;
