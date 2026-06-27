"use client";

import { openCookieSettings } from "@/lib/consent";

export default function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="block py-2.5 text-left hover:text-slate-900"
    >
      Gérer les cookies
    </button>
  );
}
