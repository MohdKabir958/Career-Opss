import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4310),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY is required"),
    CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
    OPENAI_API_KEY: z.string().optional().default(""),
    OPENAI_MODEL: z.string().optional().default("gpt-4o-mini"),
    ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. Check web/server/.env");
}
export const env = parsed.data;
export function hasOpenAIKey() {
    return Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "sk-REPLACE_ME");
}
