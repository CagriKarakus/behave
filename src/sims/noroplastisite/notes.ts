// Nöroplastisite simülasyonunun sayfa altı notları ("Model nasıl çalışıyor?", "Kitapta", dipnot): etkileşimli parçadan ayrı,
// tembel yüklenen bir parçadır (bkz. lazyNotes).
import { bookBox } from '../ui';

export const NOTES = {
  syn: `
<details class="more"><summary>Model nasıl çalışıyor?</summary><div>
  <p>Her presinaptik uyarı AMPA reseptörlerinden sodyum sokar; uyarılar sık geldikçe toplanır ve zar depolarize olur. Depolarizasyon NMDA kanalındaki Mg²⁺ tıkacını iter. Postsinaptik nöronun aynı anda ateşlenmesi depolarizasyonu ayrıca artırır (Hebb eşleşmesi).</p>
  <p>Ca²⁺ girişi = saniyedeki uyarı sayısı × tıkacın kalkma oranı. Ca²⁺ düzeyi iki eşiğe göre okunur: alt eşiğin altında değişim yok, iki eşik arasında LTD (AMPA reseptörleri azalır), üst eşiğin üstünde LTP (yeni AMPA reseptörleri yerleşir). Değişimin boyu toplam uyarı sayısıyla büyür ve doyar.</p>
  <p>Varsayım (kitapta yok): yetersiz uyarımda değişim erken evrede kalır ve saatler içinde söner; yeterince güçlüyse kalıcılaşır. Eşikler, hızlar ve süreler nitel ayarlardır.</p>
</div></details>
${bookBox([
  { id: 'ch05-e1', text: 'Lømo (1966), Bliss ve Lømo (1973): yoğun uyarım sonrası sinaps uzun süre güçlü kalır (LTP)', rep: 'sağlam', note: 'Tartışma olgunun varlığında değil, doğal öğrenmedeki payında.' },
])}
<p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan: Hebb ilkesi, NMDA eşiği, Ca²⁺ aracılı LTP ve LTD'nin sinyali keskinleştirmesi. Kitap dışı: Mg²⁺ tıkacı ayrıntısı, frekans değerleri ve sürelerin kendisi. Bliss ve Lømo deneyi anestezili tavşanda perforan yola yüksek frekanslı uyarı verip saatlerce izleme düzeneğidir (kitap dışı bilgi).</p>
`,
  prac: `
<details class="more"><summary>Model nasıl çalışıyor?</summary><div>
  <p>Günlük etkin pratik = fiziksel dakikalar + 0,5 × hayal edilen dakikalar. Hızlı bileşen bu dozla doyarak yükselir (yarı doyum: günde ≈ 60 dk) ve pratik kesilince birkaç saatlik bir zamanla söner. Yavaş bileşen hızlı bileşenin sürdüğü sürece birikir ve ≈ 160 günlük bir zamanla yavaşça söner. Harita alanı = 1 + hızlı + yavaş; komşu alanlar toplam yüzey sabit kalacak biçimde daralır.</p>
  <p>Tüm katsayılar nitel ayardır; kitaptaki bulguların yönünü ve sırasını yakalamak için seçildi.</p>
</div></details>
${bookBox([
  { id: 'ch05-e7', text: 'Pascual-Leone (1995): piyano alıştırması, hayal edilen pratik ve bırakınca hızlı kayıp', rep: 'sağlam', note: 'Zihinsel pratiğin etkisi raporlanmış ama genellikle fiziksel pratikten küçük.' },
  { id: 'ch05-e8', text: 'Draganski (2004): üç ay jonglörlük ve gri madde', rep: 'sağlam', note: 'Ancak MR hacim ölçümlerinin hücresel anlamı ve küçük örneklemler eleştirilmiş.' },
  { id: 'ch05-e12', text: 'Maguire ve ark.: Londra taksi şoförlerinde hipokampüs', rep: 'sağlam', note: 'Örneklemler görece küçük, büyük bağımsız replikasyonlar sınırlı.' },
])}
<p class="foot">Nitel model. Kitaptan: günde 2 saat piyano alıştırması, birkaç gün ve dört hafta koşulları, hayal etme, bırakınca bir günden kısa sürede kayıp; üç ay jonglörlük ve kısmi gerileme; taksi şoförleri. Günlük 60 dk jonglörlük süresi ve tüm katsayılar kitap dışı varsayımdır.</p>
`,
  str: `
<details class="more"><summary>Model nasıl çalışıyor?</summary><div>
  <p>Stres sürerken hipokampüs dendrit uzunluğu alt sınıra (başlangıcın ≈ %68'i) ≈ 2 haftalık zamanla yaklaşır; diken kaybı dendrit kaybından biraz büyüktür. Stres bitince ≈ 3 haftalık zamanla toparlanır.</p>
  <p>Amigdalada glukokortikoid, hızlı kurulan ve yavaş sönen gizli bir programı (BDNF artışı gibi düşünülebilir) tetikler. Dendrit büyümesi bu programın karekökünü izler; bu yüzden tek doz bile görünür bir büyüme verir. Büyüme çabuk, geri çekilme çok yavaştır.</p>
  <p>Gönüllü koşuda hipokampüs dendritleri büyür, amigdala devreye girmez. Katsayılar nitel ayardır; BLA dikenleri modelde değişmez.</p>
</div></details>
${bookBox([
  { id: 'ch05-e3', text: 'Vyas ve ark. (2002), Mitra ve Sapolsky (2008): stres hipokampüs dendritlerini küçültür, BLA dendritlerini büyütür', rep: 'sağlam', note: 'Birçok laboratuvarda tekrarlandı. Bağlam önemli: koşuyla gelen glukokortikoid farklı etki eder.' },
])}
<p class="foot">Nitel model. Kitaptan: yön (hipokampüs küçülür, BLA büyür), tek dozun bile yetmesi (12. gün ölçümü), amigdala etkisinin kalıcı kaygıyla ilişkisi ve bağlam uyarısı. Kitap dışı: toparlanma zamanları ve yüzde değerleri. Çizimler şematiktir, gerçek morfoloji değildir.</p>
`,
} as const;
