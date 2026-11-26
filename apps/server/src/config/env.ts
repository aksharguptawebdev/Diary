import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  path: ["apps/server/.env.local", ".env.local", "apps/server/.env", ".env"],
});

// Custom boolean-string transformer: strictly accepts "true" or "false" (case-insensitive)
export const booleanString = z.union([
  z.boolean(),
  z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(["true", "false"]))
    .transform((val) => val === "true"),
]);

export const envSchema = z
  .object({
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    MONGO_URI: z
      .string()
      .default("mongodb://127.0.0.1:27017/personal_diary_notes"),

    // Strict secrets: minimum 32 characters
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters")
      .default("diary_notes_jwt_access_secret_token_key_change_in_production"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters")
      .default("diary_notes_jwt_refresh_secret_token_key_change_in_production"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // Exact CORS origins, comma-separated (e.g. "http://localhost:5173,https://yourapp.vercel.app")
    CORS_ORIGINS: z
      .string()
      .default(process.env.CORS_ORIGIN || "http://localhost:5173"),
    TRASH_RETENTION_DAYS: z.coerce.number().default(30),

    // Optional for local startup; required by the production runtime check.
    CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
    CLOUDINARY_API_KEY: z.string().trim().optional(),
    CLOUDINARY_API_SECRET: z.string().trim().optional(),

    // Android Release Configuration
    ANDROID_VERSION_NAME: z.string().trim().min(1).default("1.0.1"),
    ANDROID_VERSION_CODE: z.coerce.number().int().positive().default(2),
    ANDROID_MIN_VERSION_CODE: z.coerce.number().int().positive().default(1),
    ANDROID_APK_URL: z
      .string()
      .trim()
      .url("ANDROID_APK_URL must be a valid URL")
      .optional()
      .or(z.literal("")),
    ANDROID_GITHUB_RELEASE_API: z
      .string()
      .trim()
      .url()
      .or(z.literal(""))
      .default(
        "https://api.github.com/repos/akshar-codes/Diary/releases/latest",
      )
      .transform(
        (val) =>
          val ||
          "https://api.github.com/repos/akshar-codes/Diary/releases/latest",
      ),
    ANDROID_RELEASE_NOTES: z
      .string()
      .trim()
      .default("Bug fixes and stability improvements."),
    ANDROID_RELEASE_DATE: z.string().trim().optional(), // Static ISO string or omitted
    ANDROID_UPDATE_MANDATORY: booleanString.default(false),

    // Web Release Configuration
    WEB_VERSION: z.string().trim().min(1).default("1.0.0"),
    WEB_RELEASE_NOTES: z.string().trim().default(""),
    WEB_RELEASE_DATE: z.string().trim().optional(),

    // OAuth Configuration
    GOOGLE_CLIENT_ID: z.string().trim().optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
    GOOGLE_CALLBACK_URL: z
      .string()
      .url()
      .default("http://localhost:5000/api/v1/auth/google/callback"),

    GITHUB_CLIENT_ID: z.string().trim().optional(),
    GITHUB_CLIENT_SECRET: z.string().trim().optional(),
    GITHUB_CALLBACK_URL: z
      .string()
      .url()
      .default("http://localhost:5000/api/v1/auth/github/callback"),

    // Brevo Transactional Email Configuration
    BREVO_API_KEY: z.string().trim().optional(),
    EMAIL_SENDER_NAME: z.string().trim().default("Journal & Notes"),
    EMAIL_SENDER_ADDRESS: z
      .string()
      .trim()
      .email()
      .default("noreply@yourdomain.com"),

    // Frontend Application URL
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  })
  .refine(
    (data) => data.ANDROID_MIN_VERSION_CODE <= data.ANDROID_VERSION_CODE,
    {
      message:
        "ANDROID_MIN_VERSION_CODE cannot be greater than ANDROID_VERSION_CODE",
      path: ["ANDROID_MIN_VERSION_CODE"],
    },
  );

export function parseEnv(rawEnv: NodeJS.ProcessEnv = process.env) {
  const requiredInProduction = [
    "MONGO_URI",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const envToParse = {
    ...rawEnv,
    CORS_ORIGINS:
      rawEnv.CORS_ORIGINS || rawEnv.CORS_ORIGIN || "http://localhost:5173",
  };

  const schema = envSchema.superRefine((_, context) => {
    if (rawEnv.NODE_ENV !== "production") return;

    for (const name of requiredInProduction) {
      if (!rawEnv[name]?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message: `${name} is required in production`,
        });
      }
    }

    if (!rawEnv.CORS_ORIGINS?.trim() && !rawEnv.CORS_ORIGIN?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "CORS_ORIGINS is required in production",
      });
    }
  });

  return schema.safeParse(envToParse);
}

const parsedEnv = parseEnv(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment variables:",
    JSON.stringify(parsedEnv.error.format(), null, 2),
  );
  process.exit(1);
}

export const env = parsedEnv.data;
