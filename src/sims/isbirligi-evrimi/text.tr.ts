// İşbirliğinin evrimi: kullanıcıya görünen tüm Türkçe metin. İngilizcesi text.en.ts içindedir.
// Dinamik cümleler şablon fonksiyonudur; sayılar çağıran tarafından dile göre biçimlenip verilir.
export const TR = {
  strat: {
    allc: { name: 'Her zaman işbirliği', short: 'Hep işbirliği', rule: 'Ne olursa olsun işbirliği yapar.' },
    alld: { name: 'Her zaman ihanet', short: 'Hep ihanet', rule: 'Ne olursa olsun ihanet eder.' },
    tft: { name: 'Tit for Tat (karşılık ver)', short: 'Tit for Tat', rule: 'İlk turda işbirliği yapar, sonra rakibin son hamlesini tekrarlar.' },
    gtft: { name: 'Affedici Tit for Tat (generous)', short: 'Affedici TfT', rule: 'Tit for Tat gibidir; ama rakip ihanet etse de üçte bir olasılıkla işbirliği yapar.' },
    ctft: { name: 'Pişman Tit for Tat (contrite)', short: 'Pişman TfT', rule: 'Kendi haksız ihanetinden sonra bir tur işbirliği yapıp karşılığını sineye çeker; rakibin haksız ihanetine ise karşılık verir.' },
    pavlov: { name: 'Pavlov (kazan-kal, kaybet-değiş)', short: 'Pavlov', rule: 'Son turda iyi getiri aldıysa (3 ya da 5) hamlesini korur, kötü aldıysa (0 ya da 1) değiştirir.' },
    random: { name: 'Rastgele', short: 'Rastgele', rule: 'Her tur yazı tura atar.' },
  },
  /** STRATS sırasıyla değil, MIXES sırasıyla. */
  mixNames: ['Eşit karışım', 'Çoğunluk hain', 'Saf Tit for Tat dünyası', 'Saf iyiler arasında 1 hain'],
  kinNames: {
    kardes: 'Kardeş', yarim: 'Yarı kardeş', yegen: 'Yeğen', buyuk: 'Büyükanne-büyükbaba',
    kuzen: 'Birinci kuzen', kuzen2: 'İkinci kuzen', yabanci: 'Yabancı',
  },

  /* ---- Model açıklamaları (canlı çubuk) ---- */
  matchTail: (a: string, b: string, sa: number, sb: number): string => `Toplam: ${a} ${sa}, ${b} ${sb}.`,
  matchNoErrorsNoisy: (rounds: number, tail: string): string => `${rounds} turda hiç hata çıkmadı. ${tail}`,
  matchNoErrors: (coop: number, rounds: number, tail: string): string => `Hata yok. Karşılıklı işbirliği ${coop}/${rounds} tur. ${tail}`,
  matchLost: (first: number, broken: number, tail: string): string => `İlk hata ${first}. turda; sonrasında işbirliği bir daha oturmadı (${broken} tur bozuk). ${tail}`,
  matchRecovered: (first: number, after: number, tail: string): string => `İlk hata ${first}. turda; ${after} tur sonra işbirliği geri döndü. ${tail}`,
  matchErrors: (first: number, errors: number, tail: string): string => `İlk hata ${first}. turda; ${errors} hata oldu. ${tail}`,
  evoSingle: (gen: number, lead: string): string => `${gen}. kuşakta tek strateji kaldı: ${lead}.`,
  evoDefectors: (gen: number, d: string): string => `${gen}. kuşakta ihanet baskın (${d}): karşılık verenler yetersiz kaldı ya da gelecek gölgesi çok kısa.`,
  evoReciprocators: (gen: number, cs: string, lead: string, top: string, receded: boolean): string =>
    `${gen}. kuşakta karşılık veren stratejiler ${cs}; önde ${lead} (${top}).${receded ? ' İhanet geriledi.' : ''}`,
  evoLeader: (gen: number, lead: string, top: string, alive: number): string => `${gen}. kuşakta önde ${lead} (${top}); ayakta kalan strateji sayısı: ${alive}.`,
  kinSpreads: (name: string, frac: string, lhs: string, c: string, p0: string, end: string): string =>
    `${name} (r = ${frac}): r·B = ${lhs}, C = ${c}; özgecil gen yayılır. Ortalama frekans ${p0} → ${end}.`,
  kinFails: (name: string, frac: string, lhs: string, c: string, p0: string, end: string): string =>
    `${name} (r = ${frac}): r·B = ${lhs}, C = ${c}; özgecil gen yayılmaz. Ortalama frekans ${p0} → ${end}.`,
  kinTie: (name: string, frac: string, lhs: string, c: string, p0: string, end: string): string =>
    `${name} (r = ${frac}): r·B = ${lhs}, C = ${c}; özgecil gen denge sınırında, rastlantıya kalır. Ortalama frekans ${p0} → ${end}.`,

  /* ---- Sayfa iskeleti ---- */
  lede: 'Bencil bireylerden oluşan bir dünyada işbirliği nasıl ortaya çıkar ve kalıcı olur?',
  tabsLabel: 'Simülasyon bölümleri',
  tabTour: 'Turnuva',
  tabKin: 'Akraba seçilimi',
  barLabel: 'Anlık açıklama',
  matchTitle: '1 · Tek eşleşme',
  matchNote: 'İki oyuncu art arda tur oynar. Her turda ikisi aynı anda işbirliği (mavi) ya da ihanet (kırmızı, çarpılı) seçer. Çerçeveli kare, sinyal hatasıyla ters çıkan hamledir.',
  matchSvgLabel: 'İki oyuncunun tur tur hamleleri: mavi kare işbirliği, kırmızı çarpılı kare ihanet',
  legCoop: 'işbirliği',
  legDefect: 'ihanet',
  legError: 'sinyal hatası',
  playerA: 'A oyuncusu',
  playerB: 'B oyuncusu',
  gameSlidersLabel: 'Oyun ayarları',
  noiseRoundsNote: 'Sinyal hatası ve tur sayısı aşağıdaki evrimsel dinamiği de belirler.',
  rerun: 'Yeniden çalıştır',
  evoTitle: '2 · Evrimsel dinamik',
  evoNote: 'Nüfusta her strateji herkesle oynar. Daha çok puan toplayan strateji sonraki kuşakta daha çok çoğalır (400 bireylik sonlu nüfus; rastlantı tohumludur).',
  mixChipsLabel: 'Hazır başlangıç karışımları',
  mixDetails: 'Başlangıç oranları',
  evoSvgLabel: 'Nesiller boyunca strateji oranlarını gösteren yığılmış alan grafiği',
  howPayoffs: 'Getiriler klasik değerlerdir: karşılıklı işbirliği 3, karşılıklı ihanet 1, kandırılan 0, kandıran 5. Strateji bitiş turunu bilmez.',
  howNoise: 'Sinyal hatası: her hamle verilen olasılıkla ters çıkar ve iki oyuncu da gerçekleşen hamleyi görür. Pişman TfT, kendi hatalı ihanetini bu sayede ayırt edebilir; yalnızca tek tarafın yanlış duyduğu hatalarda sonuçlar değişebilir.',
  howEvolution: 'Evrim: stratejinin kuşak başına payı, tur başına beklenen getirisiyle orantılı artar. Beklenen getiriler her eşleşme için tam olasılık hesabıyla bulunur; tek eşleşme ise tohumla örneklenir.',
  /** Kitapta kutusu: (bağlantı HTML'i, durum etiketi) */
  bookE6: (link: string, st: string): string =>
    `${link}: en basit strateji, Tit for Tat, kazandı; tek tek eşleşmelerin neredeyse hiçbirini kazanmadan toplamda öne geçti. Sinyal hatasında iki Tit for Tat karşılıklı misilleme döngüsüne kilitlendi; bu yüzden pişman ve affedici sürümler geliştirildi. <b>Tekrarlanma durumu: ${st}.</b> Tit for Tat'in işbirliğini başlatma gücü doğrulandı, ama üstünlüğü koşula bağlı; gürültülü ortamlarda kazan-kal, kaybet-değiş gibi stratejiler daha iyi olabiliyor.`,
  bookE6Label: 'Axelrod turnuvası',
  bookE7: (link: string, st: string): string =>
    `${link}: balığın Tit for Tat gibi davrandığı yorumu <b>${st}</b>; ayna düzeneği karşılıklılığı mı yoksa yalnızca sosyal kolaylaştırmayı mı ölçüyor sorusu açık.`,
  bookE7Label: 'Dikenli balık ayna deneyi',
  footTour: 'Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelen bulgu: Tit for Tat\'in kazanması ve sinyal hatasında intikam döngüsü. Getiri değerleri (5/3/1/0) klasik Axelrod değerleridir; kuşak, nüfus ve hata oranları bu modelin seçimidir.',

  formulaText: 'Özgecil gen, akrabalık (r) × fayda (B) maliyeti (C) aştığında yayılır.',
  kinWho: 'Kime yardım ediliyor?',
  kinDegreeLabel: 'Akrabalık derecesi',
  kinSurveyNote: 'Son sütun kitaptaki ankettir (köpek mi, kişi mi?): akrabalık azaldıkça köpeği seçenler artıyor. Modelin parçası değil, yalnızca bağlam.',
  kinBenefitCost: 'Fayda ve maliyet',
  kinSpreadTitle: 'Özgecil gen yayılır mı?',
  kinSpreadNote: '400 bireylik nüfusta başlangıçta %10 özgecil gen taşıyor. Her birey bir akrabasıyla eşleşir; özgecil olan akrabasına B fayda sağlar, kendisi C öder. Sonraki kuşak uyumlulukla orantılı seçilir.',
  dotsSvgLabel: '400 bireylik nüfus; dolu yeşil noktalar özgecil geni taşıyor',
  legCarries: 'özgecil gen taşıyor',
  legNotCarries: 'taşımıyor',
  kinChartLabel: 'Özgecil genin frekansının kuşaklar boyunca değişimi',
  legRuns: 'tek tek koşular (6)',
  legExpected: 'beklenen (sonsuz nüfus)',
  howKin1: 'Her birey bir akrabayla eşleşir. Akraba, bireyle aynı gen kopyasını r olasılıkla taşır (ortak kökenli); aksi halde nüfustan rastgele biridir. Uyumluluk: 1 − C (özgecilse) + B (akraba özgecilse). Bu durumda özgecil genin ortalama kazancı r·B − C olur; gen yalnızca bu pozitifse yayılır.',
  howKin2: 'Kesikli çizgi, sonsuz nüfus için bu denklemin beklentisidir. Tek tek koşular rastlantıyla sapar; r·B ile C birbirine çok yakınsa sonucu sürüklenme (rastlantı) belirler.',
  bookKinHamilton: 'Bölüm, akraba seçilimini Hamilton\'ın denklemi üzerinden anlatır: yardımın maliyeti ve faydası akrabalık derecesiyle tartılır.',
  bookE10: (link: string, st: string, p1: string, p2: string, p16: string, p26: string): string =>
    `${link}: köpeği seçenlerin oranı akrabalık azaldıkça arttı (kardeşte ${p1}, büyükanne-büyükbabada ${p2}, uzak kuzende ${p16}, yabancıda ${p26}). <b>Tekrarlanma durumu: ${st}</b>; tek anket ve varsayımsal senaryo.`,
  bookE10Label: 'Köpek mi yabancı mı anketi',
  bookE11: (link: string, st: string, p40: string): string =>
    `${link}: gruptakilerin yalnızca yaklaşık ${p40}'ı kan bağlı akraba çıktı, yani işbirliği akrabasız bireyler arasında da yürümek zorunda. İlk sekmedeki karşılıklılık tam bunu açıklar. <b>Tekrarlanma durumu: ${st}.</b>`,
  bookE11Label: 'Avcı-toplayıcı toplulukları',
  footKin: 'Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Akrabalık katsayıları (1/2, 1/4, 1/8) standart genetik değerleridir; anket yüzdeleri kitaptandır. Gen modelinin nüfus büyüklüğü, süre ve başlangıç frekansı bu modelin seçimidir.',

  /* ---- Eşleşme, evrim, akraba çizimleri ---- */
  firstRoundsShown: (shown: number, rounds: number): string => `ilk ${shown} tur gösteriliyor; puanlar ${rounds} turun tamamı`,
  playerLabel: (who: string, short: string): string => `${who}: ${short}`,
  points: (n: number): string => `${n} puan`,
  perRound: (v: string): string => `tur başına ${v}`,
  rules: (a: string, b: string): string => `A: ${a} B: ${b}`,
  seed: (n: number): string => `Tohum: ${n}`,
  axisGen: 'nesil',
  genLabel: (g: number): string => `nesil ${g}`,
  axisKinGen: 'kuşak',
  kinGenLabel: (g: number): string => `kuşak ${g}`,
  recipRow: 'Karşılık verenler (4 tür)',
  recipSub: 'TfT, affedici, pişman, Pavlov',
  alldRow: 'Hep ihanet',
  startedAt: (p: string): string => `başlangıçta ${p}`,
  rbRow: 'r·B (akrabalıkla tartılmış fayda)',
  rbSub: (frac: string, b: string): string => `r = ${frac}, B = ${b}`,
  costRow: 'C (maliyet)',
  criticalSub: (v: string): string => `kritik akrabalık C/B = ${v}`,
  geneRow: 'Özgecil gen frekansı, koşuların ortalaması',
  expectedSub: (p: string): string => `beklenen: ${p}`,

  /* ---- Kaydırıcılar ---- */
  noiseName: 'Sinyal hatası',
  noiseHint: 'Bir hamlenin yanlış çıkma olasılığı (yanlış algılanan işbirliği ya da ihanet). Sıfırda dünya kusursuz.',
  roundsName: 'Tur sayısı (gelecek gölgesi)',
  roundsHint: 'Aynı ikilinin kaç kez karşılaşacağı. Çok kısa oyunda ihanet kârlıdır, uzun oyunda karşılık veren işbirliği.',
  roundsFmt: (n: number): string => `${n} tur`,
  benefitName: 'Fayda (B)',
  benefitHint: 'Yardım alan akrabanın kazancı: ek yavru sayısı gibi düşün.',
  costName: 'Maliyet (C)',
  costHint: 'Yardım edenin kaybı. Ne kadar pahalıysa o kadar yakın akraba gerekir.',

  /* ---- Akraba tablosu ---- */
  kinTableHead: ['Akraba', 'r', 'r·B', 'Sonuç', 'Köpeği seçen'],
  verdictYes: '✓ yayılır',
  verdictNo: '✗ yayılmaz',
  verdictEq: '＝ sınırda',

  /* ---- Çubuk göstergeleri ---- */
  mKin: ['r·B (fayda × akrabalık)', 'C (maliyet)', 'Özgecil gen'],
  mMatch: ['Karşılıklı işbirliği', 'A tur başına', 'B tur başına'],
  mEvo: ['Karşılık verenler', 'Hep ihanet', 'Saf TfT'],

  /* ---- Rehberli turlar ---- */
  tour1: [
    {
      title: 'Kandırılan tek bir tur',
      text: 'Tit for Tat (TfT) ilk turda işbirliği yapar, sonra rakibinin son hamlesini tekrarlar. Her zaman ihanet eden karşısında yalnızca ilk turda kandırılır.',
      look: 'A\'nın ilk karesi mavi, sonrası kırmızı: kaybı bir turla sınırlı, ama bu eşleşmeyi hiçbir zaman yenemez.',
    },
    {
      title: 'Tek hata, bitmeyen intikam',
      text: 'İki Tit for Tat karşılaşıyor ve küçük bir sinyal hatası var. Çerçeveli kare, bir işbirliğinin ihanet gibi görünmesidir. Karşı taraf misilleme yapar, ilki de buna karşılık verir.',
      look: 'Çerçeveli kareden sonra mavi ve kırmızı sırayla dönüyor; ikisinin de tur başına puanı 3\'ün çok altında.',
    },
    {
      title: 'Pişmanlık döngüyü kırar',
      text: 'Aynı hata, aynı tohum, ama iki Pişman TfT. Hatalı ihanetini fark eden taraf bir tur işbirliği yapıp karşılığı sineye çeker; karşı taraf da buna uyar.',
      look: 'Çerçeveli kareden sonra birkaç kare içinde sıra yeniden maviye dönüyor.',
    },
    {
      title: 'Nüfusta evrim: hatasız dünya',
      text: 'Yedi strateji eşit oranda başlıyor, daha çok puan alan daha çok çoğalıyor. Hep ihanet eden hızla eriyor, karşılık veren stratejiler yükseliyor. Kitabın Axelrod bulgusu: Tit for Tat gibi basit ve karşılık veren stratejiler öne geçiyor.',
      look: 'Kırmızı bant (hep ihanet) yaklaşık yirmi nesilde ince bir çizgiye iniyor.',
    },
    {
      title: 'Hatalı dünya: saf TfT gerilemeye başlar',
      text: 'Aynı başlangıç, ama %5 sinyal hatası. İntikam döngüleri Tit for Tat çiftlerini yoruyor; affedici ve özellikle pişman sürümler öne çıkıyor. Kitabın vardığı sonuç da bu: hatalı dünyada affetmek ve pişman olmak avantaj.',
      look: 'Mavi (TfT) bandı daralıyor, mor (pişman) ve yeşil (affedici) bantlar genişliyor.',
    },
    {
      title: 'Gelecek gölgesi kısalınca',
      text: 'Tur sayısı 1: karşılaşma bir daha olmayacak. Karşılık vermenin hiçbir değeri kalmıyor ve ihanet kazanıyor. İşbirliği, aynı bireylerin tekrar karşılaşacağına dayanıyor.',
      look: 'Kırmızı bant (hep ihanet) alanı doldurur; tur sayısını artırdıkça kırmızı geriler.',
    },
  ],
  tour2: [
    {
      title: 'Kardeşe yardım yayılır',
      text: 'Kardeşle gen paylaşımı r = 1/2. Fayda 0,8, maliyet 0,3: r·B = 0,4 maliyetten büyük, yani özgecil gen taşıyanların soyu, taşımayanlara göre daha çok çoğalıyor.',
      look: 'Yeşil çizgiler %10\'dan yukarı tırmanıyor, kesikli beklenti çizgisine yakın.',
    },
    {
      title: 'Aynı yardım kuzene gidince sönüyor',
      text: 'Aynı fayda ve maliyet, ama yardım edilen birinci kuzen: r = 1/8. Şimdi r·B = 0,1, maliyet 0,3. Özgecil gen kaybediyor.',
      look: 'Çizgiler sıfıra iniyor; tabloda kuzen satırı ✗.',
    },
    {
      title: 'Ucuz yardım uzak akrabaya da yeter',
      text: 'Maliyeti 0,05\'e indir, faydayı 1,0\'a çıkar: birinci kuzen için bile r·B = 0,125 maliyetin üstünde. Eşik C/B, yani akrabalık ne kadar uzaksa yardım o kadar ucuz ve verimli olmalı.',
      look: 'Kuzen satırı ✓ oluyor; tabloda yarı kardeş ve yeğen de ✓, yabancı ✗.',
    },
    {
      title: 'Yabancıya yardım: akrabalık yok, yayılma yok',
      text: 'Yabancıyla r = 0, yani r·B her zaman sıfır. En ucuz yardım bile (C = 0,05) özgecil geni eritiyor. Akrabasız bireyler arasındaki işbirliği için başka bir mekanizma gerek: karşılıklılık, yani ilk sekmedeki Tit for Tat.',
      look: 'Tabloda yabancı satırı ✗; özgecil gen sönüyor.',
    },
    {
      title: 'Sınırda: rastlantı belirler',
      text: 'Yarı kardeş (r = 1/4), B = 0,8, C = 0,2: r·B tam olarak C\'ye eşit. Seçilim ne yana çekiyor ne iterken, yalnızca sürüklenme (rastlantı) kalıyor.',
      look: 'Çizgiler birbirinden farklı yönlere dağılıyor; "Yeniden çalıştır" ile her seferinde başka bir tablo çıkıyor.',
    },
  ],
};

export type Strings = typeof TR;
