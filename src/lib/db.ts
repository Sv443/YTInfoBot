import { MikroORM, type EntityName, type FilterQuery } from "@mikro-orm/core";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { dbDriver, getConfig, sqlitePath } from "@src/mikro-orm.config.js";

/** MikroORM instance */
export let orm: MikroORM;
/** EntityManager instance */
export let em: typeof orm.em;

/** Load MikroORM instances */
export async function initDatabase() {
  // SQLite creates the file but not the folder it's in:
  dbDriver === "sqlite" && await mkdir(dirname(sqlitePath), { recursive: true });

  orm = await MikroORM.init(await getConfig());
  em = orm.em.fork();

  await orm.getSchemaGenerator().updateSchema();
}

/**
 * Detaches the entity from the shared EntityManager, discarding all of its unflushed changes.  
 * Has to be called when a flush fails, otherwise the rejected changes stay in the unit of work and make every following flush fail too.
 */
export function discardEntity(entity: object | null | undefined) {
  entity && em.getUnitOfWork().unsetIdentity(entity);
}

/**
 * Replaces the entity with the given ID with a freshly created one (with default values), no matter what state the old row or the cached entity is in.  
 * Deletion and insertion happen in a single transaction on a separate EntityManager, so a failure can't lose the entry.
 */
export async function resetEntity<T extends { id: string }>(entityClass: new (id: string) => T, id: string) {
  // evict stale (possibly invalid or dirty) cached instances, so they can't poison later flushes:
  for(const cached of [...em.getUnitOfWork().getIdentityMap().values()])
    if(cached instanceof entityClass && (cached as T).id === id)
      discardEntity(cached);

  await em.fork().transactional(async (tem) => {
    await tem.nativeDelete(entityClass as EntityName<T>, { id } as FilterQuery<T>);
    tem.persist(new entityClass(id));
  });
}
