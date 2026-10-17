import { CATALOG } from "./catalog.js";

const enc = new TextEncoder();
const SITE = "https://saltaslineofficial.github.io";
const STORE_ROOT = SITE + "/saltasline/";

const reply = (body, status = 200, origin = "") => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) },
});
const safeString = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const validEmail = x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) && /^[\x00-\x7F]+$/.test(x);
const digits = x => /^[0-9]+$/.test(x);
const toMoney = value => (Number.isSafeInteger(value) && value >= 0 ? value : null);
const base64 = bytes => btoa(String.fromCharCode(...bytes));
const secureCompareSignature = async (secret, plainText, encodedSignature) => {
  if (!encodedSignature || !/^[A-Za-z0-9+/]+={0,2}$/.test(encodedSignature)) return false;
  try {
    const bin = atob(encodedSignature);
    const signature = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("HMAC", key, signature, enc.encode(plainText));
  } catch { return false; }
};
const sign = async (secret, text) => {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text))));
};
const encodeBasket = rows => base64(enc.encode(JSON.stringify(rows)));
const configured = env => env.PAYTR_ACTIVE === "1" && !!env.PAYTR_MERCHANT_ID && !!env.PAYTR_MERCHANT_KEY
  && !!env.PAYTR_MERCHANT_SALT && !!env.DB && /^\d+$/.test(String(env.SHIPPING_KURUS ?? ""))
  && Object.values(CATALOG).every(p => toMoney(p.priceKurus) !== null && p.priceKurus > 0 &&
    p.variants.length > 0);
