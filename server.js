app.use(express.static("public"));
require("dotenv").config();
const express = require("express");
const http = require("http");
const client = require("./bot");
const createWSServer = require("./ws");

const app = express();
const server = http.createServer(app);

app.get("/channels", (req, res) => {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const channels = guild.channels.cache
    .filter(c => c.type === 0)
    .map(c => ({ id: c.id, name: c.name }));

  res.json(channels);
});

createWSServer(server, client);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log("Discord backend running on port " + PORT);
});
