// Sayfa altı notları (model açıklaması, "Kitapta", dipnot); view.ts bunları tembel yükler.
import { bookBox } from '../ui';

const ladder = `
<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">
  <p>Dokuz basamak, Giriş'in kurduğu zaman merdivenidir ve her biri kitapta bir bölüme denk gelir. Seçilen davranış için her basamakta o bölümün kavramlarından derlenmiş bir etken kartı var. Kartın etiketi (▲ yöneltir, ▼ frenler, ◆ bağlama bağlı) etkenin o davranışa yönünü gösterir; çoğu etken tek yönlü değildir.</p>
  <p>Oklar derindeki bir basamağın yakındaki basamağı nasıl etkilediğini gösterir (ör. stres hormonu → amigdalanın tepkisi). Kaydırıcı, bakılan aralığı daraltır: yalnızca iki ucu da görünen oklar sayılır. Dışarıda kalan etkenler ve oklar da sayaçtadır; böylece "yalnızca bir saniye öncesine bakan" bir açıklamanın neyi göremediği görülür.</p>
  <p>Hiçbir etken tek başına yeterli değildir: bir basamağın etkisi başka basamaklardan geçerek değişir. Kitabın ana fikri de budur; her açıklama kendinden öncekilerin hepsini içerir.</p>
</div></details>

${bookBox([
    { id: 'ch03-e2', text: 'Ateş etme görevi (Correll)', rep: 'sağlam' },
    { id: 'ch06-e6', text: 'Akranların yanında sürüş oyununda risk alma', rep: 'karışık' },
    { id: 'ch08-e9', text: 'MAO-A varyantı ve çocuklukta kötü muamele (Caspi ve ark., 2002)', rep: 'karışık' },
    { id: 'ch09-e5', text: 'Koridor hakaret deneyi (Güney ve Kuzey)', rep: 'bilinmiyor' },
    { id: 'ch10-e6', text: 'Tekrarlı tutsak ikilemi turnuvası (Axelrod)', rep: 'karışık' },
  ], '<p class="note">Her basamaktaki bağlantı, o bölümün sayfasına ve simülasyonuna götürür. Kitabın vurgusu: tek bir "neden" yok; etkenler birbirini etkiler.</p>')}
<p class="foot">Nitel model. Kartlar bölümlerin kavram ve bulgularından derlenmiş örneklerdir; kitap bu üç davranışı basamak basamak ayırmıyor. Kitaptan gelen sayılar yalnızca kartlardaki "yaklaşık üç kat" (MAO-A, ağır istismar geçmişinde) ve "üç katına" (iki akran, ergenlerde risk). Basamak ve ok sayıları modelin yapısıdır, ölçüm değildir.</p>`;

const cat = `
<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">
  <p>Eksen eşit genişlikte kutulara bölünür. Algıda her değer, kendi kutusunun merkezine doğru çekilir: kategorileme gücü 0'da çekim yoktur, 1'de kutu içindeki her değer aynı görünür. İki değerin algılanan farkı, çekilmiş konumlar arasındaki mesafedir.</p>
  <p>Aynı kutudaki iki değer birbirine yaklaşır: fark gerçeğin (1 − güç) katına iner. Sınırın iki yanındaki değerler ise kendi kutu merkezlerine doğru, yani birbirinden uzağa çekilir: fark gerçeğin üstüne çıkar. Bu yüzden ikinci grafikte tepe yalnızca sınır A ile B arasındayken yükselir; fark sabit kaldığı hâlde.</p>
  <p>Örnekler (renk geçişi, sınav notu, boy) ve güç değeri modelin varsayımıdır; kitapta bu yanılgı için sayı yok.</p>
</div></details>

${bookBox([
    { id: 'intro-e1', text: 'Wellesley etkisi (menstrüel senkronizasyon, McClintock 1971)', rep: 'tartışmalı', note: 'Kitap bunu, insan fizyolojisinin diğer memelilerle ortak olduğunu ama her çalışmada aynı sonucu vermeyebileceğini göstermek için anar. Daha dikkatli çalışmaların çoğu etkiyi bulamadı; bugün büyük ölçüde şüpheli sayılır. Bu sekmedeki hiçbir hesap ona dayanmaz.' },
  ], '<p class="note">Giriş, kategorik düşünmenin tehlikesini Watson (çevre her çocuğu istediğine dönüştürür), Moniz (frontal lökotomi) ve Lorenz örnekleriyle anlatır: nedenleri ve türleri kutulara ayırmak ezberi kolaylaştırır, ama sınırlar keyfidir ve gerçek farkları gizleyebilir.</p>')}
<p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan bu sekmeye sayı alınmadı; kutu sayısı, güç ve örnek değerleri modelin varsayımıdır.</p>`;

export const NOTES = { ladder, cat };
