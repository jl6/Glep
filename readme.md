# Bot

A lightweight Discord utility bot designed for running 24/7 on a Raspberry Pi.

---

## Features

- **Custom Prefixes:** Supports server specific prefixes stored securely in SQLite.
- **Moderation Tools:** Includes channel management and security utilities.
- **Census Integration:** Tracks character data and name changes using external game APIs.

---

## Project Structure

```text
Glep/
├── database
└── src
    ├── core
    │   ├── commands
    │   └── events
    │       ├── client
    │       ├── guild
    │       │   ├── channels
    │       │   ├── interactions
    │       │   ├── messages
    │       │   └── voice
    │       └── handlers
    ├── utils
    └── index.js
``` 

## Setup & Installation
Prerequisites
Node.js v18+
Git

## Clone the Repository
git clone [https://github.com/jl6/Glep.git](https://github.com/jl6/Glep.git)
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

## Community & Contact
[![Discord](https://img.shields.io/badge/Discord-User--ID-18181b?style=flat-square&logo=discord&logoColor=white)](https://discordapp.com/users/289147116767412224)
[![Support Server](https://img.shields.io/badge/Join-Support--Server-18181b?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/48t5FWHw4S)