import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  apple: {
    clientId: process.env.APPLE_CLIENT_ID ?? "",
    teamId: process.env.APPLE_TEAM_ID ?? "",
    keyId: process.env.APPLE_KEY_ID ?? "",
    privateKey: process.env.APPLE_PRIVATE_KEY ?? "",
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
};
