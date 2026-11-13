import rateLimit from "express-rate-limit";

// 10 signalements par 15 min par IP — protection DDoS
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Réessaie dans 15 minutes." },
});