const corsOrigin = req => req.headers.get("Origin") === SITE ? SITE : "";
const cleanCart = cart => {
  if (!Array.isArray(cart) || !cart.length || cart.length > 25) throw Error("Geçersiz sepet.");
  let subtotal = 0, totalItems = 0;
  const rows = [], stored = [];
  for (const item of cart) {
    if (!item || typeof item !== "object") throw Error("Ürün geçersiz.");
    const id = safeString(item.productId, 30);
    const p = CATALOG[id];
    const qty = Number(item.quantity);
    const size = safeString(item.size, 20), color = safeString(item.color, 40);
    if (!p || !Number.isSafeInteger(qty) || qty < 1 || qty > 20) throw Error("Ürün adedi geçersiz.");
    const variant = p.variants.find(v => v.size === size && v.color.toLocaleLowerCase("tr") === color.toLocaleLowerCase("tr"));
    if (!variant || !Number.isSafeInteger(variant.stock) || qty > variant.stock) throw Error("Beden, renk veya stok teyit edilmedi: " + p.name);
    if (!Number.isSafeInteger(p.priceKurus) || p.priceKurus <= 0) throw Error("Ürün fiyatı henüz belirlenmedi.");
    subtotal += p.priceKurus * qty;
    totalItems += qty;
    rows.push([p.name + " / " + size + " / " + variant.color, (p.priceKurus / 100).toFixed(2), qty]);
    stored.push({ productId:id, name:p.name, size, color:variant.color, quantity:qty, priceKurus:p.priceKurus });
  }
  if (totalItems > 40 || !Number.isSafeInteger(subtotal)) throw Error("Sepet limiti aşıldı.");
  return { subtotal, rows, stored };
};
const statusResponse = async (req, env, oid, origin) => {
  const receipt = new URL(req.url).searchParams.get("receipt");
  if (!/^[a-f0-9]{32}$/.test(receipt || "") || !/^[A-Za-z0-9]{10,64}$/.test(oid)) return reply({ error:"Kayıt bulunamadı." },404,origin);
  const found = await env.DB.prepare("SELECT status FROM orders WHERE merchant_oid=? AND receipt=?").bind(oid,receipt).first();
  return found ? reply({ status:found.status },200,origin) : reply({ error:"Kayıt bulunamadı." },404,origin);
};
const quote = async (req, env, origin) => {
  if (!configured(env)) return reply({ error: "Ödeme henüz etkin değil." },503,origin);
  if (Number(req.headers.get("Content-Length") || 0)>16000) return reply({error:"İstek çok büyük."},413,origin);
  const body=await req.json().catch(()=>null);
  let basket;
  try {basket=cleanCart(body?.items);}catch(e){return reply({error:e.message},400,origin);}
  const shippingKurus=Number(env.SHIPPING_KURUS);
  const totalKurus=basket.subtotal+shippingKurus;
  if (!Number.isSafeInteger(totalKurus)||totalKurus<100) return reply({error:"Toplam tutar geçersiz."},400,origin);
  return reply({ subtotalKurus:basket.subtotal,shippingKurus,totalKurus,currency:"TRY" },200,origin);
};
const start = async (req, env, origin) => {
  if (!configured(env)) return reply({error:"Ödeme sistemi henüz aktif değil."},503,origin);
  if (Number(req.headers.get("Content-Length") || 0) > 16000) return reply({ error:"İstek çok büyük." },413,origin);
  const body = await req.json().catch(() => null);
  if (!body || body.acceptTerms !== true) return reply({error:"Satış koşullarını onaylayınız."},400,origin);
  const buyer = body.buyer || {};
  const name = safeString(buyer.name,60), email=safeString(buyer.email,100), phone=safeString(buyer.phone,20);
  const address=safeString(buyer.address,400);
  if (name.length<3 || !validEmail(email) || phone.length<10 || !/^[+0-9 ()-]{10,20}$/.test(phone) || address.length<10)
    return reply({ error:"Teslimat ve iletişim bilgilerini kontrol ediniz." },400,origin);
  let basket;
  try { basket=cleanCart(body.items); } catch(e) { return reply({error:e.message},400,origin); }
  const shipping = Number(env.SHIPPING_KURUS);
  if (!Number.isSafeInteger(shipping) || shipping<0) return reply({error:"Kargo bedeli ayarlanmamış."},503,origin);
  const amount = basket.subtotal + shipping;
  if (!Number.isSafeInteger(amount) || amount<100) return reply({error:"Ödeme toplamı hatalı."},400,origin);
  if (shipping > 0) basket.rows.push(["Kargo", (shipping/100).toFixed(2), 1]);
  const userIp=req.headers.get("CF-Connecting-IP") || "";
  if (!userIp || userIp.length>39 || !/^[0-9a-fA-F:.]+$/.test(userIp))
    return reply({error:"Müşteri IP adresi doğrulanamadı."},400,origin);
  const id="SL"+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,"0")).join("");
  const receipt=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
  const basket64=encodeBasket(basket.rows);
  const testMode=env.PAYTR_TEST_MODE === "0" ? "0" : "1"; // Güvenli varsayılan: test modu
  const noInstallment="1", maxInstallment="0", currency="TL";
  const paymentAmount=String(amount);
  const tokenPlain=env.PAYTR_MERCHANT_ID+userIp+id+email+paymentAmount+basket64+
    noInstallment+maxInstallment+currency+testMode+env.PAYTR_MERCHANT_SALT;
  const paytrToken=await sign(env.PAYTR_MERCHANT_KEY,tokenPlain);
  const resultBase=STORE_ROOT+"odeme-sonuc.html?oid="+encodeURIComponent(id)+"&receipt="+receipt;
  const fields=new URLSearchParams({
    merchant_id:env.PAYTR_MERCHANT_ID,user_ip:userIp,merchant_oid:id,email,payment_amount:paymentAmount,
    currency,user_basket:basket64,no_installment:noInstallment,max_installment:maxInstallment,
    paytr_token:paytrToken,user_name:name,user_address:address,user_phone:phone,
    merchant_ok_url:resultBase+"&return=ok",merchant_fail_url:resultBase+"&return=fail",
    test_mode:testMode,debug_on:"0",timeout_limit:"30",lang:"tr",
  });
  await env.DB.prepare("INSERT INTO orders (merchant_oid,receipt,buyer_json,items_json,expected_amount,status) VALUES (?,?,?,?,?,'pending')")
    .bind(id,receipt,JSON.stringify({name,email,phone,address}),JSON.stringify(basket.stored),amount).run();
  let api;
  try {
    const response=await fetch("https://www.paytr.com/odeme/api/get-token",{method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:fields.toString(),signal:AbortSignal.timeout(18000)});
    api=await response.json();
    if (!response.ok || api.status !== "success" || !/^[a-zA-Z0-9_-]+$/.test(api.token || "")) throw Error("PayTR token alınamadı");
  } catch(e) {
    await env.DB.prepare("UPDATE orders SET status='init_failed',updated_at=CURRENT_TIMESTAMP WHERE merchant_oid=? AND status='pending'").bind(id).run();
    return reply({error:"Ödeme bağlantısı kurulamadı. Lütfen daha sonra deneyin."},502,origin);
  }
  return reply({orderId:id,receipt,amountKurus:amount,shippingKurus:shipping,iframeUrl:"https://www.paytr.com/odeme/guvenli/"+api.token},200,origin);
};
const callback = async (req,env) => {
  if (!env.PAYTR_MERCHANT_KEY || !env.PAYTR_MERCHANT_SALT || !env.DB) return new Response("Config error",{status:503});
  const raw=await req.text();
  if(raw.length>5000) return new Response("Too large",{status:413});
  const data=new URLSearchParams(raw);
  const oid=data.get("merchant_oid") || "", state=data.get("status") || "";
  const amount=data.get("total_amount") || "", hash=data.get("hash") || "";
  if(!/^[A-Za-z0-9]{10,64}$/.test(oid) || !["success","failed"].includes(state) || !digits(amount) || amount.length>16)
    return new Response("Bad callback",{status:400});
  const valid=await secureCompareSignature(env.PAYTR_MERCHANT_KEY,oid+env.PAYTR_MERCHANT_SALT+state+amount,hash);
  if(!valid) return new Response("Invalid hash",{status:403});
  const order=await env.DB.prepare("SELECT status,expected_amount FROM orders WHERE merchant_oid=?").bind(oid).first();
  if(!order) return new Response("Unknown order",{status:404});
  if(order.status==="paid" || order.status==="failed") return new Response("OK");
  if(order.status!=="pending") return new Response("Invalid state",{status:409});
  // PayTR taksit farkı nedeniyle total_amount tahsilat tutarı expected_amount'tan yüksek olabilir; düşük olamaz.
  const paidAmount=Number(amount);
  if(state==="success" && (!Number.isSafeInteger(paidAmount) || paidAmount<order.expected_amount)) return new Response("Amount mismatch",{status:409});
  const newStatus=state==="success"?"paid":"failed";
  await env.DB.prepare("UPDATE orders SET status=?,paid_amount=?,updated_at=CURRENT_TIMESTAMP WHERE merchant_oid=? AND status='pending'")
    .bind(newStatus,paidAmount,oid).run();
  return new Response("OK",{headers:{"Content-Type":"text/plain; charset=utf-8"}});
};
export default {
  async fetch(req,env) {
    const url=new URL(req.url), origin=corsOrigin(req);
    if(req.method==="OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null,{status:204,headers:{
        ...(origin ? {"Access-Control-Allow-Origin":origin} : {}),
        "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"3600","Vary":"Origin"}});
    }
    try {
      if(url.pathname==="/api/paytr/callback" && req.method==="POST") return await callback(req,env);
      if(url.pathname==="/api/paytr/callback") return new Response("Method Not Allowed",{status:405});
      if(url.pathname==="/api/payment/config" && req.method==="GET") return reply({ready:configured(env)},200,origin);
      if(url.pathname.startsWith("/api/")) {
        // Sadece SALTAŞLİNE sayfasından tarayıcı isteği kabul edilir; bu ayrıca kimlik doğrulama yerine geçmez.
        if(!origin) return reply({error:"İzin verilmeyen kaynak."},403);
        if(url.pathname==="/api/payment/quote" && req.method==="POST") return await quote(req,env,origin);
        if(url.pathname==="/api/payment/start" && req.method==="POST") return await start(req,env,origin);
        const match=url.pathname.match(/^\/api\/payment\/status\/([A-Za-z0-9]{10,64})$/);
        if(match && req.method==="GET" && env.DB) return await statusResponse(req,env,match[1],origin);
        return reply({error:"Bulunamadı."},404,origin);
      }
      return new Response("SALTAŞLİNE PayTR API",{status:200,headers:{"Content-Type":"text/plain; charset=utf-8"}});
    } catch(e) {
      console.error("PayTR service error", e?.message);
      return url.pathname==="/api/paytr/callback" ? new Response("Server error",{status:500}) : reply({error:"İşlem tamamlanamadı."},500,origin);
    }
  }
};
