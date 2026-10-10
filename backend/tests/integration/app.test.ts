import { describe, expect, it } from "vitest";
import { api } from "../helpers/api.js";

describe("app", () => {
  it("GET /api/health responds ok", async () => {
    const res = await api.get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("unknown routes respond with a JSON 404", async () => {
    const res = await api.get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      status: 404,
      message: "Route GET /does-not-exist not found.",
    });
  });
});
