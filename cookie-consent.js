/* FUBERİ — açık seçimli çerez/yerel depolama yönetimi.
 * Reklam/analitik kodu yoktur. İsteğe bağlı tercih saklama ve Google Fonts
 * onaydan önce devreye girmez. İzinler sonradan geri alınabilir.
 */
(function(){
  "use strict";
  const KEY="fuberi-cookie-choice-v1";
  const DAYS=180;
  function read(){
    try{
      const data=JSON.parse(localStorage.getItem(KEY)||"null");
      if(!data||data.version!==1||typeof data.preferences!=="boolean"||typeof data.fonts!=="boolean")return null;
      if(!Number.isFinite(data.savedAt)||Date.now()-data.savedAt>DAYS*86400000||data.savedAt>Date.now()+86400000)return null;
      return data;
    }catch(e){return null}
  }
  let choice=read();
  const enabled=category=>Boolean(choice&&choice[category]===true);
  const publicAPI={
    allows:enabled,
    choice:()=>choice?{preferences:choice.preferences,fonts:choice.fonts}:null,
    openPreferences:()=>{const dialog=document.getElementById("fbCookieDialog");if(dialog)openDialog(dialog)}
  };
  window.FuberiConsent=publicAPI;
  function applyFontChoice(){
    const marker=document.querySelector('meta[name="fuberi-optional-font"]');
    if(!marker)return;
    const existing=document.getElementById("fbConsentedGoogleFont");
    if(enabled("fonts")){
      if(!existing){
        const link=document.createElement("link");
        link.id="fbConsentedGoogleFont";
        link.rel="stylesheet";
        link.href=marker.content;
        document.head.appendChild(link);
      }
    }else if(existing)existing.remove();
  }
  applyFontChoice();
  function safeDelete(key){try{localStorage.removeItem(key)}catch(e){}}
  function save(preferences,fonts){
    choice={version:1,preferences:Boolean(preferences),fonts:Boolean(fonts),savedAt:Date.now()};
    try{localStorage.setItem(KEY,JSON.stringify(choice))}catch(e){}
    if(!choice.preferences){
      safeDelete("fuberi-favorites-v1");
      safeDelete("fuberi-theme");
      safeDelete("saltasline-theme");
    }
    applyFontChoice();
    const banner=document.getElementById("fbCookieBanner");
    if(banner)banner.hidden=true;
    const dialog=document.getElementById("fbCookieDialog");
    if(dialog&&dialog.open)dialog.close();
    window.dispatchEvent(new CustomEvent("fuberi:consent-change",{detail:{preferences:choice.preferences,fonts:choice.fonts}}));
  }
  function openDialog(dialog){
    const preferences=document.getElementById("fbCookiePreferences");
    const fonts=document.getElementById("fbCookieFonts");
    if(preferences)preferences.checked=enabled("preferences");
    if(fonts)fonts.checked=enabled("fonts");
    if(typeof dialog.showModal==="function")dialog.showModal();
    else dialog.setAttribute("open","");
  }
  function init(){
    if(document.getElementById("fbCookieBanner"))return;
    const banner=document.createElement("section");
    banner.id="fbCookieBanner";
    banner.className="fb-cookie-banner";
    banner.setAttribute("aria-label","FUBERİ çerez tercihi");
    banner.hidden=Boolean(choice);
    banner.innerHTML='<span class="fb-cookie-eyebrow">FUBERİ / GİZLİLİK</span>'+
      '<h2>Çerez tercihleri</h2>'+
      '<p>Sitemizin çalışması için gerekli tarayıcı kayıtları kullanılabilir. İzin verirseniz favorilerinizi ve görünüm tercihinizi hatırlarız; Google Fonts yazı tiplerini yükleriz. Reklam ve analiz çerezi kullanmıyoruz. <a href="cerez-politikasi.html">Çerez Politikası</a></p>'+
      '<div class="fb-cookie-actions">'+
      '<button type="button" data-fb-cookie-action="all">Kabul Et</button>'+
      '<button type="button" data-fb-cookie-action="none">Reddet</button>'+
      '<button type="button" data-fb-cookie-action="settings">Tercihler</button>'+
      '</div>';
    const dialog=document.createElement("dialog");
    dialog.id="fbCookieDialog";
    dialog.className="fb-cookie-dialog";
    dialog.setAttribute("aria-labelledby","fbCookieTitle");
    dialog.innerHTML='<div class="fb-cookie-dialog-inner">'+
      '<div class="fb-cookie-dialog-top"><div><span class="fb-cookie-eyebrow">FUBERİ / GİZLİLİK</span>'+
      '<h2 id="fbCookieTitle">Çerez tercihlerini yönet</h2></div>'+
      '<button type="button" class="fb-cookie-close" aria-label="Tercihleri kapat" id="fbCookieClose">×</button></div>'+
      '<p>Tercihinizi istediğiniz zaman sayfanın altındaki “Çerez tercihleri” düğmesinden değiştirebilirsiniz. Zorunlu olmayan seçenekler başlangıçta kapalıdır.</p>'+
      '<div class="fb-cookie-option"><div><h3>Gerekli kayıtlar</h3><p>Çerez seçiminizin hatırlanması ve sitenin temel işlemleri. Kapatılamaz.</p></div><span class="fb-cookie-required">HER ZAMAN AÇIK</span></div>'+
      '<label class="fb-cookie-option" for="fbCookiePreferences"><span><h3>Tercihleri hatırla</h3><p>Favori ürünleriniz ve açık/koyu görünüm seçiminiz bu tarayıcıda saklanır.</p></span><input id="fbCookiePreferences" type="checkbox"></label>'+
      '<label class="fb-cookie-option" for="fbCookieFonts"><span><h3>Google Fonts</h3><p>FUBERİ’nin özel yazı tipleri Google üzerinden indirilir. Kabul etmezseniz sistem yazı tipi kullanılır.</p></span><input id="fbCookieFonts" type="checkbox"></label>'+
      '<button class="fb-cookie-save" id="fbCookieSave" type="button">Tercihlerimi Kaydet</button>'+
      '<p class="fb-cookie-subnote">Ayrıntılar: <a href="cerez-politikasi.html">Çerez Politikası</a> ve <a href="gizlilik.html">Gizlilik Politikası</a>.</p>'+
      '</div>';
    document.body.append(banner,dialog);
    const footerNav=document.querySelector(".site-footer .footer-links, .footer .footer-links");
    if(footerNav){
      const button=document.createElement("button");
      button.type="button";
      button.className="fb-cookie-open";
      button.textContent="Çerez tercihleri";
      button.addEventListener("click",()=>openDialog(dialog));
      footerNav.appendChild(button);
    }
    banner.querySelector('[data-fb-cookie-action="all"]').addEventListener("click",()=>save(true,true));
    banner.querySelector('[data-fb-cookie-action="none"]').addEventListener("click",()=>save(false,false));
    banner.querySelector('[data-fb-cookie-action="settings"]').addEventListener("click",()=>openDialog(dialog));
    dialog.querySelector("#fbCookieClose").addEventListener("click",()=>dialog.close());
    dialog.querySelector("#fbCookieSave").addEventListener("click",()=>{
      save(document.getElementById("fbCookiePreferences").checked,
           document.getElementById("fbCookieFonts").checked);
    });
    dialog.addEventListener("click",event=>{
      if(event.target===dialog)dialog.close();
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
