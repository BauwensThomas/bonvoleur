import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
}

// Articles publies (/api/mobile/posts, public) - equivalent mobile de /blog.
export function usePosts() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/posts");
      if (!res.ok) throw new Error("request_failed");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      setError("Impossible de charger les articles. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, error, refresh: load };
}
