const WebSocket = require("ws");

function createWSServer(server, client) {
  const wss = new WebSocket.Server({
    server,
    verifyClient: (info, done) => {
      done(true);
    }
  });

  wss.broadcast = function (data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(json);
    });
  };

  // Typing event → skickas till frontend
  client.on("typingStart", typing => {
    wss.broadcast({
      type: "typing",
      channel: typing.channel.id,
      user: typing.user.username
    });
  });

  // Nya meddelanden → skickas till frontend
  client.on("messageCreate", msg => {
    wss.broadcast({
      type: "message",
      channel: msg.channel.id,
      id: msg.id,
      author: {
        id: msg.author.id,
        name: msg.author.username,
        avatar: msg.author.displayAvatarURL()
      },
      content: msg.content,
      timestamp: msg.createdTimestamp
    });
  });

  // Reactions från Discord → skickas till frontend
  client.on("messageReactionAdd", (reaction, user) => {
    wss.broadcast({
      type: "reaction",
      channel: reaction.message.channel.id,
      messageId: reaction.message.id,
      emoji: reaction.emoji.name,
      count: reaction.count,
      user: user.username
    });
  });

  // WebSocket från frontend
  wss.on("connection", ws => {

      ws.on("message", async raw => {

          try{

              const data = JSON.parse(raw);
              console.log("[WS IN]", data);

              // Skicka meddelande från widget → Discord
              if(data.type === "send"){

                  const channel =
                      client.channels.cache.get(data.channel);

                  if(!channel)
                      return;

                  await channel.send(data.content);

              }

              // Reaction från widget → Discord
              if(data.type === "reaction"){

                const channel = client.channels.cache.get(data.channel);

                  if(!channel)
                    return;
                console.time("reaction");

                const message = await channel.messages.fetch(data.messageId);

                console.timeLog("reaction", "message fetched");

                await message.react(data.emoji);

                console.timeEnd("reaction");

              }

          }
          catch(error){

              console.error("[WebSocket]", error);

          }

      });

  });

  return wss;
}

module.exports = createWSServer;
