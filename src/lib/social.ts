// Agent social-clipper : à la publication d'un article, génère une légende
// réseaux sociaux (Claude) et envoie un WEBHOOK à Make. Make publie l'image +
// la légende sur Instagram/Facebook, et poste le LIEN de l'article en commentaire
// (Instagram ne rend pas les liens cliquables dans la légende). ManyChat gère
// ensuite les réponses/DM via le mot-clé (ex. "DEAL").
import Anthropic from "@anthropic-ai/sdk";
import { getAll } from "./db";
import { site } from "./site";
import type { Post } from "./types";

// Mot-clé à commenter pour déclencher l'envoi du lien en DM via ManyChat.
const KEYWORD = "DEAL";

export interface SocialPayload {
  title: string;
  url: string; // lien de l'article (à mettre en commentaire)
  image_url: string | null; // image à publier
  caption: string; // légende IG/FB (sans lien, avec hashtags + CTA)
  comment: string; // 1er commentaire à poster (contient le lien)
  keyword: string; // mot-clé ManyChat
}

async function generateCaption(
  post: Post,
  url: string
): Promise<{ caption: string; comment: string }> {
  const fallback = {
    caption: `${post.title}\n\n${post.excerpt ?? ""}\n\nCommente ${KEYWORD} et on t'envoie le lien en message prive. Suis-nous pour les bons plans de vols depuis la Belgique et la France, et partage a un ami qui voyage.\n\n#volspascher #bonsplans #voyage #belgique #france #vol #voyagepascher`,
    comment: `Lis l'article complet ici : ${url}\nEt inscris-toi gratuitement sur ${site.domain} pour recevoir les bons plans par email.`,
  };
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 800,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: `Tu es le createur de contenu reseaux sociaux de ${site.name} (newsletter de vols pas chers Belgique/France). Ton complice, malin, direct, joueur. INTERDIT : tiret long (em dash), emoji. Francais avec TOUS les accents. Phrases courtes.

A partir de cet article de blog, ecris UNE publication Instagram/Facebook (la meme legende pour les deux) qui le met en avant et fait grossir la communaute.

Titre : ${post.title}
Resume : ${post.excerpt ?? ""}

Contraintes :
- N'inclus AUCUN lien dans la legende (Instagram ne les rend pas cliquables). Invite plutot a "commenter ${KEYWORD} pour recevoir le lien en message prive" et precise que le lien est aussi "en commentaire".
- Appel a action clair : suivre, commenter, partager.
- Termine par 6 a 8 hashtags pertinents BE/FR (voyage, vols pas chers, bons plans...).
- N'invente aucun prix ni chiffre : reste sur le sujet de l'article.

Reponds STRICTEMENT en JSON, sans texte autour :
{"caption": "la legende complete (avec les hashtags a la fin)", "comment": "le 1er commentaire a poster, qui contient le lien : ${url}"}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text") {
      const i = block.text.indexOf("{");
      const j = block.text.lastIndexOf("}");
      if (i !== -1 && j !== -1) {
        const parsed = JSON.parse(block.text.slice(i, j + 1));
        if (parsed.caption) {
          return {
            caption: String(parsed.caption),
            comment: String(parsed.comment || fallback.comment),
          };
        }
      }
    }
  } catch (e) {
    console.error("[social] generation legende echouee:", e);
  }
  return fallback;
}

// Envoie le webhook Make pour un article. No-op si MAKE_WEBHOOK_URL absent.
// Ne lève jamais (ne doit pas casser la publication de l'article).
export async function notifySocial(post: Post): Promise<void> {
  const hook = process.env.MAKE_WEBHOOK_URL;
  if (!hook) return;
  try {
    const url = `${site.url}/blog/${post.slug}`;
    const { caption, comment } = await generateCaption(post, url);
    const payload: SocialPayload = {
      title: post.title,
      url,
      image_url: post.cover_image ?? null,
      caption,
      comment,
      keyword: KEYWORD,
    };
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[social] webhook Make ${res.status}: ${await res.text()}`);
    }
  } catch (e) {
    console.error("[social] envoi webhook Make echoue:", e);
  }
}

// Rejoue le webhook pour le DERNIER article publié (test / bouton admin / cron).
export async function runSocialClipper(): Promise<{
  ok: boolean;
  post?: string;
  reason?: string;
}> {
  if (!process.env.MAKE_WEBHOOK_URL) {
    return { ok: false, reason: "MAKE_WEBHOOK_URL non configuré" };
  }
  const latest = (await getAll("posts"))
    .filter((p) => p.status === "published")
    .sort((a, b) =>
      (b.published_at ?? b.created_at).localeCompare(
        a.published_at ?? a.created_at
      )
    )[0];
  if (!latest) return { ok: false, reason: "aucun article publié" };
  await notifySocial(latest);
  return { ok: true, post: latest.title };
}
