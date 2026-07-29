import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface Review {
  id: string;
  rating: number;
  name: string;
  comment: string | null;
  created_at: string;
}

export interface MyReview {
  id: string;
  rating: number;
  name: string;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface ReviewsResult {
  reviews: Review[];
  average: number;
  total: number;
  myReview: MyReview | null;
}

// Avis approuves (/api/mobile/reviews, public) - equivalent mobile de "Ce
// qu'ils en pensent" sur la homepage, en liste complete. "myReview" n'est
// rempli que si connecte (apiFetch attache le jeton bearer si present).
export function useReviews() {
  const [result, setResult] = useState<ReviewsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/reviews");
      if (!res.ok) throw new Error("request_failed");
      setResult(await res.json());
    } catch {
      setError("Impossible de charger les avis. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { result, loading, error, refresh: load };
}
