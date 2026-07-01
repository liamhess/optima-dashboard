import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPTIMA_API_BASE_URL: z.string().min(1).optional(),
  OPTIMA_API_TOKEN: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(4000),
});

export const env = envSchema.parse(process.env);
