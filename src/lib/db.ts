import { MikroORM } from "@mikro-orm/postgresql";
import type { EntityName, FilterQuery } from "@mikro-orm/core";
import { config } from "@src/mikro-orm.config.js";

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
