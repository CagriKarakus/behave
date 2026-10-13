// Gen ve çevre simülasyonunun tüm kullanıcıya görünen Türkçe metni. İngilizcesi `text.en.ts` içindedir (aynı yapı).
// Metin yalnızca çalışma anında `L()` ile okunur (bkz. text.ts).
export const TR = {
  /* ---- Ortak ---- */
  common: {
    inputs: 'Girdiler',
  },

  /* ---- Ana görünüm (view.ts) ---- */
  view: {
    tabs: {
      table: 'Gen × çevre tablosu',
      mao: 'MAO-A ve çocukluk',
      gwas: 'Çok gen, küçük etki',
    },
    tabsLabel: 'Simülasyon bölümleri',
    barLabel: 'Anlık açıklama',
    lede: `Bir özellik "yüzde kaç genetik"? Bu soru yanlış sorulmuş: genler ve ortam toplanmaz, birbirine çarpılır; cevap hangi ortamlara baktığına göre değişir.`,
    tour: [
      {
        title: 'Tek ortamda bakınca',
        text: 'Üç gen varyantı (A, B, C) tek bir ortamda ölçülmüş. Bu tabloya bakan biri farkın büyük kısmını genlere yazar: kalıtılabilirlik (h²) yüksek çıkar.',
        look: 'Alttaki çubukta genetik payın büyüklüğü.',
      },
      {
        title: 'Aynı genler, daha çok ortam',
        text: 'Aynı üç varyant, ama altı farklı ortam. Çizgiler paralel, yani gen etkisi hiç değişmedi. Yine de ortamlar arası fark toplam çeşitliliğe girince h² düşüyor.',
        look: `"Aynı genler, daha çok ortam" eğrisinin aşağı inişi.`,
      },
      {
        title: 'Aynı fare, üç laboratuvar',
        text: `Crabbe'nin deneyi: aynı fare suşları, özenle eşitlenmiş koşullar. Yine de bir suşta kokainin etkisi Oregon ve Albany'de 700 cm civarında kaldı, Alberta'da 5.000 cm'yi aştı. B ve C üç yerde benzerdi. Çizgiler kesişince "hangisi daha iyi" ortamsız cevaplanamaz.`,
        look: `A çizgisinin Alberta'daki sıçraması ve ortam içi h² satırı.`,
      },
      {
        title: 'Bir gen, çocukluğa bağlı etki',
        text: `Düşük aktiviteli MAO-A varyantı tek başına bir şey öngörmedi; ağır çocukluk istismarı geçmişi olanlarda antisosyal davranış olasılığını yaklaşık üç kat artırdı. Ama bu bulgu büyük çalışmalarda karışık biçimde tekrarlandı: oranı 1'e çekince çizgiler paralel olur.`,
        look: 'Kötü muamele yokken iki çizginin üst üste binmesi, ağır uçta ayrılması.',
      },
      {
        title: 'Tek gen: üç küme',
        text: 'Boy tek bir gene bağlı olsaydı, insanlar birkaç belirgin kümeye ayrılırdı. Tek varyant boy farkının büyük kısmını açıklar ve sivri tepeler görülür.',
        look: 'Histogramdaki üç sivri tepe.',
      },
      {
        title: 'Yüzlerce küçük etki ve çevre',
        text: `Gerçek boy dağılımı düzgün bir çan eğrisidir: çok sayıda küçük etkili varyant ve çevre. 183.727 kişilik tarama yüzlerce varyant buldu; en güçlüsü farkın yalnızca %0,4'ünü açıkladı. Genler eğilim sunar; ne anlama geldikleri çevreye bağlıdır.`,
        look: `"En güçlü tek varyant" ile "Bulunanların toplamı" arasındaki fark.`,
      },
    ],
  },

  /* ---- Model çekirdeği (model.ts) ---- */
  model: {
    envName: (i: number): string => `Ortam ${i}`,
    axis: 'Ortam kalitesi (→ daha zengin)',
    yLabel: 'Sonuç (sembolik ölçek)',
    crabbe: {
      envNames: ['Oregon', 'Alberta', 'Albany'],
      axis: 'Laboratuvar',
      yLabel: 'Kokainle artan hareket (5.000 cm = 100)',
    },
    ses: {
      envNames: ['Düşük SES', 'Yüksek SES'],
      axis: 'Ailenin sosyoekonomik düzeyi (→)',
      yLabel: 'Bilişsel puan (sembolik)',
    },
    presets: {
      none: {
        name: 'Etkileşim yok',
        note: 'Üç varyant ortamdan aynı oranda etkilenir: çizgiler paralel. Gen farkı her ortamda aynı kalır.',
      },
      cross: {
        name: 'Sıralama değişen etkileşim',
        note: `Çizgiler kesişir: yoksul ortamda C, zengin ortamda A "en iyi" varyanttır. "Hangisi daha iyi?" sorusunun ortamsız cevabı yoktur.`,
      },
      crabbe: {
        name: 'Üç laboratuvar (Crabbe)',
        note: `Kitaptaki üç laboratuvar deneyi: A varyantı kokainle hareketliliği Oregon ve Albany'de az, Alberta'da çok artırır (667, 701 ve 5.000'den fazla cm). B ve C üç yerde benzerdir. B ve C değerleri sembolik.`,
      },
      ses: {
        name: 'Yoksul ↔ zengin (Turkheimer)',
        note: (rep: string): string => `Kitaptaki sonuç: kalıtılabilirlik yoksul ortamda yaklaşık %10, zengin ortamda yaklaşık %70. Replikasyon ${rep}: ABD örneklerinde görüldü, Batı Avrupa ve Avustralya'da görülmedi ya da tersine döndü.`,
      },
    },
    table: {
      one: (h2: string): string => `Tek ortamda bakılınca h² ${h2}: fark neredeyse tümüyle genlere yazılabilir. Ama bu sayı yalnızca bu ortam için geçerli.`,
      cross: (lo: string, hi: string): string => `Çizgiler kesişiyor: hangi varyantın "iyi" olduğu ortama göre değişiyor. Ortam içi h² ${lo} ile ${hi} arasında; tek bir "yüzde kaç genetik" yok.`,
      spread: (lo: string, hi: string): string => `Ortam içi h² ${lo} ile ${hi} arasında değişiyor: gen farkı aynı, ama gen farklarının ne kadar görüneceğini ortam belirliyor.`,
      many: (n: number, h2: string, first: string): string => `${n} ortam birlikte: h² ${h2} (yalnızca ilk ortamda ${first} idi). Gen etkisi aynı kaldı; ortam farkı toplam çeşitliliğe girince genetik pay küçüldü.`,
    },
    mao: {
      noInter: 'Etkileşim yok varsayımı: iki varyantın riski aynı, kötü muamele ikisini de aynı oranda artırıyor. Büyük çalışmaların çoğunun gördüğü buna daha yakın.',
      mild: (lo: string, hi: string): string => `Kötü muamele yok ya da hafif: iki varyant arasında fark yok (yüz kişide ${lo} ve ${hi}). Varyant tek başına bir şey söylemiyor.`,
      high: (lo: string, hi: string, ratio: string, popRatio: string): string => `Kötü muamele düzeyi yüksek: düşük aktiviteli varyantta yüz kişide ${lo}, yüksekte ${hi} (≈${ratio} kat). Herkes birlikte sayılınca fark yalnızca ≈${popRatio} kat: etki ortama bağlı.`,
    },
    gwas: {
      envOnly: 'Çevre tüm farkı belirliyor: genler boy farkına katkı vermiyor, çan eğrisi yalnızca çevreden geliyor.',
      one: `Tek bir gen: boy yalnızca birkaç kümeye ayrılıyor (sivri tepeler). Gerçek boy dağılımı böyle değil, çünkü tek bir "boy geni" yok.`,
      few: (m: number, top: string): string => `${m} varyantla dağılım hâlâ pürüzlü. Her varyantın payı büyük (en güçlüsü varyansın ${top}'i).`,
      many: (m: string, top: string): string => `${m} varyantla düzgün bir çan eğrisi çıkıyor. En güçlü tek varyant farkın yalnızca ${top}'ini açıklıyor: gen sayısı arttıkça "boy geni" aramak anlamsızlaşıyor.`,
    },
  },

  /* ---- Sekme 1: tablo (table-panel.ts) ---- */
  table: {
    variantsLabel: 'Varyantlar',
    variant: (v: string): string => `${v} varyantı`,
    intro: 'Üç gen varyantı (A, B, C) birkaç ortamda. Tablodaki sayı, o varyant ve ortamdaki ortalama sonuçtur; her hücrede bireyler bu ortalamanın çevresinde dağılır. Sanal bir popülasyon bu tablodan türetilir ve kalıtılabilirlik (h²) ondan hesaplanır.',
    presetsLabel: 'Hazır örnekler',
    rnLabel: 'Reaksiyon normu grafiği: ortam ekseninde her varyantın ortalama sonucu',
    cardLabel: 'Gen çevre tablosu',
    cardTitle: 'Ortalama sonuç tablosu (sayıları değiştirebilirsin)',
    cardNote: 'Alt satır: yalnızca o ortamdaki bireylere bakılırsa h². Tek ortamda ölçülen sayı ancak o ortam için geçerlidir.',
    varCardLabel: 'Varyans payları ve ortam sayısı eğrisi',
    varTitle: 'Sanal popülasyonda farkın kaynağı',
    vbarLabel: 'Toplam farkın genetik, ortam, etkileşim ve rastlantı payları',
    curveTitle: 'Aynı genler, daha çok ortam',
    curveNote: 'Ortamlar soldan sağa sırayla eklenirse h² nasıl değişir?',
    curveLabel: 'Kalıtılabilirliğin dahil edilen ortam sayısına göre değişimi',
    curveAxis: 'Dahil edilen ortam sayısı',
    inputsLabel: 'Tablo girdileri',
    rerun: 'Sanal popülasyonu yeniden çalıştır',
    thVariant: 'Varyant',
    h2Row: 'h² (ortam içi)',
    cellAria: (v: string, env: string): string => `${v} varyantı, ${env}: ortalama sonuç`,
    edited: 'Tablo elle değiştirildi.',
    seg: { h2: 'Genetik (h²)', env: 'Ortam', gxe: 'Gen × ortam', res: 'Rastlantı' },
    sliders: {
      n: { name: 'Ortam sayısı', hint: 'Kaç farklı ortamda ölçüm yapılıyor. Tek ortam, çoğu çalışmanın yaptığı şeydir.', fmt: (v: number): string => `${v} ortam` },
      spread: { name: 'Ortam çeşitliliği', hint: 'Ortamlar birbirinden ne kadar farklı: hepsi benzer mi, yoksul ile zengin mi?' },
      gen: { name: 'Varyantlar arası gen farkı', hint: 'A, B ve C varyantlarının ortalama sonucu birbirinden ne kadar ayrışıyor.' },
      inter: { name: 'Gen × çevre etkileşimi', hint: 'Sıfırda ortam herkesi aynı oranda etkiler. Yüksekte varyantlar ortama farklı yanıt verir ve çizgiler kesişir.' },
    },
    meters: { h2: 'Genetik pay (h²)', env: 'Ortam farkı payı', gxe: 'Gen × ortam payı' },
    how: [
      (n: number): string => `Her varyant × ortam hücresinde ${n} sanal birey vardır. Bireyin sonucu = hücre ortalaması + rastlantısal fark (aynı gen, aynı ortam, yine de bireyler arası değişim). Genotipler ortamlara bağımsız ve eşit dağılır.`,
      `Toplam fark dörde ayrılır: varyantların ortalama farkı (genetik pay, h²), ortamların ortalama farkı, ikisinin birlikte yarattığı etkileşim, ve hücre içi rastlantı. Etkileşim, "bir varyantın etkisi ortama göre değişiyor" demektir; genetik paya ya da ortam payına temiz biçimde yazılamaz.`,
      `Girdiler: ortam sayısı, ortamlar arası fark (ortamlar yoksuldan zengine eşit aralıkla dizilir), varyantlar arası gen farkı ve etkileşim gücü (1'de çizgilerin eğimi A için 2, B için 1, C için 0 olur ve çizgiler kesişir). Tablo hücrelerini elle de değiştirebilirsin.`,
    ],
    book: [
      (rep: string): string => `Üç laboratuvarda aynı fareler (Crabbe, 1999): replikasyon ${rep}`,
      (rep: string): string => `Sosyoekonomik duruma göre IQ'nun kalıtılabilirliği (Turkheimer, 2003): replikasyon ${rep}`,
    ],
    bookExtra: `<p class="note">Turkheimer bulgusu ABD örneklemlerinde görüldü; Batı Avrupa ve Avustralya'da görülmedi ya da tersine döndü, Florida'daki büyük bir çalışma etkileşimi bulamadı. Yani "yoksul ortamda h² düşüktür" kesin bir yasa değil, tartışmalı bir bulgu.</p>`,
    foot: `Nitel model. Kitaptan gelen sayılar: Turkheimer'de h² ≈ %10 (düşük SES) ve ≈ %70 (yüksek SES); Crabbe'de hareketlilik artışı 667, 701 ve 5.000'den fazla cm. Bunların dışındaki tüm sayılar (sonuç ölçeği, gen farkı, B ve C varyantları) sembolik. Varyantlar gerçek genler değildir. "Genetik pay" burada varyantlar arası ortalama farkın payıdır; gerçek ikiz çalışmalarının h² tahmini bundan farklı yollarla hesaplanır.`,
  },

  /* ---- Sekme 2: MAO-A (mao-panel.ts) ---- */
  mao: {
    scen: [
      'İlk bulgu (Caspi 2002): ≈3 kat',
      'Daha küçük etki (sembolik 1,5 kat)',
      'Etkileşim yok (1 kat)',
    ],
    scenLabel: 'Etkileşim gücü senaryoları',
    callout1: (rep: string): string => `<strong>Replikasyon durumu: ${rep}.</strong> Meta-analizler küçük ama anlamlı bir etkileşim bildirdi (Kim-Cohen 2006; Byrd ve Manuck 2014). Buna karşın bazı büyük çalışmalar bunu tekrarlayamadı; aday gen × çevre etkileşimi araştırmaları yayın yanlılığı ve düşük istatistiksel güç nedeniyle ağır biçimde eleştirildi (Duncan ve Keller 2011).`,
    callout2: 'Bu sekme gen-çevre etkileşimi <em>fikrini</em> öğretir. Gösterilen riskler sembolik; kimsenin gerçek riskini hesaplamaz.',
    question: 'Soru: MAO-A geninin düşük aktiviteli varyantı, yetişkinlikte antisosyal davranışı tek başına mı öngörür, yoksa çocukluktaki kötü muameleyle birlikte mi? Dunedin kohortunda (Yeni Zelanda, 26 yaşına kadar izlendi) varyant tek başına bir şey öngörmedi; düşük aktiviteli varyant yalnızca ağır çocukluk istismarı geçmişi olanlarda antisosyal davranış olasılığını yaklaşık üç katına çıkardı.',
    chartLabel: 'Etkileşim grafiği: çocuklukta kötü muamele düzeyine göre iki MAO-A varyantında antisosyal davranış riski',
    legendLabel: 'Varyantlar',
    legendLow: 'Düşük aktiviteli varyant',
    legendHigh: 'Yüksek aktiviteli varyant',
    gridCardLabel: 'Yüz kişide kaç kişi',
    gridTitle: 'Yüz kişiden kaçı?',
    gridNote: 'Her nokta bir kişi; dolu nokta, yetişkinlikte antisosyal davranış gösteren (sembolik). Seçili kötü muamele düzeyi için.',
    gridLowLabel: 'Düşük aktiviteli varyant: yüz kişilik nokta ızgarası',
    gridHighLabel: 'Yüksek aktiviteli varyant: yüz kişilik nokta ızgarası',
    inputsLabel: 'MAO-A girdileri',
    ticks: { none: 'yok', mid: 'orta', severe: 'ağır' },
    axisX: 'Çocuklukta kötü muamele',
    axisY: 'Antisosyal davranış, yüz kişide (sembolik)',
    capLow: (n: number): string => `Düşük aktiviteli: ${n} / 100`,
    capHigh: (n: number): string => `Yüksek aktiviteli: ${n} / 100`,
    th: {
      variant: 'Varyant',
      none: 'Hiç kötü muamele yok',
      severe: 'Ağır kötü muamele',
      all: (share: string): string => `Herkes birlikte (ağır payı ${share})`,
    },
    rowLow: 'Düşük aktiviteli',
    rowHigh: 'Yüksek aktiviteli',
    times: (x: string): string => `${x} kat`,
    sliders: {
      level: {
        name: 'Çocuklukta kötü muamele düzeyi',
        hint: 'Solda hiç yok, sağda ağır ve süregelen. Etkileşim yalnızca ağır uçta ortaya çıkıyor.',
        none: 'yok',
        mild: (p: string): string => `hafif (${p})`,
        mid: (p: string): string => `orta (${p})`,
        severe: (p: string): string => `ağır (${p})`,
      },
      ratio: {
        name: 'Ağır kötü muamelede düşük/yüksek aktivite oranı',
        hint: `Kitaptaki ilk bulgu ≈3 kat. Tekrarlayamayan çalışmalar 1'e yakın bir oran görür.`,
      },
      share: {
        name: 'Popülasyonda ağır kötü muamele görenlerin payı',
        hint: 'Tek başına varyanta bakan bir çalışma, ağır grubun küçük payı yüzünden etkiyi seyreltilmiş görür.',
      },
    },
    meters: { low: 'Düşük aktiviteli: risk', high: 'Yüksek aktiviteli: risk', ratio: 'Oran (düşük/yüksek)' },
    how: [
      `Yüksek aktiviteli varyantta risk, temel riskten başlar ve kötü muamele arttıkça yükselir (iki varyant için de, sembolik olarak ağır düzeyde iki kat). Düşük aktiviteli varyantta risk bunun üstüne bir çarpan alır. Çarpan, kötü muamele düzeyi yaklaşık %30'u aşana kadar 1'dir ve ağır düzeyde seçtiğin orana (kitapta ≈3) ulaşır.`,
      `Böylece kötü muamele yokken iki çizgi üst üste biner; ağır kötü muamelede ayrılır. Çizgiler paralel değilse etkileşim vardır. "Etkileşim yok" senaryosunda çarpan 1'dir: kötü muamele iki varyantı da aynı oranda etkiler.`,
      'Popülasyon satırı, ağır kötü muamele görenlerin payını kaydırıcıdan alır; geri kalanlar hiç görmemiş sayılır. Pay küçükken varyantın tek başına yarattığı fark da küçük görünür.',
    ],
    book: [
      (rep: string): string => `MAO-A varyantı ve çocuklukta kötü muamele (Caspi ve ark., 2002): replikasyon ${rep}`,
      (): string => 'MAO-A mutasyonu taşıyan Hollandalı aile (Brunner, 1993)',
      (rep: string): string => `Düşük aktiviteli MAO-A varyantı ve beyin tepkileri (2006): replikasyon ${rep}`,
    ],
    bookExtra: `<p class="note">Hollandalı ailedeki mutasyon enzimi tümüyle yok eden nadir bir mutasyondu; yaygın düşük aktiviteli varyanta genellenemez. Kitap "savaşçı gen" etiketini de eleştirir.</p>`,
    foot: 'Nitel model. Kitaptan gelen tek sayı "yaklaşık üç kat" (ağır istismar geçmişi olanlarda düşük aktiviteli varyantta). Temel risk (%8), kötü muamelenin genel etkisi ve ara düzeylerdeki eğri sembolik; kitap bu sayıları vermiyor. Kitap ayrıca kızlarda daha zayıf etki ve bazı gruplarda hiç görülmemesi gibi sınırlılıkları not eder.',
  },

  /* ---- Sekme 3: boy ve GWAS (gwas-panel.ts) ---- */
  gwas: {
    intro: `Boy, kalıtılabilirliği yüksek bir özelliktir; yine de tek bir "boy geni" yok. Burada her varyant küçük bir pay verir, çevre (beslenme, hastalık, çocukluk koşulları) üstüne eklenir. Kaydırıcılarla varyant sayısını ve çevrenin payını değiştir, dağılımın nasıl değiştiğine bak.`,
    histLabel: 'Simüle edilen boy dağılımı histogramı',
    legendLabel: 'Histogram göstergesi',
    legendHeight: 'Boy (genler + çevre)',
    legendGenes: 'Yalnızca genlerin katkısı',
    inputsLabel: 'Boy girdileri',
    btnBook: 'Kitaptaki ayar',
    btnRerun: 'Yeniden çalıştır',
    cardLabel: 'GWAS ne buluyor?',
    cardTitle: 'Bir GWAS (genom çapında tarama) ne bulur?',
    cardNote: 'Tarama, çok sayıda kişide hangi varyantların boyla birlikte değiştiğine bakar. Örneklem büyüdükçe daha küçük etkiler de seçilir.',
    sampleLabel: 'GWAS örneklemi',
    samples: ['2010: 183.727 kişi', '2022: 5,4 milyon kişi'],
    axisX: 'Boy (cm, sembolik ölçek)',
    axisY: (n: string): string => `Kişi sayısı (toplam ${n})`,
    read: {
      found: 'Bulunan varyant',
      foundBook10: 'kitap: yüzlerce',
      foundBook22: `kitap: 12.000'den fazla`,
      top: 'En güçlü tek varyant',
      topBook10: 'kitap: ≈%0,4',
      topCm: (x: string): string => `kopya başına ≈${x} cm`,
      sum: 'Bulunanların toplamı',
      sumBook10: 'kitap: ≈%10',
      sumBook22: 'kitap: ≈%40-45',
    },
    cmp: {
      book10: 'Kitaptaki ayar: model kitabın sayılarına yakın çıkar.',
      book22: 'Kitaptaki ayar: daha büyük örneklem çok daha fazla varyant ve çok daha yüksek bir pay bulur; model bu payı %40-45 civarında tutacak biçimde ayarlı.',
      other: `Kitap karşılaştırması, "Kitaptaki ayar" düğmesindeki değerler (300.000 varyant, çevre %20) için anlamlıdır.`,
    },
    sliders: {
      m: { name: 'Boyu etkileyen varyant sayısı', hint: 'Bir varyanttan yüz binlercesine. Logaritmik kaydırıcı.' },
      env: { name: 'Çevrenin katkısı', hint: 'Beslenme, hastalık, çocukluk koşulları: boy farkının ne kadarı çevreden geliyor.' },
    },
    meters: { genetic: 'Genetik pay (simüle)', top: 'En güçlü tek varyant', sum: `GWAS'ın bulduklarının toplamı` },
    how: [
      'Her varyantın farkın ne kadarını açıkladığı log-normal bir dağılımdan gelir: çoğu çok küçük, birkaçı görece büyük. Tüm varyantların payı toplamı, genetik payı (1 − çevre payı) verir. Çevre, genlerden bağımsız rastlantısal bir terimdir.',
      (n: string): string => `Histogram ${n} sanal kişiden çıkar. En güçlü 200 varyant kişi başına tek tek çekilir (her kişi her varyantın 0, 1 ya da 2 kopyasını taşır); kalan çok sayıda küçük varyantın toplamı merkezi limit teoremiyle bir normal terim olarak eklenir. Varyant sayısı 1 iken yalnızca üç boy kümesi çıkması, Mendel tarzı tek genin sonucudur.`,
      `GWAS'ın bir varyantı "bulması" için etkisinin örneklem büyüklüğüyle çarpımı bir eşiği aşmalıdır (genom çapında anlamlılık, p &lt; 5×10⁻⁸). Bu yüzden küçük örneklemde yalnızca büyük etkililer bulunur.`,
      `Genetik farkın bir kısmı (burada, en çok varyantta, %28) nadir varyantlarda ya da çok küçük etkilerde saklıdır ve en büyük örneklemde bile tek tek bulunamaz. Bu yüzden bulunanların toplamı kalıtılabilirliğin altında kalır ("eksik kalıtılabilirlik").`,
    ],
    book: [
      (rep: string): string => `Boy için genom çapında ilişkilendirme çalışması (Lango Allen ve ark., 2010): replikasyon ${rep}`,
      (): string => `Beden kitle indeksi için GWAS (2010): en iyi varyant farkın %0,3'ü`,
      (): string => `Eğitim düzeyi için GWAS (2013): en iyi varyant farkın %0,02'si`,
    ],
    bookExtra: `<p class="note">Kitaba göre 183.727 kişinin genomu tarandı; yüzlerce varyant boyla ilişkili bulundu, yalnızca bir avucu bilinen iskelet büyümesi genlerindeydi. En güçlü tek varyant boy farklılığının yalnızca %0,4'ünü, hepsi birlikte yaklaşık %10'unu açıkladı. Sonraki çalışma (5,4 milyon kişi, 2022) 12.000'den fazla varyant buldu; bunlar Avrupa kökenlilerde boy farkının yaklaşık %40-45'ini açıklıyor. Eğitim düzeyinde poligenik skorların bir kısmı aile ortamı gibi dolaylı etkileri de yansıtıyor.</p>`,
    foot: (mean: number, sd: number): string => `Nitel model. Kitaptan gelen sayılar: 183.727 kişilik tarama, en güçlü varyant ≈%0,4, hepsi ≈%10, "yüzlerce" varyant ve 2022'de &gt;12.000 varyant, ≈%40-45. Kitap gerçek etkili varyant sayısını vermez: 300.000 varyant, etki dağılımı ve "yaygın varyantların taşıdığı pay" (%75) iki noktaya (2010 ve 2022) birlikte uydurulmuş varsayımlardır. Boy ölçeği (ortalama ${mean}, standart sapma ${sd} cm) ve genetik pay (%80) örnek amaçlı. Modelde gen × çevre etkileşimi yok.`,
  },
};

export type Strings = typeof TR;
