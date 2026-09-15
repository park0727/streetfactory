import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 비밀값은 .env.secrets, 공개값은 .env.local
config({ path: ".env.secrets" });
config({ path: ".env.local" });
config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // 마이그레이션은 세션 모드(5432, DIRECT_URL)로 직접 연결한다.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  // Supabase 의 auth/storage 스키마는 건드리지 않는다.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
