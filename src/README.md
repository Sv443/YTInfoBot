## `src/` folder

- [`assets/`](./assets/README.md) - contains all the assets for the bot
- `commands/` - all files for slash commands
  - `commands/_commands.ts` - this is where all slash commands need to be registered
- `events/` - all event files
  - `events/_events.ts` - this is where all events need to be registered
- `contexts/` - all context menu commands
  - `contexts/_contexts.ts` - this is where all context menu commands need to be registered
- `lib/` - utility functions, sectioned into files by their general category
  - `lib/client.ts` - has all discord.js client related information and the client object itself
  - `lib/Command.ts` - has the base classes for slash and context commands
  - `lib/db.ts` - has the [TypeORM EntityManager instance](https://typeorm.io/#/working-with-entity-manager) and the database connection stuff
  - `lib/Event.ts` - base class for events
  - `lib/registry.ts` - where all commands and events are registered and eventually get run from
  - `lib/translate.ts` - custom translation system
- `models/` - contains all the [TypeORM database entity classes](https://typeorm.io/#/entities)
- `tools/` - various CLI tools
  - `tools/prepare-env.ts` - a tool to prepare all environment files for the bot - run via `pnpm prepare-env`
- `main.ts` - the main entry point for the bot, where everything is initialized
- `mikro-orm.config.ts` - the [MikroORM configuration file](https://mikro-orm.io/docs/usage-with-typescript)
- `types.ts` - custom types for the bot and for data returned by APIs