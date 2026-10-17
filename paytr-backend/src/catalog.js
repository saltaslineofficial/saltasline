// Fiyat ve stok bilgilerini müşteri tarafındaki HTML'den değil, buradan doğrulayın.
// Tamamı bilerek kapalı: onaylanan KDV dahil fiyat ve gerçek varyant stoğu girilmeden ödeme başlatılamaz.
// Varyant örneği (sadece gerçek stok doğrulanınca): { size: "40", color: "Bordo", stock: 2 }
export const CATALOG = Object.freeze({
  elbise1: { name: "Bordo Uzun Elbise", priceKurus: null, variants: [] },
  elbise2: { name: "Siyah Puantiyeli Bluz", priceKurus: null, variants: [] },
  elbise3: { name: "Haki Yeşil Takım", priceKurus: null, variants: [] },
  elbise4: { name: "Ekru Uzun Elbise", priceKurus: null, variants: [] },
  elbise5: { name: "Pembe Gömlek", priceKurus: null, variants: [] },
});
