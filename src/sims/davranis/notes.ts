// Sayfa altı notları (Model nasıl çalışıyor?, Kitapta, dipnot): ayrı parça olarak tembel yüklenir.
import { bookBox } from '../ui';

const NITEL = 'Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir.';
export type NoteKey = 'n1' | 'n2' | 'n3';

export const NOTES: Record<NoteKey, string> = {
  n1:
    `<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">` +
    `<p>Her tür üç eksende bir konuma sahiptir (0-1). Bir sistemin yükü eksenlerin ağırlıklı toplamıdır: tehdit devresi reaktif, sıcakkanlı ve dürtüsel uçlarda; frontal korteks planlı ve soğukkanlı uçlarda; dopamin proaktif ve planlı uçlarda yükselir. Testosteron ve stres hormonu yükleri her türe elle atanmış statü ve stres değerleridir.</p>` +
    `<p>Eksen uyumu, üç eksenin "sıcak uçta" (reaktif, sıcakkanlı, dürtüsel) ne kadar aynı yerde toplandığıdır: 1 tam uyum, 0 en dağınık durum. Uyum düşükse sınıflamalar birbirini doğrulamaz. Ağırlıklar ve konumlar modelin varsayımıdır.</p></div></details>` +
    bookBox([
      { id: 'ch01-e1', text: 'Yer değiştirme saldırganlığı (üçüncü sekme)', rep: 'sağlam', note: 'Bölümün saldırganlık ayrımları (savunmacı-saldırgan, dürtüsel-planlı, reaktif-spontan, sıcak-soğuk kanlı) anlatıdır; ayrı bir deney değildir ve her biri farklı biyolojiye işaret eder.' },
      { id: 'ch01-e3', text: 'Bağlam kapısı (ikinci sekme)', rep: 'bilinmiyor' },
    ]) +
    `<p class="foot">${NITEL} Kitaptan gelenler: saldırganlığın türlere ayrıldığı ve her ayrımın farklı biyolojiye işaret ettiği, yer değiştirme saldırganlığının ayrı bir tür olduğu. Türlerin eksenlerdeki konumları, sistem ağırlıkları ve eksen uyumu modelin varsayımıdır.</p>`,
  n2:
    `<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">` +
    `<p>Her eylemin dört bağlam girdisi vardır: hedefin ihtiyacı, tehdit düzeyi, rıza ve rol ya da yetki. Uygunluk, bu girdilerin eyleme özgü ağırlıklarla toplamının S eğrisidir. Örneğin kesmede ihtiyaç ve rıza, tetikte tehdit ve yetki öne çıkar; hedefin ihtiyacı tetikte uygunluğu düşürür.</p>` +
    `<p>Motor kalıp eyleme sabitlenmiştir ve bağlamdan etkilenmez. Karar devresi (prefrontal korteks) uygunlukla birlikte yükselir: kitaptaki bulgu, iki farklı eylem de uygunken aynı devrenin çalışmasıdır. Uygunsuz durumdaki düşük düzey modelin varsayımıdır. Ağırlıklar kitaptan değil, yön sezgisinden gelir; ahlaki yargı için kesin eşik iddiası yoktur.</p></div></details>` +
    bookBox([
      { id: 'ch01-e3', text: 'King ve ark.: sanal odada bandaj ya da ateş (2006)', rep: 'bilinmiyor', note: 'Küçük örneklemli tek bir fMRI çalışması; doğrudan replikasyonu bilinmiyor. Tablodaki iki "uygun" hücrenin benzer devre düzeyi bu bulgudan, diğer hücrelerin değeri modelden gelir.' },
    ], `<p>Tetik ve mesafe konusu için <a href="#/bolum/ch17">Bölüm 17, Savaş ve Barış</a>.</p>`) +
    `<p class="foot">${NITEL} Kitaptan gelenler: iki farklı motor eylemin, ikisi de bağlama uygunken, prefrontal korteksin aynı devresini çalıştırması; davranışın iyi ya da kötü değil bağlamıyla anlaşılması. Bıçak, sarılma ve diğer örnekler ile bütün ağırlıklar modelin varsayımıdır.</p>`,
  n3:
    `<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">` +
    `<p>Sekiz birey rütbe sırasındadır. Her adımda rastgele iki bireyden alttaki yenilir ve stres hormonu yükselir. Yenilen, yer değiştirme eğilimi olasılığıyla kendinden aşağıdaki birine saldırır (en alttakine daha yatkın); saldırınca kendi stres hormonu rahatlatma etkisi kadar düşer, hedef de daha küçük bir yenilgi alır ve zincir sürebilir. Stres hormonu her adımda tabana doğru söner. En alttaki kimseye saldıramaz.</p>` +
    `<p>İki çizgi, her yenilgi olayından sonra kaydedilen stres hormonunun saldıranlar ve tutanlar için kümülatif ortalamasıdır. Rahatlatma etkisi sıfırken fark kaybolur: fark varsayımdan gelir. Sıçan kartı aynı kuralı tek bir şok olayına uygular.</p></div></details>` +
    bookBox([
      { id: 'ch01-e1', text: 'Şoka bağlı yer değiştirme saldırganlığı ve stres tamponu', rep: 'sağlam', note: 'Tehdit dışı bir hedefe saldırma kemirgen ve primatlarda iyi gözlenen bir olgu; saldırının stres hormonunu düşürdüğü kısım daha az sayıda ve çoğu hayvan çalışmasına dayanıyor. Birinci bölümde konu birkaç cümleyle geçer; ayrıntı Bölüm 4\'tedir.' },
    ], `<p>Stres hormonlarının davranışa etkisi için <a href="#/bolum/ch04?sim=hormon-baglam">Hormonlar ve bağlam, Stres eğrisi sekmesi (Bölüm 4)</a>: orada "yer değiştirme" seçeneği aynı fikri başka bir yoldan gösterir.</p>`) +
    `<p class="foot">${NITEL} Kitaptan gelenler: şoklanan sıçanın küçük bir sıçana saldırabilmesi, yenilen babunun alttakini kovalaması, saldırabilen bireyde stres hormonunun ve ülser riskinin daha az yükselmesi. Rütbe sayısı, olasılıklar, rahatlatma oranı ve sönüm hızı modelin varsayımıdır; ülser riski modelde hesaplanmaz.</p>`,
};
