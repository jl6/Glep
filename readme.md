# Bot

A lightweight Discord utility bot designed for running 24/7 on a Raspberry Pi.

---

## Features

- **Custom Prefixes:** Supports server-specific prefixes stored securely in SQLite.
- **Moderation Tools:** Includes channel management and security utilities.
- **Census Integration:** Tracks character data and name changes using external game APIs.

---

## Project Structure

```text
Discord-Bot/
├── database
│   └── data.db
├── notes
│   └── trigger.js
└── src
    ├── core
    │   ├── commands
    │   │   ├── bot
    │   │   │   ├── help.js
    │   │   │   └── ping.js
    │   │   ├── channels
    │   │   │   └── nuke.js
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
    │   │   │   └── tree.js
    │   │   └── setups
    │   │       ├── dmamod.js
    │   │       ├── prefix.js
    │   │       ├── selfbot.js
    │   │       ├── shield.js
    │   │       └── voicehub.js
    │   └── events
    │       ├── client
    │       │   └── ready.js
    │       ├── guild
    │       │   ├── channels
    │       │   │   └── channelDelete.js
    │       │   ├── interactions
    │       │   │   └── interactionCreate.js
    │       │   ├── messages
    │       │   │   ├── DMaModMessageCreate.js
    │       │   │   └── messageCreate.js
    │       │   └── voice
    │       │       └── voiceStateUpdate.js
    │       └── handlers
    │           └── dmHandler.js
    ├── utils
    │   ├── commandHandler.js
    │   ├── dmaMod.js
    │   ├── selfbotHandler.js
    │   ├── shieldHandler.js
    │   ├── trackerHandler.js
    │   └── voiceHubHandler.js
    └── index.js
``` 

## Setup & Installation
Prerequisites
Node.js v18+
Git

## Clone the Repository
git clone [https://github.com/jl6/bot.git](https://github.com/jl6/bot.git)
cd bot

## Install Dependencies
npm install

## Environment Configuration
Create a .env file in the root directory:
<br> 

TOKEN=your_token_here <br> 
PREFIX=! <br> 
CENSUS_SERVICE_ID=your_census_id_here <br> 
WEBHOOK_URL=your_webhook_url_here <br> 
SPECIAL_IDS=comma_separated_user_ids <br> 
DEV_IDS=comma_separated_dev_ids


## Running the Bot

node src/index.js


# Production (PM2):

pm2 start src/index.js --name "bot"