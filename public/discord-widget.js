(async function () {
  const API_URL = "https://discord-bot-vcu3.onrender.com";
  const WS_URL = "wss://discord-bot-vcu3.onrender.com";

  // DOM
  const container = document.getElementById("discord-chat");
  const typingEl = document.getElementById("discord-typing");

  container.innerHTML = `
    <div id="discord-wrapper">
      <div id="discord-sidebar">
        <div id="discord-channel-list"></div>
      </div>
      <div id="discord-chat-area">
        <div id="discord-messages"></div>
        <div id="discord-typing"></div>
        <div id="discord-input-area">
          <input id="discord-input" placeholder="Skriv ett meddelande..." />
        </div>
      </div>
    </div>
  `;

  const messagesEl = document.getElementById("discord-messages");
  const inputEl = document.getElementById("discord-input");
  const channelListEl = document.getElementById("discord-channel-list");

  // Hämta kanaler
  const channels = await fetch(API_URL + "/channels").then(r => r.json());

  let currentChannel = channels[0].id;

  // Bygg kanal-lista i sidebar
  channels.forEach(ch => {
    const el = document.createElement("div");
    el.className = "channel-item";
    el.textContent = "#" + ch.name;
    el.onclick = () => selectChannel(ch.id);
    channelListEl.appendChild(el);
  });

  // Ladda historik vid start
  await loadHistory(currentChannel);

  // WebSocket
  const ws = new WebSocket(WS_URL);

  ws.onmessage = event => {
    const data = JSON.parse(event.data);

    if (data.type === "message") {
      if (data.channel !== currentChannel) return;
      renderMessage(data);
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

  // Funktioner
  async function selectChannel(id) {
    currentChannel = id;
    await loadHistory(id);
  }

  async function loadHistory(channelId) {
    const res = await fetch(`${API_URL}/messages/${channelId}`);
    const history = await res.json();

    messagesEl.innerHTML = "";

    history.forEach(msg => {
      renderMessage(msg);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMessage(data) {
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
  }
})();
