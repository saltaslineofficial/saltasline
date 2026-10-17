# SALTAŞLİNE – PayTR iFrame ödeme altyapısı (taslak / canlıda KAPALI)

Bu klasör, GitHub Pages'teki statik SALTAŞLİNE sepetini PayTR iFrame API'ye bağlayacak **Cloudflare Worker + D1** sunucu hazırlığıdır.
Canlı tahsilat hazır değildir; ödeme anahtarları GitHub'a yazılmamıştır. Kullanıcının belirttiği satış fiyatları yalnızca herkese açık ürün kataloğu bilgisi olarak eklenmiştir.

## Güvenlik tasarımı

- Kart numarası, CVV ve kartın son kullanma tarihi SALTAŞLİNE sunucularına **gönderilmez**. Form PayTR'ın kendi iFrame'i ile sunulur.
- Web sayfasından gelen **fiyat/toplam değerlerine güvenilmez**; `src/catalog.js` içindeki kuruş fiyatları ve doğrulanmış varyantlar esas alınır. Fiyatların vergiler dahil nihai tüketici fiyatı olduğu ayrıca teyit edilmelidir.
- Satış fiyatları girildi (Bordo 249999 kr, Siyah Bluz 299999 kr, Haki Takım 349999 kr, Ekru 299999 kr, Pembe Gömlek kampanyalı 149999 kr). Varyantlar hâlâ `[]`; gerçek beden/renk/stok teyidi olmadan ödeme açılamaz.
- Kargo bedeli sipariş başına **130,00 TL / 13000 kuruş** olarak belirlendi. `SHIPPING_KURUS` sunucuda tanımlanmıştır.
- `PAYTR_ACTIVE=0` ve `PAYTR_TEST_MODE=1` güvenli ilk ayarlardır. Canlı geçiş ancak test ve işletme onayından sonra yapılır.
- `merchant_id`, `merchant_key`, `merchant_salt` **asla HTML, JavaScript dosyası veya GitHub commit'ine yazılmamalı**. Worker secret olarak saklanmalı.
- Siparişler D1 veri tabanına kaydedilir. `merchant_oid` benzersizdir. PayTR bildirimi sunucu tarafında HMAC ile doğrulanır. Tekrar eden bildirimlerde ikinci kez işleme alınmaz.
- PayTR **ok_url** siparişi ödenmiş olarak işaretlemez; yalnızca geçerli **callback** bunu yapabilir.
- Sipariş onayı ve satış sonrası teslimat yönetimi için işletmenin ayrı takip süreci gerekir. Canlı kullanılmadan önce stok rezervasyonu/yarış durumu, iade, GDPR/KVKK, kayıt erişimi, veri saklama süresi, kötüye kullanım önlemleri ve canlı uçtan uca test ayrıca tamamlanmalıdır. Bu taslak tek başına üretim uyumluluk garantisi değildir.

## Kurulum sırası

1. PayTR üye işyeri başvurusu ve iFrame API yetkisinin onaylanması gerekir: https://dev.paytr.com/iframe-api
2. Cloudflare hesabından Worker + D1 veritabanı oluşturulur: https://developers.cloudflare.com/d1/get-started/
3. `npm install`; `npx wrangler d1 create saltasline-paytr-orders` komutu ile DB oluşturulur ve dönen UUID `wrangler.toml` dosyasına (örneği `wrangler.toml.example`) yazılır.
4. `npx wrangler d1 execute saltasline-paytr-orders --remote --file=./schema.sql` ile tablolar kurulur.
5. Worker secrets olarak `npx wrangler secret put PAYTR_MERCHANT_ID`, `npx wrangler secret put PAYTR_MERCHANT_KEY`, `npx wrangler secret put PAYTR_MERCHANT_SALT` çalıştırılır. **Anahtarları sohbet üzerinden göndermeyin.**
6. Ürün fiyatları satıcının belirttiği tutarlarla dolduruldu; bunların KDV dahil nihai satış fiyatları olduğunu teyit edin. Ardından gerçek beden/renk/stok kombinasyonlarını `src/catalog.js` içine girin. Sipariş sırasında gerçek stokların eşzamanlı korunması için stok rezervasyon tasarımı tamamlanmalıdır.
7. `SHIPPING_KURUS = "13000"` olarak ayarlandı: sipariş başına 130,00 TL, ürün sayısıyla çarpılmaz. Sipariş ekranında, WhatsApp mesajında ve yasal sayfalarda bu tutar gösterilir. **KDV hesabı henüz eklenmedi:** ürün fiyatlarının KDV dahil mi hariç mi olduğu ve uygun vergi işleyişi netleşmeden aktif ödeme başlatmayın.
8. `npx wrangler deploy` ile Worker yayınlanır. PayTR Mağaza Paneli'nde **Bildirim URL**: `https://WORKER_ADRESI/api/paytr/callback`. HTTPS üzerinden dışarıdan POST alabilmeli.
9. GitHub Pages'teki `odeme.html` ve `odeme-sonuc.html` içinde `PAYMENT_API_BASE` değişkeni gerçek Worker HTTPS kök adresiyle güncellenmeli.
10. PayTR panelinden test modunda deneme, HMAC yanlış bildirim reddi, tekrarlanan bildirim, tutar hatası, sepet miktarı manipülasyonu, iade ve sipariş durumuyla ilgili testler yapılmalı. PayTR dokümanı: https://dev.paytr.com/iframe-api/iframe-api-1-adim ve https://dev.paytr.com/iframe-api/iframe-api-2-adim
11. Sadece testler geçince, `PAYTR_ACTIVE="1"` ile yetkiyi açın; **gerçek kartlardan tahsilat** için ayrıca `PAYTR_TEST_MODE="0"` ve PayTR mağaza canlı onayı gerekir.
12. Canlıya geçmeden önce ödeme öncesi metinlerin, toplam fiyatın ve tüketicinin onay akışının mevzuata uygunluğu kontrol edilmelidir. `mesafeli-satis.html` mevcut hâliyle genel ön bilgilendirmedir; siparişe özel sözleşme/onay kayıtları ayrıca gerekir.

## API

- `GET /api/payment/config` → `{ready:false}` başlangıçta; tüm ön koşullar sağlanınca `true`.
- `POST /api/payment/start` → `{items:[{productId,size,color,quantity}], buyer:{name,email,phone,address}, acceptTerms:true}`; sunucu fiyat ve stok doğrular, PayTR'dan iFrame token ister, siparişi D1'e kaydeder. Canlı kodda müşteri verilerinin kullanımına ilişkin KVKK süreçleri tamamlanmalıdır.
- `POST /api/paytr/callback` → PayTR'ın HMAC doğrulamalı bildirim uç noktası; başarılı ve başarısız sonucu D1'e yazar, `OK` döner.
- `GET /api/payment/status/:oid?receipt=... ` → yalnızca sipariş referansı ve rastgele özel makbuz anahtarıyla ödeme durumunu döner.

## Bağımlılık / kısıt

Site statik GitHub Pages'te kalır. Cloudflare Worker yalnızca güvenli sunucu işlemleri içindir.
Buradaki `wrangler.toml.example` bir şablondur; `wrangler.toml` gizli veriler içermemelidir.
Bu dal ve taslak PR, müşteri ödeme ortamına **merge edilmemelidir**: Yetkili hesap, fiyatların vergi dâhil niteliğinin teyidi, kargo, stok, depolama ve gerçek testler eksik.

Kaynak: PayTR resmî iFrame 1-2. adım API belgeleri.
