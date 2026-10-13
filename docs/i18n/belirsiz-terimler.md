# Terim kararları (belirsizlikler çözüldü)

Bölüm ve simülasyon çevirileri sırasında çevirmenlerin işaretlediği belirsizlikler gözden geçirildi; her biri aşağıdaki ilkelere göre karara bağlandı. Kesinleşen terimler `content/glossary.json`'a işlendi, bölüm dosyalarındaki geçici `_uncertain` notları silindi.

## Adlandırma ilkeleri
1. **Deney/paradigma adı literatürde yerleşikse onu kullan** (Cyberball, Stanford Prison Experiment, Milgram obedience experiments, Ultimatum Game, Watching eyes effect, parochial altruism…).
2. **Yerleşik kısa ad yoksa** makale başlığından türetilmiş kısa, betimleyici ad kullanılır; araştırmacı parantezi Türkçedeki gibi korunur. Bu tür adlar bilinçli olarak betimleyicidir ve "uydurma standart ad" iddiası taşımaz (aşağıda "betimleyici adlar").
3. **Türkçe metinle sadakat:** Türkçe kaynağın içeriği (sayı, çekince) değiştirilmez; yalnızca açık yazım/olgu hataları kaynakta düzeltilir (aşağıda).
4. İngilizce Amerikan yazımıdır; kuruluş adları kendi yazımıyla (ör. *Centre for the Study of Violence and Reconciliation*) kalır.
5. Arayüzde replikasyon etiketleri: *robust / mixed / contested / unknown* (iç anahtarlar Türkçe kalır).

## Değiştirilenler (bu turda)
| Konu | Karar |
|---|---|
| ch03-e4 | "Watching-eyes effect of eye images" → **Watching eyes effect (images of eyes)** (literatür terimi). |
| ch04-e8 | Ad, çalışmanın literatürdeki adını içerecek şekilde → **Oxytocin and parochial altruism: the us-versus-them distinction (De Dreu)**. |
| ch07-e10 | **…Romanian orphanages (Bucharest Early Intervention Project)**: çalışmanın gerçek adı eklendi (yöntem metninde zaten geçiyordu). |
| ch01 keyStudies | "Newspaper…" → **Magazine profile of organ donors (MacFarquhar, 2009)** (kaynak *The New Yorker* dergisi; deney adıyla tutarlı). |
| ch12 keyStudies (Asch) | "katılımcıların üçte biri" → **denemelerin** yaklaşık üçte birinde uyma (Asch'ın bulgusu deneme başınadır; ch12-e8 ile tutarlı). |
| ch12-e9 (Milgram) | "birbirini duyup görmeden" ifadesi bulgu bölümündeki yakınlık varyasyonlarıyla çelişiyordu → **birbirini görmeden**. |

## Türkçe kaynakta (`content/chapters.json`) düzeltilen hatalar
- ch11-e11: "bebek bezi" → **oyuncak bebek** (ad ve soru; Clark doll test). Denetim notları bunu düzeltilmiş saymıştı, iki yerde kalmıştı.
- "Ültimatom Oyunu" (ch08/ch15/ch16, 3 yer) → **Ultimatum Oyunu**.
- ch01: "gazete incelemesi" → **dergi incelemesi**.
- ch12 iki tutarsızlık (yukarıdaki tablo).

## Bilinçli olarak olduğu gibi bırakılanlar
- **ch13-e8:** kitap ve Türkçe metin "25 küçük ölçekli kültür" diyor, atıf yapılan Henrich ve ark. 2010 makalesi 15 toplumu kapsıyor. Türkçe replikasyon notu bunu zaten belirtiyor; İngilizce de aynı şekilde "25" yazıyor ve not korunuyor.
- **ch09-e8:** Calhoun'un 1950–60'lardaki nüfus yoğunluğu çalışmaları **sıçanlarla** yapıldı (davranışsal çöküntü); fareli çalışma "Universe 25" ayrı bir deney. "Rats" doğru.
- **ch14-e4:** Türkçe cümle (farklı soyda büyüyen sıçan) belirsiz yazılmış; İngilizce, anlaşılır tek anlamıyla verildi (büyüdüğü soya yardım etti, biyolojik soya değil).
- **ch13-e1:** Türkçe "patron" → metinde *boss*, ad Knobe'un standart *chairman* vakasıyla ("side-effect effect") adlandırıldı.
- **ch17:** *Open-book game* (tireli yazım), *Garbage Dump troop*, *court-martial*, *Truth and Reconciliation Commission*.
- **ch06-e9:** *meritocratic / utilitarian / libertarian* (Almås ve ark. sınıflaması).
- **ch03:** "pheromones" Türkçedeki terimle korundu; insanlar için tartışmalı olduğu ilgili metinde belirtiliyor.
- **ch08-e6:** "pants-dropping gene" Türkçedeki gayriresmî anlatımın sadık çevirisi (Brunner sendromu notu korunuyor).

## Betimleyici adlar (standart kısa adı olmayan deneyler)
Aşağıdakiler makale başlığından/Türkçe adın karşılığı olarak türetilmiş betimleyici adlardır; atıf (`sources`) her zaman kesin başlığı verir:
ch01-e1/e2/e3 · ch02-e1/e4 · ch03-e1/e5/e6/e10/e12 · ch04-e1/e3/e5/e12 · ch05-e6/e7/e8/e9/e10 · ch06-e3/e8 · ch07-e1/e2/e7 · ch08-e2/e3/e4/e7/e9/e10/e11/e12 · ch09-e1/e2/e5/e9 · ch11-e2/e4/e7/e8/e12 · ch12-e1/e2/e5 · ch13-e2/e3/e5/e10/e12 · ch14-e1 · ch15-e2/e8 · ch16-e1/e4/e5 · ch17-e1/e2/e5/e7.
İleride bir deney için daha yerleşik bir ad bulunursa yalnızca ilgili `content/en/<bölüm>.json` içindeki `name` alanı değiştirilir.

## Simülasyon terimleri (karara bağlandı, sözlüğe işlendi)
ingroup/outgroup, free rider, reaction norm, warm glow, caudate nucleus, Preconventional/Conventional/Postconventional, missing heritability, confederate (Asch), court-martial, Competitive Reaction Time Task, parochial altruism, BEIP, Cyberball, Macbeth effect, Dunbar's number, stress hyporesponsive period, subtract-and-replace, contested.
Diğer sim terimleri (ör. *Binding eagerness / Receptor fussiness*, *female tension*, *Charity sensitivity*, devre düğümleri I/T/N) çevirmenin seçimidir ve ilgili simülasyonun `text.en.ts` dosyasında tek yerde durur; değiştirmek gerekirse yalnızca orası güncellenir.
