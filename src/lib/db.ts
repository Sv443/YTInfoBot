import { MikroORM } from "@mikro-orm/postgresql";
import { config } from "@src/mikro-orm.config.ts";

/** MikroORM instance */
export let orm: Awaited<ReturnType<typeof MikroORM.init>>;
/** EntityManager instance */
export let em: typeof orm.em;

/** Load MikroORM instances */
export async function initDatabase() {
  orm = await MikroORM.init(config);
  em = orm.em.fork();

  await orm.getSchemaGenerator().updateSchema();
}
