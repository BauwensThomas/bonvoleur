import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("bloque une IP après le seuil et indique le délai de reprise", () => {
    const request = (ip: string) =>
      new Request("https://example.test/api/public", {
        headers: { "x-forwarded-for": ip },
      });

    expect(rateLimit(request("198.51.100.10"), "test", 2)).toBeNull();
    expect(rateLimit(request("198.51.100.10"), "test", 2)).toBeNull();

    const limited = rateLimit(request("198.51.100.10"), "test", 2);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toMatch(/^\d+$/);
  });
});