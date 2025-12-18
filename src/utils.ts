import dotenv from "dotenv";
import z from "zod";
import { formatZodError } from "@schema-hub/zod-error-formatter";
import { BadRequestError } from "./lib/errors";

dotenv.config({ quiet: true });

export const getEnv = (name: string, required: boolean = true) => {
  const value = process.env[name];
  if (!value && required) {
    console.error(`env name ${name} is required, exiting....`);
    process.exit(1);
  }
  return value;
};

export function getFileExtension(fileName: string) {
  return fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2);
}

export const validate = (schema: z.ZodSchema, data: any) => {
  const result = schema.safeParse(data);
  if (result.error) {
    const message = formatZodError(result.error);
    console.error(`error validating the data: ${message}.`);
    throw new BadRequestError(`validation failed: ${message}`);
  }
};

export async function streamToString(
  stream: NodeJS.ReadableStream
): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}
