<div style="text-align:center;" align="center">

# YTInfoBot
Free Discord bot that replies to YouTube links with information from Return YouTube Dislike (approximate likes and dislikes), SponsorBlock (timestamps to skip certain segments) and DeArrow (crowdsourced thumbnails and titles).  
  
If you enjoy using this bot, please consider [donating](https://github.com/sponsors/Sv443) to support development ❤️
  
<a href="https://discord.com/api/oauth2/authorize?client_id=1290320137223802912&permissions=292058098752&scope=bot%20applications.commands" target="_blank"><img src="https://img.shields.io/badge/Invite%20Bot-%E2%96%BA-78f05d" height="30"></a>

<a href="https://dc.sv443.net/" target="_blank"><img src="https://img.shields.io/badge/Join-Support%20Server-6e7bf4" height="20"></a>
</div>

<br>

## Features:
- **General video info:**  
  Shows a larger part of the video description than Discord does by default and makes links clickable.  
  Also shows the upload date and view count (configurable).
- [**Return YouTube Dislike:**](https://returnyoutubedislike.com/)  
  Shows the approximate like and dislike count, as well as ratio between them.  
  These numbers are crowdsourced and extrapolated, so they might not be 100% accurate.
- [**SponsorBlock:**](https://sponsor.ajay.app/)  
  Shows timestamps for segments that can be skipped, such as sponsor segments, intros, non-music parts, etc.  
  These timestamps are crowdsourced and might not be 100% accurate.
- [**DeArrow:**](https://dearrow.com/)  
  Shows a crowdsourced thumbnail and title for the video.  
  These are usually made to reduce clickbait, but they also might spoil parts of the video.

<br>

## Regular Usage:
The bot will automatically reply to YouTube links in any channel it has access to.  
If there are multiple links in a single message, it will reply to up to 5 links.  
These automatic replies contain slightly reduced information to reduce spam.  
  
Additionally, there are right-click context menu options to get more detailed information about a video.  
To access these, right-click (or hold on mobile) on a message and select the command under "Apps".

<br>

## Slash Commands:
- `/video_info video:<URL or ID> [type:<reduced|all|votes_only|dearrow_only|timestamps_only>]`  
  Shows detailed information about a video, given its URL (supports youtube.com, music.youtube.com, youtu.be or just the video ID).  
  If no type is provided, the bot will default to `reduced`.
- 🔒 `/configure setting <name> [new_value:<value>]`  
  If no new_value argument is provided, the value of the current setting will be shown.  
  Otherwise, the value of that setting is changed for the current server.  
  Requires the `Manage Server` permission to use.
- 🔒 `/configure reset`  
  Resets the configuration for the current server to the default values.  
  Shows a confirmation before actually resetting.  
  Requires the `Manage Server` permission to use.

> [!NOTE]  
> Commands prefixed with 🔒 require special permissions, while others can be used by any member.  
> Arguments surrounded by `[]` are optional.  
> Whatever is surrounded by `<>` is a placeholder and should be replaced with an actual value.  
> If there is a list of options, they are separated by `|` and only one of them can be specified.

<br>

## Local Installation:
1. Have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/installation) installed.
2. Clone the repository or download the ZIP file and extract it.
3. Open a terminal in the folder containing `package.json` and run `pnpm i` to install all dependencies.
4. Copy the file `.env.template` to `.env` and fill in the required values.
5. Run `pnpm start` to start the bot or `pnpm dev` to start it in development mode.  
  You may also use the VS Code debugger to start and debug the bot using breakpoints.
  
Refer to `scripts` in `package.json` for a list of all commands.

<br>

<div style="text-align:center;" align="center">

©️ Copyright 2024 Sv443 - [AGPL-3.0-or-later license](./LICENSE.txt)  
Made with ❤️ - please consider [donating](https://github.com/sponsors/Sv443) to support development
</div>
