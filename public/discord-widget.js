(async function () {
  const API_URL = "https://discord-bot-veu3.onrender.com";
  const WS_URL = "wss://discord-bot-veu3.onrender.com";

  // DOM
  const container = document.getElementById("discord-chat");
  container.innerHTML = `
    <div id="discord-messages" style="height:300px; overflow-y:auto; border:1px solid #ccc; padding:10px;"></div>
    <input id="discord-input" placeholder="Skriv ett meddelande..." style="width:100%; padding:10px; margin-top:10px;">
  `;

  const messagesEl = document.getElementById("discord-messages");
  const inputEl = document.getElementById("discord-input");

  // Hämta kanaler
  const channels = await fetch(API_URL + "/channels").then(r => r.json());
  const defaultChannel = channels[0].id;

  // WebSocket
  const ws = new WebSocket(WS_URL);

  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.type === "message") {
      const msg = document.createElement("div");
      msg.innerHTML = `<strong>${data.author.name}:</strong> ${data.content}`;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  };

  // Skicka meddelande
  inputEl.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      ws.send(JSON.stringify({
        type: "send",
        channel: defaultChannel,
        content: inputEl.value
      }));
      inputEl.value = "";
    }
  });
})();
