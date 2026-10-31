# 1.0.1
**Fixes:**
- Fixed uncapped `/config` and `/settings` value field that allowed configurations to be broken beyond repair.
- "Links per reply limit" is now actually applied.

<br>

# 1.0.0
Initial release:
- Automatic responses to messages containing YouTube URLs, showing their [ReturnYoutubeDislike](https://returnyoutubedislike.com/), [SponsorBlock](https://sponsor.ajay.app/) and [DeArrow](https://dearrow.ajay.app/) data, and normalizing the URL parameters.  
  ⚠️ This requires the necessary intents to read message contents. For a full list of intents, refer to the file `src/lib/client.ts`.
- 6 slash commands:
  - `/video_info` to show information about the given URL
  - `/config` to view and edit the server configuration
  - `/settings` to edit your personal user settings (like the global auto-reply opt-out flag)
  - `/privacy` for privacy-related information and to delete data
  - `/invite` to get a URL for inviting the bot to another server you have admin rights in
  - `/help` for information about commands and the bot
- 3 context menu commands:
  - `Delete Reply`, which can be used on the bot's messages to delete them (only usable by the mentioned user or someone with "Manage Messages" permissions)
  - `Video Info (default)` triggers the same reply as when sending messages that contain YouTube links. This option uses the server's default configuration.
  - `Video Info (extended)` triggers the same reply as when sending messages that contain YouTube links. This option shows all available information about the given video URLs, regardless of the server's configuration.
