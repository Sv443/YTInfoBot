<div style="text-align:center;" align="center">

### 🚧 Work in progress 🚧
This bot is currently in development and not yet ready for public use. Inviting it will not work until this notice is removed. Feel free to create your own instance using the instructions below though.

<br><br><br><br>

# YTInfoBot
[Features](#features) &bull; [Usage](#regular-usage) &bull; [Commands](#slash-commands) &bull; [Privacy](#privacy) &bull; [Local development](#local-development)

Free Discord bot that replies to YouTube links with information from Return YouTube Dislike (approximate likes and dislikes), SponsorBlock (timestamps to skip certain segments) and DeArrow (crowdsourced thumbnails and titles).  
  
Since the bot is free to use, I rely on donations to keep the bot running and maintained.  
Please consider [donating](https://github.com/sponsors/Sv443) to support development. Any help is greatly appreciated ❤️  
  
<a href="https://discord.com/api/oauth2/authorize?client_id=1290320137223802912&permissions=292058098752&scope=bot%20applications.commands" target="_blank"><img src="https://img.shields.io/badge/Invite%20Bot-%E2%96%BA-78f05d" height="30"></a>

<a href="https://dc.sv443.net/" target="_blank"><img src="https://img.shields.io/badge/Join-Support%20Server-6e7bf4" height="20"></a>
</div>

<br>

## Features:
- [**Return YouTube Dislike:**](https://returnyoutubedislike.com/)  
  Shows the approximate like and dislike count, as well as ratio between them.  
  These numbers are crowdsourced and extrapolated, so they might not be 100% accurate.
- [**SponsorBlock:**](https://sponsor.ajay.app/)  
  Shows timestamps for segments that can be skipped, such as sponsor segments, intros, non-music parts, etc.  
  These timestamps are crowdsourced and might not be 100% accurate.
- [**DeArrow:**](https://dearrow.com/)  
  Shows a crowdsourced thumbnail and title for the video.  
  These are usually made to reduce clickbait, but they also might spoil parts of the video.
- **Fallback:**  
  If no information is present in the DeArrow database, the bot will fall back to the original video's title and thumbnail.  
  If all three providers from above have no information on the video, the bot will not reply to the link at all.

<br>

## Regular Usage:
The bot will automatically reply to YouTube links in any channel it has access to.  
If there are multiple links in a single message, it will reply to up to 5 links (<!--TODO:-->configurable).  
These automatic replies contain slightly reduced information by default to reduce spam.  
  
<!--TODO:-->Additionally, there are right-click context menu options to get more detailed information about a video.  
To access these, right-click (or hold on mobile) on a message and select the command under "Apps".  
  
If you want to opt out of automatic replies across every server, you can use the command `/settings set auto_reply new_value:false`

<br>

## Slash Commands:
- **Video Info:**
  - `/video_info video:<URL or ID> [type:<reduced|all|votes_only|dearrow_only|timestamps_only>]`  
    Shows detailed information about a video, given its URL (supports youtube.com, music.youtube.com and youtu.be), or just the video ID.  
    If no type is provided, the bot will default to what the server configuration specifies (`reduced` by default).
- **User settings:**
  - `/settings list`  
    Shows a list of all available user settings and their current values.
  - `/settings set <name> new_value:<value>`  
    If no new_value argument is provided, the value of the current setting will be shown.  
    Otherwise, that setting is changed to the given value.
  - `/settings reset`  
    Resets the settings to the default values.  
    (Shows a confirmation before actually resetting.)
  - `/settings delete_data`  
    Deletes all data stored about your user.  
    (Shows a confirmation before actually deleting.)
- **Server configuration:**
  - 🔒 `/config list`  
    Shows a list of all available server configuration settings and their current values.  
    Requires the `Manage Server` permission to use.
  - 🔒 `/config set <name> new_value:<value>`  
    If no new_value argument is provided, the value of the current setting will be shown.  
    Otherwise, that setting is changed to the given value.  
    Requires the `Manage Server` permission to use.
  - 🔒 `/config reset`  
    Resets the configuration to the default values.  
    (Shows a confirmation before actually resetting.)  
    Requires the `Manage Server` permission to use.

> [!NOTE]  
> Commands prefixed with 🔒 require special permissions, while others can be used by any member.  
> They are also generally ephemeral (only visible to the user who executed them).  
>   
> Arguments surrounded by `[]` are optional.  
> Whatever is surrounded by `<>` is a placeholder and should be replaced with an actual value.  
> If there is a list of options, they are separated by `|` and only one of them can be specified.

<br>

## Privacy:
The bot stores rudimentary information about the servers it is in and the users that use it, related to configuration settings.  
The only uniquely identifiable information stored are the user ID and server ID (which are publicly obtainable by every member anyway).  
  
At no point will user account info or message content be persistently stored or shared with third parties.  
  
To get rid of all data stored about your server, just kick the bot.  
To delete your personal cross-server data, use the command `/settings delete_data` - note that it will be recreated if you manually use the bot again. After deleting, automatic replies will use the default settings.

<br>

## Local Development:
1. Have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/installation) installed.
2. Have a [PostgreSQL database](https://www.postgresql.org/) and a user set up (you may [follow this guide](https://medium.com/coding-blocks/creating-user-database-and-adding-access-on-postgresql-8bfcd2f4a91e) on Linux or [WSL](https://learn.microsoft.com/en-us/windows/wsl/install)).
3. Clone the repository or download the ZIP file and extract it.
4. Open a terminal in the folder containing `package.json` and run `pnpm i` to install all dependencies.
5. Copy the file `.env.template` to `.env` and fill in the required values, like bot token and database credentials.
6. Run `pnpm start` to start the bot or `pnpm dev` to start it in development mode.  
  You may also use the VS Code debugger to start and debug the bot using breakpoints.
  
Refer to `scripts` in `package.json` for a list of all commands.

<br>

<div style="text-align:center;" align="center">

©️ Copyright 2024 Sv443 - [AGPL-3.0-or-later license](./LICENSE.txt)  
Made with ❤️ - please consider [donating](https://github.com/sponsors/Sv443) to support development
</div>
