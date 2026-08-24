import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { ApiError } from "./utils/apiError";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import planRoutes from "./routes/plans.routes";
import groupRoutes from "./routes/groups.routes";
import logRoutes from "./routes/logs.routes";
import calorieRoutes from "./routes/calories.routes";
import aiRoutes from "./routes/ai.routes";
import healthRoutes from "./routes/health.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import appleNotificationRoutes from "./routes/appleNotifications.routes";

export function createApp() {
  const app = express();

  // Railway/Render/Fly terminate TLS at a proxy. Without this, express-rate-limit
  // sees every request as coming from the proxy's IP and rate-limits all users
  // as one, and req.ip is useless.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser callers (curl, health checks, the
        // Apple Health webhook) which send no Origin header.
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, "");
        if (env.clientUrls.includes(normalized)) return callback(null, true);
        callback(ApiError.forbidden(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 });
  app.use("/api", apiLimiter);

  app.get("/api/health-check", (_req, res) => {
    res.json({ status: "ok", service: "flex-track-api", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/plans", planRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/api/logs", logRoutes);
  app.use("/api/calories", calorieRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  // Apple posts here directly, so it sits outside the authenticated router.
  app.use("/api/apple/notifications", appleNotificationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
