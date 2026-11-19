import rateLimit from "express-rate-limit";

// Limiteur général : 30 écritures par 15 min par IP.
// Volontairement souple : les opérateurs mobile camerounais partagent
// souvent une même IP publique (CGNAT), un quota trop bas bloque des
// utilisateurs légitimes en même temps.
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Réessaie dans 15 minutes." },
});

// Limiteur strict pour le login admin : brute-force protection.
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessaie dans 15 minutes." },
});
