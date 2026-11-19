// Setup initial : env + client Prisma + schéma DB + seed
// Usage : npm run setup
import { existsSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd, cwd = root) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
};

// 1. Fichiers .env
const envFiles = [
  [".env.example", "apps/api/.env"],
  [".env.example", "apps/web/.env.local"],
];
for (const [src, dest] of envFiles) {
  const srcPath = resolve(root, src);
  const destPath = resolve(root, dest);
  if (existsSync(destPath)) {
    console.log(`= ${dest} existe déjà, conservé`);
  } else {
    copyFileSync(srcPath, destPath);
    console.log(`+ ${dest} créé depuis ${src}`);
  }
}

// 2. Client Prisma + schéma + seed
run("npm run db:generate -w @powerwatch/api");
run("npm run db:push -w @powerwatch/api");
run("npm run db:seed -w @powerwatch/api");

console.log(`
Setup terminé. Pour lancer l'application :

  npm run dev

Puis ouvre http://localhost:3000
`);
