import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { PostSummary } from "./usePosts";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Post {
  slug: string;
  title: string;
  content: string; // markdown
  excerpt: string;
  author: string;
  cover_image: string | null;
  cover_image_credit: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  faq: FaqItem[];
  reading_minutes: number;
  related: PostSummary[];
}

// Article par slug (/api/mobile/posts/[slug], public) - equivalent mobile
// de /blog/[slug]. notFound=true si l'article n'existe pas ou n'est pas
// publie (meme regle que le site : jamais fuiter un brouillon).
export function usePost(slug: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setNotFound(false);
    try {
      const res = await apiFetch(`/api/mobile/posts/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("request_failed");
      setPost(await res.json());
    } catch {
      setError("Impossible de charger l'article. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return { post, loading, notFound, error, refresh: load };
}
