<div style="text-align:center;" align="center">

### 🚧 Work in progress 🚧
This bot is currently in development and not yet ready for public use. Inviting it will not work until this notice is removed. Feel free to create your own instance using the instructions below though.

<br><br><br><br>

# YTInfoBot
[Features](#features) &bull; [Usage](#regular-usage) &bull; [Commands](#slash-commands) &bull; [Privacy](#privacy) &bull; [Opt-out](#opt-out) &bull; [Local development](#local-development)

Free Discord bot that replies to YouTube links with crowdsourced information from Return YouTube Dislike (approximate likes and dislikes), SponsorBlock (timestamps to skip certain segments) and DeArrow (less clickbaity thumbnails and titles).  
  
Since the bot is free to use, I rely on donations to keep it running and maintained.  
[Please consider donating to support development](https://github.com/sponsors/Sv443) - any help is greatly appreciated ❤️  

<br>

<a href="https://discord.com/api/oauth2/authorize?client_id=1290320137223802912&permissions=292058098752&scope=bot%20applications.commands" title="Invite the bot to your server" target="_blank"><img src="https://img.shields.io/badge/Invite%20Bot-%E2%96%BA-78f05d" height="30"></a>

<a href="https://dc.sv443.net/" title="Join the support server" target="_blank"><img src="https://img.shields.io/badge/Join-Support%20Server-6e7bf4" height="20"></a>

<br><br>

<img alt="Example 1; showing the bot's automatic reply" src="./src/assets/example1.png" width="375" /> <img alt="Example 2; showing the bot configuration process" src="./src/assets/example2.png" width="375" />

</div>

<br>

## Features:
- **[Return YouTube Dislike](https://returnyoutubedislike.com/):**  
  Shows the approximate like and dislike count, as well as ratio bar graph with percentage to quickly visualize it.  
  These numbers are crowdsourced and extrapolated. While inaccurate, they're enough to give you a good idea.
- **[SponsorBlock](https://sponsor.ajay.app/):**  
  Shows openable timestamps for segments that can be skipped, such as sponsor segments, intros, non-music parts, etc.  
  These timestamps are crowdsourced and rounded down, so they won't be 100% accurate.
- **[DeArrow](https://dearrow.ajay.app/):**  
  Shows a crowdsourced thumbnail and title for the video.  
  These are usually made to reduce clickbait, but they also might spoil parts of the video.
- **Default:**  
  If all three providers from above have no information on the video, the bot will not reply to the link at all.

<br>

## Regular Usage:
The bot will automatically reply to YouTube links in any channel it has access to.  
If there are multiple links in a single message, it will reply to up to 5 links (<!--TODO:-->configurable).  
These automatic replies contain slightly reduced information by default to reduce spam.  
  
Additionally, there are right-click context menu options to get more detailed information about a video.  
To access these, right-click (or hold on mobile) on a message and select one of the commands under "Apps".  

<br>

## Slash Commands:
- **Video Info:**
  - `/video_info video:<URL or ID> [type:<reduced|everything|votes_only|dearrow_only|timestamps_only>]`  
    Shows detailed information about a video via the URL (youtube.com / youtu.be / music.youtube.com), or just the video ID.  
    If no type is provided, the bot will default to what's set in the server configuration (`everything` by default).
- **User settings:**
  - `/settings list`  
    Shows a list of all available user settings and their current values.
  - `/settings set <name> new_value:<value>`  
    Changes the setting with the given name (see autocomplete) to the given value.
  - `/settings reset`  
    Resets the settings to the default values.  
    Shows a confirmation before actually resetting.
- **Server configuration:**
  - 🔒 `/config list`  
    Shows a list of all available server configuration settings and their current values.  
    Requires the `Manage Server` permission to use.
  - 🔒 `/config set <name> new_value:<value>`  
    Changes the setting with the given name (see autocomplete) to the given value.  
    Requires the `Manage Server` permission to use.
  - 🔒 `/config reset`  
    Resets the configuration to the default values.  
    Shows a confirmation before actually resetting.  
    Requires the `Manage Server` permission to use.
- **Help:**
  - `/help info`  
    Shows some information about the bot.
  - `/help commands [show_hidden:<true|false>]`  
    Shows a list of commands and their descriptions.  
    `show_hidden` is `true` by default, so hidden commands that require elevated permissions will also be shown.  
    Unless you don't have access to any hidden commands, this also makes the reply only visible to you.
- **Invite:**
  - `/invite`  
    Shows a link that you can use to invite YTInfoBot to your own server.
- **Privacy:**
  - `/privacy info`  
    Shows information about the data the bot stores and why it is stored in the first place.
  - `/privacy delete_data`  
    Deletes all data stored about your user.  
    Shows a confirmation before actually deleting the data.  
    If you want to delete your server's data, simply kick the bot from the server.

> [!NOTE]  
> Commands prefixed with 🔒 require special permissions, while others can be used by any member.  
> They are also generally ephemeral (only visible to the user who executed them).  
>   
> Arguments surrounded by `[]` are optional.  
> Whatever is surrounded by `<>` is a placeholder and should be replaced with an actual value.  
> If there is a list of options, they are separated by `|` and only one of them can be specified.

<br>

## Context Menu Commands:
These commands are available when right-clicking (on PC) or tapping and holding (on mobile) on a <!--✉️ -->message<!-- or 👤 member-->.
- `Delete Reply`  
  You can use this command on all automatic replies that the bot sent to your messages to delete them.  
  Members with the `Manage Messages` permission can also delete replies from other members this way.
- `Video Info (default)`  
  Shows information about all video links in the message this command is used on, using the guild's defaults.
- `Video Info (extended)`  
  Shows detailed information about all video links in the message this command is used on, regardless of the guild's defaults.

<br>

## Privacy:
The bot stores rudimentary information about the servers it is in and the users that use it, related to configuration settings and nothing else.  
The only uniquely identifiable information stored are the user ID and server ID (which are publicly obtainable by every member anyway).  
  
At no point will user account info or message content be persistently stored or shared with third parties.  
  
To get rid of all data stored about your server, just kick the bot and it will automatically delete all data related to your server.  
To delete your personal cross-server data, use the command `/privacy delete_data` - note that the data will be recreated if you manually use the bot again. Automatic replies do not store any data about the user.

<br>

## Opt-out:
If you want to opt out of automatic replies across every server but still use the commands manually, you can use the command `/settings set auto_reply new_value:false`  
Alternatively, if you don't want anything to do with the bot on any server, you can simply block it and refrain from using manual commands.

<br>

## Local Development:
1. Have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/installation) installed.
2. Have a [PostgreSQL database](https://www.postgresql.org/) and a user set up (you may [follow this guide](https://medium.com/coding-blocks/creating-user-database-and-adding-access-on-postgresql-8bfcd2f4a91e) on Linux or [WSL](https://learn.microsoft.com/en-us/windows/wsl/install)).
3. Clone the repository or download the ZIP file and extract it.
4. Open a terminal in the folder containing `package.json` and run `pnpm i` to install all dependencies.
5. Run `pnpm prepare-env` to create all environment files.  
  Edit all files that are listed in the console to fill in the required values.
6. Run `pnpm start` to start the bot or `pnpm dev` to start it in development mode.  
  You may also use the VS Code debugger to start and debug the bot using breakpoints.
  
Refer to `scripts` in `package.json` for a list of all commands.  
  
Use `pnpm start -R` to manually reregister commands for all guilds the bot is in.

<br>

<div style="text-align:center;" align="center">

©️ Copyright 2024 Sv443 - [AGPL-3.0-or-later license](./LICENSE.txt)  
Made with ❤️ - please consider [donating](https://github.com/sponsors/Sv443) to support development
</div>
