"use client";

import { openCookieSettings } from "@/lib/consent";

export default function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="hover:text-slate-900 text-left"
    >
      Gérer les cookies
    </button>
  );
}
