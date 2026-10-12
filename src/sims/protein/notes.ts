// Genden proteine: sayfa altı notları ("Model nasıl çalışıyor?", "Kitapta", dipnot). Tembel yüklenen ayrı parça.
import { bookBox } from '../ui';

const how = (...paras: string[]): string =>
  `<details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">${paras.map((p) => `<p>${p}</p>`).join('')}</div></details>`;

export const NOTES = {
  how: how(
    '<b>Kodon çevirisi.</b> Gerçek standart genetik kod kullanılır (64 kodon). Okuma ilk ATG\'den başlar, dur kodonunda biter. Gösterilen dizi kodlayan iplik; mRNA aynı dizidir, T yerine U yazılır. Örnek gen tasarlanmış kısa bir dizidir, gerçek bir gen değildir.',
    'İşlev puanı modelin varsayımıdır: yanlış anlamlı değişimde amino asit sınıfı değişmişse ağır (artı yükten eksi yüke en ağır), aktif bölgede (4-7. amino asit) tam ağırlık, dışında %35. Anlamsız mutasyonda kalan zincirin oranının karesi. Çerçeve kaymasında kaymadan önceki bölümün oranının karesinin yarısı. Çerçeve içi silme ya da eklemede aktif bölgedeyse %30, değilse %75.',
    '<b>Gen düzenlenmesi.</b> Sinyal, TF\'yi eşik benzeri (Hill, n=3, yarı doyum %40) bir eğriyle etkinleştirir. Promotöre oturma = etkin TF; metilasyon oturmayı %95 azaltır; ifade = %2 taban + %98 x oturma. Alternatif ekleme: E1 ve E4 hep alınır, E2 ve E3 isteğe bağlıdır; uzunluklar ve işlevler gösterim içindir.',
    '<b>Konformasyon.</b> Dört durumlu bir Markov zinciri: açık-boş, kapalı-boş, bağlı-açık, bağlı-kapalı (aktif). Doğru molekül çukura uyar, bağlanınca şekli kapatır; benzer molekül daha zayıf bağlanır, çabuk ayrılır, şekli güçlükle kapatır. Sıcaklık hızı artırır (her 10 derecede iki kat), 50 derece civarında ve nötrden uzak pH\'ta şekil bozulur. Çubuklar zincirin kararlı durumundan hesaplanır; ekrandaki tek molekül rastlantısal bir örnektir.',
    '<b>Alel frekansı.</b> Her nesil seçilimle beklenen frekans hesaplanır, sonra 2N alel rastlantısal örneklenir (sürüklenme). Heterozigot avantajında iki alel de korunur.',
  ),
  book: bookBox([
    { id: 'ch07-e12', text: 'Bölüm 7: anne bakımı ve epigenetik iz (Meaney ve ark.)', rep: 'karışık', note: 'Gen düzenleyici bölgesindeki DNA metilasyonu stres tepkisini değiştiriyor gibi görünür; kitap bile bu heyecanın dizginlenmesi gerektiğini söyler. Modeldeki "kilit" bu fikrin basitleştirmesidir.' },
  ], '<p><a href="#/bolum/app3">Ek 3: Protein Temelleri</a>. Kodon tablosu, nokta/silme/ekleme mutasyonları, alel çeşitliliği, protein şekli ve işlevi.</p>' +
    '<p><a href="#/bolum/ch08?sim=gen-cevre">Bölüm 8: genler ve çevre</a>. Promotör, transkripsiyon faktörü, epigenetik, alternatif ekleme ve genlerin çevreye bağlı etkisi.</p>' +
    '<p><a href="#/bolum/app2?sim=endokrin-eksen">Ek 2: Endokrinolojinin Temelleri</a>. Hormon reseptörü, anahtar-kilit mantığı. <a href="#/bolum/app1?sim=noron">Ek 1: Nörobilim 101</a>. Nörotransmitter reseptörleri.</p>'),
  foot: '<p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan (Ek 3): 64 kodonun 61\'i amino asit kodlar, çoğu amino asidin birden fazla kodonu vardır; nokta mutasyonu bazen etkisiz kalır, silme ve ekleme okuma çerçevesini kaydırıp genellikle büyük etki yapar; proteinin işlevi şekline bağlıdır, bazı enzimler iki konformasyon arasında geçer, sıcaklık ve asitlik şekli hafifçe değiştirebilir; aleller popülasyonda dengede birlikte kalabilir. Bölüm 8: TF, promotör, epigenetik işaret, alternatif ekleme. Örnek gen, aktif bölge, işlev puanları, %95 metilasyon etkisi, eşikler, hız sabitleri, sıcaklık ve pH eğrileri, seçilim katsayıları modelin varsayımıdır.</p>',
};
