import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust reverse proxies (Nginx, Traefik, AWS ALB, Cloudflare, etc.) when deploying with HTTPS
app.set("trust proxy", 1);

// Configure CORS for local development and HTTPS production deployment
const allowedOriginsEnv = process.env.CORS_ORIGIN || "*";
const explicitOrigins = allowedOriginsEnv === "*" 
  ? ["*"] 
  : allowedOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, curl, Postman, mobile apps, or requests without Origin header
    if (!origin) return callback(null, true);

    // If wildcard is set
    if (explicitOrigins.includes("*")) {
      return callback(null, true);
    }

    // Check explicit origins
    if (explicitOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Always allow localhost and 127.0.0.1 on any port for local development & testing
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Allow all in non-production
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Custom-Header",
    "X-Forwarded-Proto",
    "Cache-Control",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 204,
  maxAge: 86400, // Cache preflight requests for 24 hours
};

// Apply CORS middleware (handles all methods including OPTIONS preflight)
app.use(cors(corsOptions));

// HTTPS & Security headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // HSTS when serving over HTTPS or behind an HTTPS proxy
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  next();
});

app.use(cookieParser());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
