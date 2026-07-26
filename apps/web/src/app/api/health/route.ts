import { checkHealth } from "@/server/health";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const health = await checkHealth();

  return Response.json(health, {
    status: health.status === "healthy" ? 200 : 503
  });
}
