// Fiyat ve stok bilgilerini müşteri tarafındaki HTML'den değil, buradan doğrulayın.
// priceKurus: müşteriye gösterilen KDV (%10) ve kargo dahil ürün son fiyatıdır.
// 18 Ekim 2026: önceki KDV hariç fiyatlara %10 KDV ve her ürünün son fiyatına 130 TL kargo maliyeti yansıtıldı.
// Worker, toplam tutarın içindeki %10 KDV'yi ayrıca vergi kaydı için hesaplar; KDV ikinci kez eklenmez.
// Varyant stoğu doğrulanana kadar ödeme kapalıdır; listeler [] tutulur.
// Varyant örneği (sadece gerçek stok doğrulanınca): { size: "40", color: "Bordo", stock: 2 }
export const CATALOG = Object.freeze({
  elbise1: { name: "Bordo Uzun Elbise", priceKurus: 287999, variants: [] },
  elbise2: { name: "Siyah Puantiyeli Bluz", priceKurus: 342999, variants: [] },
  elbise3: { name: "Haki Yeşil Takım", priceKurus: 397999, variants: [] },
  elbise4: { name: "Ekru Uzun Elbise", priceKurus: 342999, variants: [] },
  elbise5: { name: "Pembe Gömlek", priceKurus: 177999, variants: [] },
});
