require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent
  ],

  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]

client.login(process.env.BOT_TOKEN);
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

module.exports = client;
