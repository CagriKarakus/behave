// Ultimatum simülasyonunun tüm kullanıcıya görünen Türkçe metni. Okuma anında `L()` ile alınır (text.ts).
import { money, percent } from '../../i18n/fmt';
import type { RegionId } from './model';

export const TR = {
  // Bölge bilgi kartları: [başlık, açıklama]
  info: {
    insula: ['İnsula (insula)', 'Bedenden gelen hoşnutsuzluk, iğrenme ve acı duygularını işleyen bölge. İnsandan gelen adaletsiz teklifte etkinleşir; etkinliği yükseldikçe teklifin reddi artar. Bilgisayardan gelen aynı teklifte daha az etkinleşir. İnsulanın burada iğrenmeyi mi yoksa genel bir beklenti ihlalini mi yansıttığı tartışmalıdır.'],
    amy: ['Amigdala (amygdala)', 'Tehdit ve sosyal tetikte olmayı değerlendirir. Haksız tekliften sonra etkinliği arttıkça ret olasılığı artar. Amigdalası hasarlı kişiler olağandışı cömert davranır ve haksız tekliflerde ret oranını artırmaz; kitap bunu, amigdalanın sosyal kararlara örtük bir kuşku kattığı biçiminde yorumlar (ölçüm değil, yorum).'],
    caud: ['Kaudat çekirdek (caudate)', 'Ödül devresinin bir parçası. Normu çiğneyeni cezalandırmak bu bölgeyi etkinleştirir, ceza bedelliyse daha belirgin. Reddetmenin "tatmini" budur: bedel ödense de bir şey kazandırır. Ölçülen doğrudan dopamin salımı değil, bölgedeki kan akımıdır.'],
    dlpfc: ['dlPFC (dorsolateral prefrontal korteks)', 'Genel rolü uzun vadeli çıkar ve dürtü kontrolüdür. Bu oyunda sürpriz var: sağ dlPFC susturulunca kişi adaletsiz teklifi daha sık kabul etti, ama teklifi yine adaletsiz buldu. Bölge, dürtüyü dizginleyen taraftan çok adalet hedefini eyleme çeviren taraf gibi davrandı. Yalnızca insana karşı; sol dlPFC etkisiz kaldı.'],
    vm: ['vmPFC/OFC (değer)', 'Seçeneklerin değerini ve sosyal bağlamı bağlar. Modelde teklifin parasal değerini temsil eder ve kabule doğru çeker: pay büyüdükçe etkinliği artar. Bu bölgenin ultimatum oyunundaki bu rolü kitaptaki bir ölçüme değil, modelin varsayımına dayanır.'],
  } satisfies Record<RegionId, [string, string]>,

  // Ağ diyagramındaki düğümler: kısaltma ve altyazı
  nodes: {
    tek: { ab: 'TEKLİF', cap: '' },
    amy: { ab: 'AMG', cap: 'amigdala · kuşku' },
    insula: { ab: 'INS', cap: 'insula · haksızlık' },
    caud: { ab: 'KAU', cap: 'kaudat · ret tatmini' },
    dlpfc: { ab: 'dlPFC', cap: 'adalet hedefi' },
    vm: { ab: 'vmPFC', cap: 'değer · OFC' },
    dec: { ab: 'RET', cap: 'ret eğilimi' },
  },
  nodeOffer: 'Teklif',
  nodeReject: 'Ret eğilimi',

  lede: 'Adaletsiz bir teklifi, kendi zararına olsa bile neden reddederiz ve beynin hangi parçaları bu kararı çekiştirir?',
  chipsAria: 'Koşullar',
  barAria: 'Anlık çıktılar',
  meterReject: 'Ret olasılığı',
  meterJudge: 'Adaletsiz buluyor',
  meterThreshold: 'Kabul eşiği',
  thresholdAll: 'hepsi',
  thresholdFrom: (t: number): string => `≥ ${money(t)}`,

  gameAria: 'Oyun',
  gameRule: (zero: number): string => `Kabul edersen ikiniz de teklifteki payı alırsınız. Reddedersen ikiniz de ${money(zero)} alırsınız.`,
  accept: 'Kabul et',
  reject: 'Reddet',
  logAria: 'Tur günlüğü',
  whoHuman: 'İnsan',
  whoComputer: 'Bilgisayar',
  round: (n: number, total: number): string => `Tur ${n} / ${total}`,
  proposerLine: (who: string): string => `Teklif eden: ${who}`,
  offerText: (pot: number, offer: number): string => `${money(pot)}'dan sana <b>${money(offer)}</b> öneriyor`,
  splitAria: (me: number, them: number): string => `Pay dağılımı: sen ${me} lira, karşı taraf ${them} lira`,
  labMe: (me: number): string => `Sen ${money(me)}`,
  labThem: (them: number): string => `Karşı taraf ${money(them)}`,
  verdict: (rejected: boolean, me: number, them: number, p: number, kind: 'unsure' | 'same' | 'diff'): string => {
    const head = rejected ? 'Reddettin.' : 'Kabul ettin.';
    const got = rejected ? `İkiniz de ${money(0)} aldınız.` : `Sen ${money(me)}, karşı taraf ${money(them)} aldı.`;
    const pp = percent(String(p));
    const cmp = kind === 'unsure' ? `Ortalama bir kişi için de kararsız bir teklif (ret olasılığı ${pp}).`
      : kind === 'same' ? `Ortalama bir kişiyle aynı yöndesin: ret olasılığı ${pp}.`
        : `Ortalama kişiden farklı davrandın: onun ret olasılığı ${pp}.`;
    return `${head} ${got} ${cmp}`;
  },
  satisfactionNote: (pctValue: number): string => `Kaudat ("ret etmenin tatmini") bu teklifte ${percent(String(pctValue))} etkin.`,
  replay: 'Yeniden oyna',
  nextOffer: 'Sonraki teklif',
  logLeft: (i: number, who: string, offer: number): string => `${i}. ${who} · ${money(offer)}`,
  logRight: (rejected: boolean, p: number): string => `${rejected ? 'Ret' : 'Kabul'} · model ${percent(String(p))}`,
  score: (n: number, rejectedCount: number, expected: string): string => `${n} turda ${rejectedCount} kez reddettin. Model, ortalama bir kişi için yaklaşık ${expected} ret bekliyordu.`,
  scoreDone: 'Fark bireysel farktan ve rastlantıdan gelir; tek bir kişinin yanıtı ortalama eğriyle birebir örtüşmez.',

  brainAria: 'Beyin paneli',
  brainH: 'Beyin paneli',
  netAria: 'Dokunulabilir beyin devresi diyagramı: teklif, insula, amigdala, kaudat, dlPFC, vmPFC ve ret eğilimi',
  legendInsula: 'İnsula',
  legendAmy: 'Amigdala',
  legendCaud: 'Kaudat',
  legendDlpfc: 'dlPFC',
  legendVm: 'vmPFC/OFC',
  legendReject: 'ret yönünde',
  legendAccept: 'kabul yönünde',
  legendOff: 'devre dışı',
  serotoninTag: 'serotonin düşük: dürtü freni zayıf',

  detailHint: 'Bir bölgeye dokun: rolünü, bu koşulda ne kadar etkin olduğunu ve ret eğilimine katkısını gör. Dolgusu koyulaştıkça bölge daha etkin, çizgiler kalınlaştıkça etki daha güçlü.',
  lesionRemove: 'Hasarı kaldır',
  lesionApply: 'Amigdala hasarı ver',
  tmsRemove: 'TMS\'yi kaldır',
  tmsApply: 'Sağ dlPFC\'ye TMS uygula',
  detailOff: 'devre dışı',
  contribution: 'Ret eğilimine katkı',
  pullAccept: 'Kabule doğru çeker',
  pullReject: 'Reddetmeye doğru çeker',
  none: 'yok',
  leftSilenced: 'Sol dlPFC susturuldu: etkisiz kaldı',
  computerOpposite: 'Bilgisayar karşıda: adalet hedefi devreye girmiyor',

  chartAria: 'Ret olasılığı eğrisi',
  chartH: 'Teklife göre ret olasılığı',
  chartLabel: 'Teklif büyüdükçe ret olasılığının düşüşü; geçerli koşul ve ortalama kişi eğrisi',
  axisOffer: 'teklif edilen pay',
  legendAvg: 'ortalama kişi (insan)',
  legendCur: 'seçili koşul',
  legendYourReject: 'senin reddin',
  legendYourAccept: 'senin kabulün',

  inputsAria: 'Girdiler',
  inputsH: 'Girdiler',
  offerName: 'Teklif (₺)',
  sliderHint: (fair: number): string => `Karşı tarafın sana önerdiği pay. ${money(fair)} eşit paydır, ${money(0)} hiçbir şey demektir`,
  offerValueText: (offer: number): string => `${offer} lira`,
  session2: 'İkinci oturum',
  sessHint2: 'Sonraki oturum: triptofan etkisi kitapta yalnızca ilk oturumda görüldü, bu yüzden kalkar.',
  sessHint1: 'İlk oturum: serotonin düşüklüğü yalnızca burada ret olasılığını artırır.',

  chips: {
    human: 'Teklif eden: insan',
    computer: 'Teklif eden: bilgisayar',
    tmsR: 'TMS sağ dlPFC',
    tmsL: 'TMS sol dlPFC',
    amy: 'Amigdala hasarı',
    trp: 'Serotonin düşük',
  },

  how: [
    (fair: number): string => `Teklif ${money(fair)}'nin altına indikçe "adaletsizlik" büyür. Her bölgenin etkinliği buna bağlıdır: insula ve amigdala insana karşı tam, bilgisayara karşı kısmen devreye girer; kaudat insulanın ardından ret etmenin tatminini hazırlar; dlPFC adalet hedefini yalnızca insana karşı uygular; vmPFC/OFC teklifin parasal değerini taşır ve kabule çeker.`,
    (): string => 'Bölgelerin katkıları toplanıp S biçimli bir eğriden (lojistik) ret olasılığına çevrilir. Çıktı, ortalama bir kişinin davranış eğilimidir; tek bir bireyin yanıtı rastlantıya ve kişisel farka açıktır, bu yüzden senin yanıtınla model aynı olmak zorunda değildir.',
    (): string => '"Adaletsiz buluyor" göstergesi yalnızca payın aritmetiğinden gelir. TMS koşulunda değişmemesi kitaptaki bulgudur (kötü teklifleri kontroller kadar haksız buldular), diğer koşullarda bu bir varsayımdır.',
    (): string => 'Tur teklifleri tohumlu karıştırılır: aynı tohumla aynı sıra gelir, "Yeniden oyna" yeni bir sıra seçer.',
  ],

  // "Kitapta" kutusu (replikasyon durumu rozeti kodda: sağlam / karışık / bilinmiyor)
  book: [
    { text: 'Sanfey ve ark. (2003), Bölüm 15', note: 'insandan gelen adaletsiz teklif insulayı etkinleştirir, bilgisayardan gelen daha az; insula etkinliği arttıkça ret artar. Tartışma: insulanın iğrenmeyi mi, genel bir beklenti ihlalini mi yansıttığı.' },
    { text: 'Knoch, Fehr ve ark. (2006)', note: 'sağ dlPFC baskılanınca kötü teklifler daha çok kabul edilir; teklifler yine adaletsiz bulunur. Yalnızca insana karşı; sol dlPFC etkisiz. Bazı rTMS çalışmaları kabul oranını değiştirmedi, yalnızca karar süresini uzattı.' },
    { text: 'Amigdala hasarı (2013)', note: 'haksız tekliften sonra amigdala etkinliği arttıkça ret artar; hasarlı kişiler cömerttir ve ret oranını artırmaz. Hasar bulgusu yalnızca üç hastaya dayanır.' },
    { text: 'Wood ve ark. (2006)', note: 'serotonin azalınca işbirliği ilk oturumda düştü. Haksız tekliflerin daha sık reddi ise replikasyon notunda anılan başka çalışmalardan gelir.' },
    { text: 'de Quervain ve ark. (2004)', note: 'cezalandırma kaudatı etkinleştirir, bedel ödenince daha belirgin. Ölçülen şey kan akımıdır, doğrudan dopamin değil.' },
  ],

  foot: (pot: number): string => `Nitel model: eğri biçimleri, ağırlıklar ve yüzdeler ölçüm değildir; bulguların yönünü ve sırasını gösterir. Kitaptan yalnızca yönler alındı (insula ve amigdala ile ret arasında artan ilişki, insana karşı daha güçlü; TMS ile kabulün artması; amigdala hasarında ret artışının olmaması; serotoninle ret artışı ilk oturumda; cezalandırmada kaudat etkinliği). Kitapta ret yüzdesi ya da eşik değeri verilmediği için bunlar uydurulmadı; ${money(pot)}'lik pay ve teklif sırası kurgudur. Gerçek beyin bundan çok daha karmaşıktır.`,

  tour: [
    { title: 'Adil teklif', text: (): string => `Karşı taraf ${money(10)}'dan ${money(5)} öneriyor: eşit pay. Kabul etmek hem kârlı hem adil olduğundan çoğu kişi için sorun yok.`, look: 'Ret olasılığı çubuğu ve insula neredeyse sönük.' },
    { title: 'Çok adaletsiz teklif', text: (): string => `${money(1)} kabul edilse de elde bir şey kalır. Yine de insula ve amigdala belirir, kaudat reddetmenin tatminini hazırlar. Kitaba göre insula etkinliği yükseldikçe ret artar.`, look: 'İnsula parlıyor, ret olasılığı yüksek.' },
    { title: 'Karşıda bilgisayar', text: (): string => `Aynı ${money(1)}, ama bir insan haksızlık etmiyor: sadece bir program. İnsula daha az etkinleşir, ret azalır. Ret kararı parayla birlikte "kim yaptı" bilgisine de bağlı.`, look: 'Aynı teklifte insula ve ret olasılığı düşer.' },
    { title: 'Sağ dlPFC susturuldu (TMS)', text: (): string => `Teklif ${money(2)}, karşıda yine bir insan. Sağ dlPFC susturulunca kişi aynı teklifi daha sık kabul eder, ama yine de adaletsiz bulur: adalet hedefini eyleme çeviremez. Sol dlPFC'de ya da bilgisayara karşı bu etki yok. Bulgu karışık; bazı rTMS çalışmaları kabul oranında fark bulmadı.`, look: '"Adaletsiz buluyor" aynı kalır, ret olasılığı düşer, dlPFC çizgili.' },
    { title: 'Serotonin düşük (triptofan yoksunluğu)', text: (): string => `Aynı ${money(2)} teklifi, bu kez serotonin azaltılmış. Ret artar ve kabul eşiği yukarı kayar. Wood'un etkisi yalnızca ilk oturumda görüldü: "İkinci oturum" düğmesine basınca etki kalkar.`, look: 'Ret olasılığı yükselir, eşik büyür.' },
    { title: 'Sonuç', text: (): string => 'Ret, "para mı onur mu" tartısından çok bir çekişme: insula ve amigdala reddetmeyi, kaudat tatmini, sağ dlPFC adalet hedefini öne iter; vmPFC/OFC paranın değeriyle kabule çeker. Koşullar bu dengeyi kaydırır. Şimdi koşulları bozmadan oyna ve kendi yanıtlarını ortalama eğriyle karşılaştır.', look: 'Eğrideki ret (kırmızı) ve kabul (boş) noktaları.' },
  ],

  // Model (model.ts): katkı etiketleri ve durum cümleleri
  parts: {
    insula: 'İnsula',
    amy: 'Amigdala',
    caud: 'Kaudat',
    dlpfc: 'dlPFC',
    vm: 'vmPFC/OFC',
    ser: 'Serotonin düşük',
    base: 'Taban',
  },
  noteTmsR: 'sağ dlPFC susturulmuş',
  noteTmsL: 'sol dlPFC susturulmuş',
  noteLesion: 'amigdala hasarlı',
  noteTrpOn: 'serotonin düşük',
  noteTrpOff: 'triptofan etkisi ilk oturumda kalmıştı',
  describeFair: (human: boolean, pot: number, offer: number, notes: string[], p: number): string =>
    `${human ? 'İnsan' : 'Bilgisayar'} ${money(pot)}'dan ${money(offer)} öneriyor${notes.length ? ` (${notes.join(', ')})` : ''}: eşit pay, ortalama bir kişi neredeyse hiç reddetmez (${percent(String(p))}).`,
  describeUnfair: (human: boolean, pot: number, offer: number, notes: string[], level: 0 | 1 | 2, p: number): string =>
    `${human ? 'İnsan' : 'Bilgisayar'} ${money(pot)}'dan ${money(offer)} öneriyor${notes.length ? ` (${notes.join(', ')})` : ''}: ${level === 2 ? 'insula belirgin etkin' : level === 1 ? 'insula orta düzeyde etkin' : 'insula sönük'}, ortalama kişi ${percent(String(p))} olasılıkla reddeder.`,
};

export type Strings = typeof TR;
