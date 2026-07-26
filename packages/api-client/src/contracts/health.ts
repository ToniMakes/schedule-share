import { z } from "zod";

export const healthStatusResponseSchema = z.object({
  status: z.enum(["healthy", "unhealthy"]),
  checks: z.object({
    database: z.enum(["ok", "unavailable"])
  })
});

export type HealthStatusResponse = z.infer<typeof healthStatusResponseSchema>;
