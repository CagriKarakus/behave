// Sonsöz simülasyonunun sayfa altı notları ("Model nasıl çalışıyor?" ve "Kitapta"). Etkileşimli parçadan ayrı, tembel yüklenir.
import { bookBox } from '../ui';

const how = (...paras: string[]): string =>
  `<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">${paras.map((p) => `<p>${p}</p>`).join('')}</div></details>`;

const epilogue = (text: string): string => `<li><a href="#/bolum/epilogue">Sonsöz</a>: ${text}</li>`;

export const NOTES = {
  ort: how(
    'Her popülasyon bir dağılımdır. A dar bir çandır. B ya geniş bir çandır ya da iki tepelidir (iki alt küme; ortalaması ve toplam yayılımı aynı kalır). Eşiği aşanların payı, dağılımın eşiğin üstünde kalan kuyruk alanıdır (sütunlar 400 kişilik bir örneklemdir, yüzdeler dağılımdan hesaplanır).',
    'Bağlam iki dağılımı da aynı miktar kaydırır. Ortalama aynıyken kuyruk payı yayılıma ve biçime bağlıdır: eşik ortalamadan uzaksa küçük bir kayma, geniş dağılımda payı çok daha fazla büyütür. "Birer kişi çek", aynı kişiyi kaydırıcılar oynarken izletir.',
    'Kitapta bu simülasyonun sayılarından hiçbiri yok: dağılım parametreleri, eşikler ve bağlam kayması modelin varsayımıdır. Kitaptan gelen yalnızca ilkedir.',
  ) + bookBox([
    { id: 'ch04-e11', text: 'Futbol yenilgisi ve aile içi şiddet', rep: 'sağlam', note: 'Takım beklenmedik biçimde kaybedince erkeklerin partnerine yönelik şiddeti yaklaşık %10 arttı; yenilgi beklenen ya da takım kazanmışsa artış yoktu. Aynı insanlarda bağlam davranışı kaydırdı. Bu sayı modele girmez.' },
  ], `<ul>${epilogue('bilimsel bulgular çoğu zaman ortalama eğilimleri anlatır; bireyler arasındaki farklılık ve istisna her yerde bulunur. Bağlamın önemi de aynı bölümde tekrarlanır.')}</ul>`),

  biz: how(
    'Merkezdeki kişi başkalarına 0-1 arası bir yakınlık verir. Başlangıçta yakınlığı ilk grup belirler: kendi grubuna yüksek, öbürüne düşük. Ortak etiket (iki grubu kesen bir özellik) arttıkça ilk grubun ağırlığı azalır, ortak etiketin ağırlığı artar. Ortak hedef herkese yakınlık ekler. Temas yalnızca karşı gruba yakınlık ekler ve ortak hedef varsa daha iyi işler.',
    'Hedef, etiket ve temas zamanla oturur (zaman geçtikçe doygunluğa yaklaşır). Tehdit hemen etki eder: ilk grubun ağırlığını artırır, karşı gruba yakınlığı azaltır ve öteki üç etkiyi zayıflatır. Yakınlık 0,5 ve üstü "biz", 0,3-0,5 "arada", altı "onlar" sayılır. Her kişinin küçük, sabit bir kişisel farkı vardır.',
    'Eşikler, ağırlıklar ve zaman oturması modelin varsayımıdır. Kitaptan gelen yön: sınırın bağlama göre kayması, ortak kategorinin eski kategoriyi gölgelemesi ve temasın koşullara bağlı olması.',
  ) + bookBox([
    { id: 'ch11-e3', text: "Tajfel'in minimal grup deneyleri", rep: 'sağlam', note: 'Anlamsız bir ölçüte dayalı gruplar bile kaynakları iç gruba kayırdı; etki dış grubu kötülemekten çok iç grubu yüceltme yönündeydi.' },
    { id: 'ch11-e8', text: 'Gömlek rengiyle yeniden kategorileştirme', rep: 'sağlam', note: 'Gömlek renkleri eklenince karıştırmalar ırka değil çoğunlukla gömlek rengine göre oldu: kategori yeniden çizilebilir.' },
    { id: 'ch17-e3', text: 'Gruplar arası temas meta-analizi (Pettigrew ve Tropp)', rep: 'karışık', note: 'Eşit statü, kurumsal destek ve ortak hedef gibi uygun koşullarda temas önyargıyı genellikle azalttı.' },
  ], '<p>İlgili simülasyonlar: <a href="#/bolum/ch11?sim=biz-onlar">Biz ve Onlar (Bölüm 11)</a>, <a href="#/bolum/ch17?sim=savas-baris">Savaş ve barış (Bölüm 17)</a>.</p>'),

  harita: how(
    'Satırlardaki cümleler chapters.json bölüm özetlerinden kısaltılmıştır; yeni bir iddia eklenmemiştir. Simülasyon düğmeleri uygulamadaki kayıttan üretilir: bir bölüme yeni simülasyon eklenince buraya kendiliğinden gelir.',
    'Temalar, Sonsöz\'ün tekrar eden maddeleridir. Her birinin yanında kitapta en çok ilgili bölümlere bağlantı vardır.',
  ) + '<aside class="book" aria-label="Kitapta"><h3 class="sim-h">Kitapta</h3><ul>' +
    epilogue('kitap boyunca tekrarlanan temaları kısa maddeler hâlinde toplar; karmaşıklığın umutsuzluk değil sorumluluk gerektirdiğini ve bilimsel düşünme ile şefkatin birbirinin karşıtı olmadığını savunur.') +
    '<li><a href="#/bolum/intro">Giriş</a>: kitabın yöntemi, davranışın nedenlerini bir zaman merdiveninde aramaktır.</li></ul></aside>',

  foot: '<p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler yalnızca ilkeler ve yönlerdir: ortalama eğilim ile bireysel farklılık (Sonsöz), bağlamın etkisi (Bölüm 4 örneği), minimal gruplar ve yeniden kategorileştirme (Bölüm 11), temasın koşulları (Bölüm 17), her bölümün özeti. Dağılım parametreleri, eşikler, yakınlık formülü, tehdit ve zaman etkileri modelin varsayımıdır; kitapta bunların sayısal karşılığı yoktur.</p>',
};
