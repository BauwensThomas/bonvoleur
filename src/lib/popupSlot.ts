// Evite d'afficher deux popups centrés en meme temps sur la meme page
// (promo ete + annonce app) : le premier qui se declare visible "reserve"
// le slot pour le reste du chargement de page.
const KEY = "bv_popup_slot_claimed";

export function claimPopupSlot(): boolean {
  if (typeof window === "undefined") return false;
  if (window.sessionStorage.getItem(KEY)) return false;
  window.sessionStorage.setItem(KEY, "1");
  return true;
}
