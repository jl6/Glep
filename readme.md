# Glep#0027

## Community & Contact
[![Discord](https://img.shields.io/badge/Discord-User--ID-18181b?style=flat-square&logo=discord&logoColor=white)](https://discordapp.com/users/289147116767412224)
[![Support Server](https://img.shields.io/badge/Join-Support--Server-18181b?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/aYaVBVca3n)

A simple Discord utility bot designed for running 24/7 on a Raspberry Pi.

---

## Features

- **Custom Prefixes:** Traditional command handling that can be changed to fit your server's needs.
- **Moderation & Shields:** Essential moderation commands (ban, kick, warn, unban) paired with automated security shields for filtering links, spam, and media.
- **Welcome System:** Configurable canvas welcome cards, plain text greetings, leave notices, and direct message alerts managed through interactive setup buttons.
- **DCUO Census Integration:** Track player stats, check name availability, and monitor characters by unique hash IDs to accurately log scammer name changes.
- **Voice Hubs:** Dynamic creation and teardown of temporary voice channels for community management.
- **Tools & Utilities:** Includes AFK tracking, QR code generation, sticky messages, custom commands, and reaction roles.

---

## Project Structure

```text
Glep/
├── .github
│   └── workflows
│       └── deploy.yml
├── database
│   ├── data.db
│   ├── db.js
│   ├── moderation.js
│   └── welcomedb.js
└── src
    ├── core
    │   ├── commands
    │   │   ├── bot
    │   │   │   ├── server
    │   │   │   │   ├── lserver.js
    │   │   │   │   ├── map.js
    │   │   │   │   ├── serverinvite.js
    │   │   │   │   └── servers.js
    │   │   │   ├── help.js
    │   │   │   ├── invite.js
    │   │   │   └── ping.js
    │   │   ├── channels
    │   │   │   ├── clear.js
    │   │   │   ├── clone.js
    │   │   │   ├── createcategory.js
    │   │   │   ├── createchannel.js
    │   │   │   ├── deletechannel.js
    │   │   │   ├── nuke.js
    │   │   │   └── pin.js
    │   │   ├── dcuo
    │   │   │   ├── tarcker
    │   │   │   │   ├── history.js
    │   │   │   │   ├── track.js
    │   │   │   │   ├── tracked.js
    │   │   │   │   ├── trackedrefresh.js
    │   │   │   │   └── untrack.js
    │   │   │   ├── character.js
    │   │   │   ├── name.js
    │   │   │   ├── raw.js
    │   │   │   └── stats.js
    │   │   ├── dev
    │   │   │   ├── db
    │   │   │   │   ├── dbstats.js
    │   │   │   │   └── wipedb.js
    │   │   │   ├── gstats.js
    │   │   │   ├── tree.js
    │   │   │   └── uptime.js
    │   │   ├── moderation
    │   │   │   ├── ban.js
    │   │   │   ├── kick.js
    │   │   │   ├── modhistory.js
    │   │   │   ├── unban.js
    │   │   │   ├── unwarn.js
    │   │   │   └── warn.js
    │   │   ├── roles
    │   │   │   ├── addrole.js
    │   │   │   ├── crole.js
    │   │   │   ├── dallroles.js
    │   │   │   ├── drole.js
    │   │   │   ├── listroles.js
    │   │   │   ├── roleinfo.js
    │   │   │   └── rrole.js
    │   │   ├── setups
    │   │   │   ├── customcmd.js
    │   │   │   ├── dmamod.js
    │   │   │   ├── prefix.js
    │   │   │   ├── selfbot.js
    │   │   │   ├── selfrole.js
    │   │   │   ├── shield.js
    │   │   │   ├── voicehub.js
    │   │   │   └── welcome.js
    │   │   ├── tools
    │   │   │   ├── addemojis.js
    │   │   │   ├── afk.js
    │   │   │   ├── avatar.js
    │   │   │   ├── emojilist.js
    │   │   │   ├── qr.js
    │   │   │   ├── remind.js
    │   │   │   ├── say.js
    │   │   │   ├── serverinfo.js
    │   │   │   └── sticky.js
    │   │   └── user
    │   │       ├── nickname.js
    │   │       ├── userinfo.js
    │   │       └── userlookup.js
    │   └── events
    │       ├── client
    │       │   └── ready.js
    │       ├── guild
    │       │   ├── channels
    │       │   │   └── channelDelete.js
    │       │   ├── interactions
    │       │   │   └── interactionCreate.js
    │       │   ├── members
    │       │   │   ├── guildMemberAdd.js
    │       │   │   └── guildMemberRemove.js
    │       │   ├── messages
    │       │   │   ├── DMaModMessageCreate.js
    │       │   │   └── messageCreate.js
    │       │   └── voice
    │       │       └── voiceStateUpdate.js
    │       └── handlers
    │           └── dmHandler.js
    ├── utils
    │   ├── afkHandler.js
    │   ├── commandHandler.js
    │   ├── costumecHandler.js
    │   ├── dmaMod.js
    │   ├── selfbotHandler.js
    │   ├── selfroleHandler.js
    │   ├── shieldHandler.js
    │   ├── stickyHandler.js
    │   ├── trackerHandler.js
    │   ├── voiceHubHandler.js
    │   └── welcomecardHandler.js
    └── index.js