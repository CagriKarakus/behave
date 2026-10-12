// Ahlak simülasyonunun sayfa altı notları ("Model nasıl çalışıyor?" ve "Kitapta"). Etkileşimli parçadan ayrı, tembel
// yüklenen bir parçadır: görünümün ilk açılış boyutu küçük kalır; notlar etkileşim kurulduktan hemen sonra gelir.
import { bookBox } from '../ui';
import { PG } from './model';

const how = (...paras: string[]): string =>
  `<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">${paras.map((p) => `<p>${p}</p>`).join('')}</div></details>`;

export const NOTES = {
  tro: how(
    'Soğuk hesap kurtarılanların sayısının logaritmasıyla büyür. Sıcak sezgi üç parçadır: ölümü seçmenin genel bedeli (kaza değilse), kişisel güç x araç olma etkileşimi (en büyük parça), küçük bir yakınlık payı. Alarm niyete değil kişisel güce bağlıdır; döngüde araç olmak alarm çıkarmaz. Fark lojistik bir kuralla "evet" olasılığına çevrilir.',
    'Ağırlıklar kitaptaki oranlara oturtuldu (anahtar ~%67, itme ~%30, kazara ~%80); sayının etkisi modelin varsayımı. İçi boş baklava, araç olmanın kassız da itme sayıldığı "tutarlı kuralı" gösterir (kitapta mantıken ~%30).',
  ) + bookBox([
    { id: 'ch13-e4', text: 'Greene ve ark. (2001, 2004)', rep: 'karışık', note: 'Anahtar %60-70, elle itme ~%30, kazara itme ~%80; döngü %60-70 (mantıken ~%30). Sopa direnci azaltmadı (sayı yok). Denekler: ~%30 tutarlı deontolog, ~%30 tutarlı faydacı. Davranış deseni 45 ülkede doğrulandı, fMRI yorumu tartışmalı.' },
    { id: 'ch13-e1', text: 'Knobe (2003)', rep: 'sağlam', note: 'Zarar %85, yarar %23. Yorumu tartışmalı.' },
    { id: 'ch13-e2', text: 'Hamlin ve ark. (2007), bebek ahlakı', rep: 'tartışmalı', note: 'ManyBabies 4 (37 laboratuvar, 567 bebek) şans düzeyi (~%49) buldu. Modele katılmadı.' },
  ]),

  pg: how(
    'Oyuncu katkısını gruptakilerin önceki tur ortalamasının hafif altında tutar (koşullu işbirliği); bu yüzden cezasız oyunda katkılar erir. Düşük katkıyı cezalandırmak (mavi oklar) cezalananı bir sonraki turda daha çok koymaya iter.',
    `Antisosyal eğilimli oyuncular (elmas) kendilerinden fazla verenleri cezalandırır ve karşılık verir; cezalanan işbirlikçi katkısını düşürür, ahlaklı cezalandırıcı çekinir. Oranları ortalama sosyal sermaye ve hukukla düşer (varsayım). Oyun parametreleri (${PG.E} jeton, havuz çarpanı ${PG.mpcr * PG.groupSize}, ceza maliyeti ${PG.cost}, etkisi ${PG.impact}) da varsayımdır.`,
    "Henrich'te yalnızca uçlar kitaptandır: Hadza %27 verir, pazar ~%90'da ~%50; 50 kişiden küçük gruplarda pozitif teklifler kabul, 5000+ kişide adaletsizler ret. Arası varsayımdır.",
  ) + bookBox([
    { id: 'ch13-e7', text: 'Herrmann ve ark. (2008)', rep: 'sağlam', note: "ABD ve Avustralya'da cömerdi cezalandırma neredeyse yoktu; Umman ve Yunanistan'da ona harcanan para bencilliği cezalandırana harcanandan fazlaydı. Sosyal sermaye düştükçe antisosyal ceza arttı (korelasyon, kentli öğrenciler). Ülke düzeyi genelleme sınırlı." },
    { id: 'ch13-e8', text: 'Henrich ve ark. (2010)', rep: 'karışık', note: 'Pazar ve topluluk büyüdükçe teklifler adilleşti, ceza arttı; dünya dini oranıyla üçüncü taraf cezası arttı. Kitap "yirmi beş kültür" der, kaynak makale 15 toplum kapsar (birden çok çalışma birleşmiş olabilir). Lamba ve Mace (2011): tek etnik grubun köyleri arasında da kültürler arası kadar fark; din bulgusu tutarsız.' },
    { id: 'ch13-e9', text: 'Rand ve ark. (2012)', rep: 'tartışmalı', note: 'Hızlı karar işbirliğini artırdı; 21 laboratuvarlı kayıtlı replikasyon tekrarlayamadı. Modellenmedi.' },
  ]),

  dice: how(
    'Dürüst oyuncu ilk atışı bildirir. Haklı dürüstlük iki atıştan daha çok kazandıranı bildirir. Tam yalancı hep 5 bildirir. İki atıştan iyisinin dağılımı hesapla çıkar: 5 için 11/36, 6 için 1/36.',
    'Ödeme düzeni (1-5 yüzdeki sayı kadar, 6 sıfır) ve hazır toplum karışımları varsayımdır; kitaptan yön gelir. Sütunlar 300 kişilik tohumlu örneklemdir, işaretler beklenen oranı gösterir.',
  ) + bookBox([
    { id: 'ch13-e10', text: 'Gächter ve Schulz (2016)', rep: 'sağlam', note: "23 ülke, 2.500'ü aşkın öğrenci. Herkes dürüst olsa her sayı altıda bir çıkardı; ülkede yolsuzluk, vergi kaçakçılığı ve seçim hilesi arttıkça yalan arttı. Çoğu kişi en yüksek sayıyı uydurmadı, iki atıştan yükseğini bildirdi. Sağlam olan zar paradigmasıdır; ülke düzeyi ilişki daha az replike edildi." },
    { id: 'ch13-e5', text: 'Cohn ve ark. (2014)', rep: 'karışık', note: 'Bankacı kimliği hileyi ~%20 artırdı (Rahwan ve ark. 2019 bulamadı). Modellenmedi.' },
  ]),
} as const;
