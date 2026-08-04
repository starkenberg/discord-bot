require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const client = require("./bot");
const createWSServer = require("./ws");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:8888", "http://localhost", "*"]
}));

const server = http.createServer(app);

// Static files (widget)
app.use(express.static("public"));

// Channels endpoint
app.get("/channels", async (req, res) => {
  await client.guilds.fetch(process.env.GUILD_ID);
  const guild = client.guilds.cache.get(process.env.GUILD_ID);

  const channels = guild.channels.cache
    .filter(c => c.type === 0)
    .map(c => ({ id: c.id, name: c.name }));

  res.json(channels);
});

app.get("/messages/:channelId", async (req, res) => {
  const channel = await client.channels.fetch(req.params.channelId);
  const messages = await channel.messages.fetch({ limit: 50 });

  const formatted = messages.map(m => ({
    id: m.id,
    author: {
      id: m.author.id,
      name: m.author.username,
      avatar: m.author.displayAvatarURL()
    },
    content: m.content,
    timestamp: m.createdTimestamp
  }));

  res.json(formatted.reverse());
});


client.once("ready", () => {
  console.log("Discord bot is ready, starting WebSocket server...");
  createWSServer(server, client);
});

// Port
const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Discord backend running on port " + PORT);
});
