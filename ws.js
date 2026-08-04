const WebSocket = require("ws");

function createWSServer(server, client) {
  const wss = new WebSocket.Server({
    server,
    verifyClient: (info, done) => {
      // Tillåt ALLA origins, även http://localhost
      done(true);
    }
  });

  wss.broadcast = function (data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    });
  };

  client.on("typingStart", typing => {
    wss.broadcast({
      type: "typing",
      channel: typing.channel.id,
      user: typing.user.username
    });
  });


  client.on("messageCreate", msg => {
    console.log("MESSAGE EVENT:", msg.content);
    wss.broadcast({
      type: "message",
      channel: msg.channel.id,
      author: {
        id: msg.author.id,
        name: msg.author.username,
        avatar: msg.author.displayAvatarURL()
      },
      content: msg.content,
      timestamp: msg.createdTimestamp
    });
  });

  wss.on("connection", ws => {
    ws.on("message", async raw => {
      const data = JSON.parse(raw);

      if (data.type === "typing") {
        if (data.channel !== currentChannel) return;

        typingEl.textContent = `${data.user} skriver...`;

        clearTimeout(window._typingTimeout);
        window._typingTimeout = setTimeout(() => {
          typingEl.textContent = "";
        }, 2000);
      }

      if (data.type === "send") {
        const channel = client.channels.cache.get(data.channel);
        await channel.send(data.content);
      }
    });
  });

  return wss;
}

module.exports = createWSServer;
