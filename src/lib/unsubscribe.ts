import { site } from "./site";

// Lien de désinscription en 1 clic, sécurisé par le jeton de l'abonné.
// Sans jeton valide, la désinscription par simple email est refusée (sinon
// n'importe qui pourrait désinscrire n'importe qui).
export function unsubscribeUrl(email: string, token: string): string {
  const e = encodeURIComponent(email);
  const t = encodeURIComponent(token);
  return `${site.url}/desinscription?email=${e}&token=${t}`;
}
