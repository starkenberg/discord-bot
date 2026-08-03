(async function () {
  const API_URL = "https://discord-bot-vcu3.onrender.com";
  const WS_URL = "wss://discord-bot-vcu3.onrender.com";

  // DOM
  const container = document.getElementById("discord-chat");
  container.innerHTML = `
    <style>
      #discord-wrapper {
        background:#2f3136;
        color:#dcddde;
        padding:15px;
        border-radius:8px;
        font-family: Arial, sans-serif;
        max-width:100%;
      }
      #discord-messages {
        height:300px;
        overflow-y:auto;
        border:1px solid #202225;
        padding:10px;
        background:#36393f;
        border-radius:6px;
      }
      #discord-input {
        width:100%;
        padding:10px;
        margin-top:10px;
        border-radius:6px;
        border:none;
        background:#40444b;
        color:white;
      }
      #discord-channel-select {
        width:100%;
        padding:8px;
        margin-bottom:10px;
        border-radius:6px;
        background:#40444b;
        color:white;
        border:none;
      }
      .discord-message {
        display:flex;
        gap:10px;
        margin-bottom:10px;
      }
      .discord-avatar {
        width:32px;
        height:32px;
        border-radius:50%;
      }
      .discord-content {
        display:flex;
        flex-direction:column;
      }
      .discord-author {
        font-weight:bold;
        margin-bottom:2px;
      }
    </style>

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
