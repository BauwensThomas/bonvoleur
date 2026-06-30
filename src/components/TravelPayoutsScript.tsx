"use client";

import { usePathname } from "next/navigation";

export default function TravelPayoutsScript() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <script
      {...{ nowprocket: "", "seraph-accel-crit": "1" }}
      data-noptimize="1"
      data-cfasync="false"
      data-wpfc-render="false"
      data-no-defer="1"
      dangerouslySetInnerHTML={{
        __html: `(function () {
  var script = document.createElement("script");
  script.async = 1;
  script.src = 'https://emrldtp.com/NTQ0NTQ4.js?t=544548';
  document.head.appendChild(script);
})();`,
      }}
    />
  );
}
