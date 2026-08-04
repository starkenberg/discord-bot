(async function () {
  const API_URL = "https://discord-bot-vcu3.onrender.com";
  const WS_URL = "wss://discord-bot-vcu3.onrender.com";

  // DOM
  const container = document.getElementById("discord-chat");
  container.innerHTML = `
    <div id="discord-wrapper">
      <select id="discord-channel-select"></select>
      <div id="discord-messages"></div>
      <input id="discord-input" placeholder="Skriv ett meddelande..." />
    </div>
  `;

  const messagesEl = document.getElementById("discord-messages");
  const inputEl = document.getElementById("discord-input");
  const channelSelect = document.getElementById("discord-channel-select");

  // Hämta kanaler
  const channels = await fetch(API_URL + "/channels").then(r => r.json());

  channels.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch.id;
    opt.textContent = ch.name;
    channelSelect.appendChild(opt);
  });

  let currentChannel = channels[0].id;

  channelSelect.addEventListener("change", () => {
    currentChannel = channelSelect.value;
    messagesEl.innerHTML = "";
  });

  // WebSocket
  const ws = new WebSocket(WS_URL);

  ws.onmessage = event => {
    const data = JSON.parse(event.data);

    if (data.type === "message") {
      // ⭐ Visa bara meddelanden för aktiv kanal
      if (data.channel !== currentChannel) return;

      const msg = document.createElement("div");
      msg.className = "discord-message";

      msg.innerHTML = `
        <img class="discord-avatar" src="${data.author.avatar}" />
        <div class="discord-content">
          <div class="discord-author">${data.author.name}</div>
          <div>${data.content}</div>
        </div>
      `;

      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  };

  // Skicka meddelande
  inputEl.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      ws.send(JSON.stringify({
        type: "send",
        channel: currentChannel,
        content: inputEl.value
      }));
      inputEl.value = "";
    }
  });
})();
