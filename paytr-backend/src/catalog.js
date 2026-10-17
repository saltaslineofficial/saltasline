// Fiyat ve stok bilgilerini müşteri tarafındaki HTML'den değil, buradan doğrulayın.
// Fiyatlar 17 Ekim 2026'da belirtilen satış fiyatlarıdır, kuruş cinsindendir.
// Bu fiyatların KDV dahil nihai müşteri fiyatı olduğu işletme tarafından ayrıca teyit edilmelidir.
// Varyant stokları henüz bilinmiyor; boş bırakılmıştır. PAYTR_ACTIVE=0 ile tahsilat kapalı kalır.
// Varyant örneği (sadece gerçek stok doğrulanınca): { size: "40", color: "Bordo", stock: 2 }
export const CATALOG = Object.freeze({
  elbise1: { name: "Bordo Uzun Elbise", priceKurus: 249999, variants: [] },
  elbise2: { name: "Siyah Puantiyeli Bluz", priceKurus: 299999, variants: [] },
  elbise3: { name: "Haki Yeşil Takım", priceKurus: 349999, variants: [] },
  elbise4: { name: "Ekru Uzun Elbise", priceKurus: 299999, variants: [] },
  elbise5: { name: "Pembe Gömlek", priceKurus: 149999, variants: [] },
});
