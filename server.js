require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const client = require("./bot");
const createWSServer = require("./ws");

const app = express();
app.use(cors())
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

// Port
const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Discord backend running on port " + PORT);
});
