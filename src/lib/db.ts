import { PrismaClient as OnlinePrismaClient, Prisma } from "../../node_modules/.prisma/online-client";
import { PrismaClient as OfflinePrismaClient } from "../../node_modules/.prisma/offline-client";
import { getAppMode } from "./appMode";

export { Prisma };

const globalForPrisma = globalThis as unknown as {
  onlinePrisma?: OnlinePrismaClient;
  offlinePrisma?: OfflinePrismaClient;
};

function getOnlineClient(): OnlinePrismaClient {
  const client = globalForPrisma.onlinePrisma ?? new OnlinePrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.onlinePrisma = client;
  return client;
}

function getOfflineClient(): OnlinePrismaClient {
  const client = globalForPrisma.offlinePrisma ?? new OfflinePrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.offlinePrisma = client;
  // The offline (SQLite) and online (Postgres) schemas are kept field-for-field
  // aligned specifically so this cast is safe — see prisma/offline/schema.prisma.
  return client as unknown as OnlinePrismaClient;
}

export const prisma: OnlinePrismaClient =
  getAppMode() === "offline" ? getOfflineClient() : getOnlineClient();
