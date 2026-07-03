"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "promo_code_pending";

// Lit le code promo stocke dans localStorage (par SummerPromoPopup) et
// l'injecte comme champ cache dans le formulaire de checkout.
// Efface le code apres lecture pour ne pas le repliquer a la prochaine commande.
export default function PromoCodeInput() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    setCode(stored);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  if (!code) return null;

  return (
    <>
      <input type="hidden" name="promo_code" value={code} />
      <p className="mt-2 text-xs text-emerald-600 font-medium">
        Code promo applique : {code} (-15%)
      </p>
    </>
  );
}
