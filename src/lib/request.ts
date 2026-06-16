// Récupère l'IP du client à partir des en-têtes du proxy.
// En local, retombe sur une valeur par défaut.
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "127.0.0.1";
}
