# `src/assets/` folder

- `emojis/` - contains all the emoji files
- `logo/` - contains all the logo files
- `translations/` - contains all the translation files
  - `<locale>.json` - contains all the translations for a specific locale
- `emojis.json` - needs to be filled in with the emoji IDs uploaded to the client via the [developer portal](https://discord.com/developers/applications)
- `emojis.template.json` - template for `emojis.json` when using the `pnpm prepare-env` command
- `locales.json` - contains all [locale values supported by Discord](https://discord.com/developers/docs/reference#locales) and info about them
