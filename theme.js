/* SALTAŞLİNE — tek tıkla beyaz/karanlık mod. Seçim aynı sitedeki diğer sayfalarda korunur. */
(function(){
  "use strict";
  const KEY="saltasline-theme";
  const root=document.documentElement;
  let value="light";
  try { value=window.localStorage.getItem(KEY)==="dark"?"dark":"light"; } catch (_) {}
  root.setAttribute("data-theme",value);

  function refresh(){
    const dark=root.getAttribute("data-theme")==="dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(button=>{
      button.setAttribute("aria-pressed",String(dark));
      button.setAttribute("aria-label",dark?"Beyaz moda geç":"Karanlık moda geç");
      button.setAttribute("title",dark?"Beyaz moda geç":"Karanlık moda geç");
      const icon=button.querySelector(".theme-icon");
      const label=button.querySelector(".theme-label");
      if(icon)icon.textContent=dark?"☀":"☾";
      if(label)label.textContent=dark?"Beyaz mod":"Karanlık mod";
    });
  }
  function switchTheme(){
    const next=root.getAttribute("data-theme")==="dark"?"light":"dark";
    root.setAttribute("data-theme",next);
    try{window.localStorage.setItem(KEY,next);}catch(_){}
    refresh();
  }
  function init(){
    document.querySelectorAll("[data-theme-toggle]").forEach(button=>button.addEventListener("click",switchTheme));
    refresh();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
