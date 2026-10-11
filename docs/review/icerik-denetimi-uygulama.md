# İçerik denetimi uygulama günlüğü

Kaynak rapor: `docs/review/icerik-denetimi.md`. Hedef: `content/chapters.json` (şema ve alan adları değişmedi, "experiments" eklenmedi, commit yapılmadı).

Uygulama sırası: yüksek önemli (B03, B04, B21) -> veri hataları (B34, B45, B13, B35) -> terim/başlık (B16, B15, B47, B48) -> orta önemli içerik -> düşük önemli içerik -> B49 verifyNotes -> B51 biçim. B50 için küçük kod değişikliği.

Özet: 50 bulgu uygulandı, 1 kısmen (B50), 0 atlandı. Kitapla çelişen öneri bulunmadı; spot kontroller (B03, B04, B13, B17, B21, B35, B39, B40, B12, B31) ilgili `.book/chapters/*.txt` satırlarıyla uyumlu çıktı.

| Bulgu | Durum |
|---|---|
| B01 | uygulandı |
| B02 | uygulandı |
| B03 | uygulandı |
| B04 | uygulandı |
| B05 | uygulandı (name, finding eki; verifyNotes[1] B49 kapsamında silindi) |
| B06 | uygulandı |
| B07 | uygulandı |
| B08 | uygulandı |
| B09 | uygulandı |
| B10 | uygulandı |
| B11 | uygulandı |
| B12 | uygulandı |
| B13 | uygulandı (ch09 metninde "oxytocin" geçmediği doğrulandı; bağlantı ch11'e çevrildi) |
| B14 | uygulandı |
| B15 | uygulandı |
| B16 | uygulandı (25 alan; "ön singulat" ve "ön ada" korundu; ek uyumu elle gözden geçirildi: frontal korteksin/korteksi/korteks bölgeleri, "ön lob performansının" -> "frontal korteks performansının") |
| B17 | uygulandı |
| B18 | uygulandı |
| B19 | uygulandı |
| B20 | uygulandı |
| B21 | uygulandı |
| B22 | uygulandı (Wheeler-Fiske sebze koşulu ch11.txt:640-643 ile uyumlu) |
| B23 | uygulandı |
| B24 | uygulandı |
| B25 | uygulandı |
| B26 | uygulandı |
| B27 | uygulandı |
| B28 | uygulandı (rapordaki "Ultimatom Oyunu" yazımı, içerikte kullanılan "Ultimatum Oyunu" olarak düzeltildi) |
| B29 | uygulandı |
| B30 | uygulandı |
| B31 | uygulandı |
| B32 | uygulandı |
| B33 | uygulandı |
| B34 | uygulandı (ch16 timescale null) |
| B35 | uygulandı (ch16.links[1] ch02 bağlantısıyla değiştirildi; ch06 bağlantısı zaten vardı) |
| B36 | uygulandı |
| B37 | uygulandı |
| B38 | uygulandı |
| B39 | uygulandı |
| B40 | uygulandı |
| B41 | uygulandı |
| B42 | uygulandı |
| B43 | uygulandı |
| B44 | uygulandı (epilogue'a 3, ch02'ye 1 bağlantı eklendi) |
| B45 | uygulandı |
| B46 | uygulandı |
| B47 | uygulandı |
| B48 | uygulandı (ch03, ch04, ch05, ch10, ch12, ch14, ch15, ch16) |
| B49 | uygulandı (ch01, ch02, ch09, ch10, ch12, ch13, ch14, ch15, epilogue, app2, app3 boşaltıldı; ch11 tek nota indirildi; ch13.links[6].why güncellendi; ch16 ve ch17 korundu) |
| B50 | kısmen (kod: src/pages/home.ts ana sayfada "Türkçe ad önerilen çeviridir (resmî baskı adı doğrulanmadı)." notu + src/styles/app.css .hero-note; başlık h1 ve Türkçe-ad düzeni korundu, orijinal adın öne çıkarılması yapılmadı; isteğe bağlı titleTrNote alanı şema değişmesin diye eklenmedi) |
| B51 | uygulandı (ch17, epilogue, app1-3 kıvrık tırnaklar düzleştirildi; rapor yalnızca ch03-ch13 saymıştı, aynı sorun ch14, ch15, ch16 simülasyon başlıklarında da vardı, onlar da başlık düzenine çevrildi) |

Doğrulama: `npm run typecheck && npm test && npm run build` geçti (9 test dosyası, 61 test).
