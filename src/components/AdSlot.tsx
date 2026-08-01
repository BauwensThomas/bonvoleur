"use client";

import { useEffect, useRef, useState } from "react";
import AdUnit from "./AdUnit";

// Meme composant que AdUnit, mais affiche un cadre "Emplacement publicitaire"
// tant que Google ne remplit pas encore le bloc (compte pas approuve, pas de
// reseau...) - AdSense pose l'attribut data-ad-status="filled"/"unfilled" sur
// le <ins> une fois traite, on l'observe pour remplacer le cadre par la
// vraie pub des qu'elle est active, sans avoir a retoucher au code.
export default function AdSlot(props: {
  slot: string;
  format?: string;
  layoutKey?: string;
  layout?: "in-article";
  fullWidthResponsive?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const ins = wrapRef.current?.querySelector("ins.adsbygoogle");
    if (!ins) return;

    const check = () => setFilled(ins.getAttribute("data-ad-status") === "filled");
    check();
    const observer = new MutationObserver(check);
    observer.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <AdUnit {...props} />
      {!filled && (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
          Emplacement publicitaire
        </div>
      )}
    </div>
  );
}
