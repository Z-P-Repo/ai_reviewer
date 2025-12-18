import z from "zod";
import dotenv from "dotenv";
import { formatZodError } from "@schema-hub/zod-error-formatter";

const configSchema = z.object({
  // Third party
  AZURE_ORG_URL: z.string(),
  AZURE_TENANT_ID: z.string(),
  AZURE_CLIENT_ID: z.string(),
  AZURE_CLIENT_SECRET: z.string(),
  LLM_BASE_URL: z.string().url(),
  LLM_API_KEY: z.string(),
  REPO_SERVICE_LOCAL_DIR: z.string(),
  // ZPR server
  ZPR_PORT: z.coerce.number(),
  DB_URI: z.string(),
  DXP_LOCAL_DIR: z.string(),
  INSIGHTS_NODE_API_LOCAL_DIR: z.string(),
  // Authentication
  API_KEY: z.string(),
});

export type ConfigType = z.infer<typeof configSchema>;

dotenv.config({ quiet: true });

const result = configSchema.safeParse(process.env);
if (result.error) {
  const message = formatZodError(result.error, process.env);
  console.error("Failed to load config values");
  console.error(message);
  process.exit(1);
}

console.log("Successfuly loaded the config");
export const env: ConfigType = result.data;
