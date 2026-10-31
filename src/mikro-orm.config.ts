import { defineConfig, type Options } from "@mikro-orm/core";
import { envVarEq, getEnvVar } from "@lib/env.js";

/** All database drivers that can be selected through the `DB_DRIVER` env var */
export const dbDrivers = ["postgresql", "sqlite"] as const;
export type DbDriver = (typeof dbDrivers)[number];

/** Driver that is used if `DB_DRIVER` is unset */
const defaultDbDriver: DbDriver = "postgresql";

/** Default location of the SQLite database file, relative to the working directory */
export const defaultSqlitePath = "ytinfobot.sqlite";

/** Resolves the `DB_DRIVER` env var into one of the supported drivers */
function resolveDriver(): DbDriver {
  const val = getEnvVar("DB_DRIVER")?.toLowerCase();

  switch(val) {
  case undefined:
    return defaultDbDriver;
  case "postgres":
  case "postgresql":
    return "postgresql";
  case "sqlite":
  case "sqlite3":
  case "libsql":
    return "sqlite";
  default:
    throw new Error(`Unknown DB_DRIVER "${val}" - must be one of: ${dbDrivers.join(", ")}`);
  }
}

/** The database driver that is currently configured through the env vars */
export const dbDriver = resolveDriver();

/** Names of the env vars that have to be set for the currently selected driver */
export const requiredDbEnvVars: readonly string[] = dbDriver === "postgresql" ? ["DB_URL"] : [];

/** Path to the SQLite database file (only used if the SQLite driver is selected) */
export const sqlitePath = getEnvVar("DB_PATH") ?? defaultSqlitePath;

/**
 * Builds the MikroORM config for the driver that was selected with `DB_DRIVER`.  
 * Drivers are imported lazily so that only the selected one is ever loaded.
 */
export async function getConfig(): Promise<Options> {
  const common = {
    entities: ["dist/**/*.model.js"],
    entitiesTs: ["src/**/*.model.ts"],
    debug: envVarEq("DB_DEBUG", true),
  } satisfies Options;

  switch(dbDriver) {
  case "sqlite": {
    const { LibSqlDriver } = await import("@mikro-orm/libsql");
    return defineConfig({
      ...common,
      driver: LibSqlDriver,
      dbName: sqlitePath,
    });
  }
  case "postgresql": {
    const { PostgreSqlDriver } = await import("@mikro-orm/postgresql");
    return defineConfig({
      ...common,
      driver: PostgreSqlDriver,
      clientUrl: getEnvVar("DB_URL"),
      charset: "utf8",
    });
  }
  }
}
