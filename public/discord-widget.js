(async function () {
  const API_URL = "https://discord-bot-vcu3.onrender.com";
  const WS_URL = "wss://discord-bot-vcu3.onrender.com";

  // DOM - Elements
  const container = document.getElementById("discord-chat");
  const requestedCategory = container.dataset.category || null;
  const requestedChannel = container.dataset.channel || null;
  const typingEl = document.getElementById("discord-typing");

  const EMOJI_SETS = {
    smileys: ["😀","😁","😂","🤣","😊","😎","😍","😘","😡","😭","😱","🤔"],
    animals: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁"],
    food: ["🍏","🍎","🍔","🍟","🍕","🌭","🍿","🍣","🍪","🍩"],
    activities: ["⚽","🏀","🏈","⚾","🎾","🏐","🎱","🏓","🏸"],
    objects: ["💡","📱","💻","🖥️","⌨️","🖱️","💾","📷"],
    symbols: ["❤️","💔","💯","🔥","✨","⭐","⚡","💥"],
    flags: ["🇸🇪","🇺🇸","🇬🇧","🇩🇰","🇫🇮","🇳🇴","🇩🇪","🇫🇷"]
  };

  container.innerHTML = `
    <div id="discord-wrapper">

      <aside id="discord-sidebar">
        <div id="discord-server-header"></div>

        <div id="discord-channel-list"></div>
      </aside>

      <main id="discord-chat-area">

        <header id="discord-chat-header">
          <div id="discord-channel-title"></div>
          <div id="discord-channel-topic"></div>
        </header>

        <section id="discord-messages"></section>

        <div id="discord-typing"></div>

        <footer id="discord-input-area">
          <input
            id="discord-input"
            placeholder="Skriv ett meddelande..."
          />
        </footer>

      </main>

    </div>
  `;

  const messagesEl = document.getElementById("discord-messages");
  const inputEl = document.getElementById("discord-input");
  const channelListEl = document.getElementById("discord-channel-list");
  const channelTitleEl = document.getElementById("discord-channel-title");
  const channelTopicEl = document.getElementById("discord-channel-topic");

  // Hämta kanaler
  const channels = await fetch(API_URL + "/channels").then(r => r.json());

  // Filtrera på kategori om angiven
  let visibleChannels = channels;

  if (requestedCategory) {
    visibleChannels = channels.filter(
      c => c.parentName === requestedCategory
    );
  }

  // Bestäm vilken kanal som ska öppnas
  let currentChannel = null;

  // 1. Om en specifik kanal önskas
  if (requestedChannel) {
    const found = channels.find(c =>
      c.name.toLowerCase() === requestedChannel.toLowerCase()
    );

    if (found) {
      currentChannel = found.id;
    }
  }

  // 2. Annars första kanal i vald kategori
  if (!currentChannel && visibleChannels.length) {
    currentChannel = visibleChannels[0].id;
  }

  // 3. Sista fallback
  if (!currentChannel && channels.length) {
    currentChannel = channels[0].id;
  }

  // Bygg kanal-lista i sidebar
  visibleChannels.forEach(ch => {

    const el = document.createElement("div");

    el.className = "channel-item";

    if (ch.id === currentChannel) {
        el.classList.add("active");
    }

    el.textContent = "#" + ch.name;

    el.onclick = () => {

        document
          .querySelectorAll(".channel-item")
          .forEach(x => x.classList.remove("active"));

        el.classList.add("active");

        selectChannel(ch.id);
    };

    channelListEl.appendChild(el);

  });

  updateHeader(currentChannel);

  // Ladda historik vid start
  await loadHistory(currentChannel);

  // WebSocket
  const ws = new WebSocket(WS_URL);

  ws.onmessage = event => {
    const data = JSON.parse(event.data);

    // Nya meddelanden
    if (data.type === "message") {
      if (data.channel !== currentChannel) return;
      renderMessage(data);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Typing-indikator
    if (data.type === "typing") {
      if (data.channel !== currentChannel) return;

      typingEl.textContent = `${data.user} skriver…`;

      clearTimeout(window._typingTimeout);
      window._typingTimeout = setTimeout(() => {
        typingEl.textContent = "";
      }, 2000);
    }

    // Reactions från Discord
    if (data.type === "reaction") {
      if (data.channel !== currentChannel) return;

      const msgEl = document.querySelector(`[data-id="${data.messageId}"]`);
      if (!msgEl) return;

      const reactionsEl = msgEl.querySelector(".discord-reactions");
      if (!reactionsEl) return;

      let reaction = reactionsEl.querySelector(
        `[data-emoji="${data.emoji}"]`
      );

      if (!reaction) {
        reaction = document.createElement("span");
        reaction.dataset.emoji = data.emoji;
        reactionsEl.appendChild(reaction);
      }

      reaction.textContent = `${data.emoji} ${data.count}`;
    }

  }; // End of ws-onmessage

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
  function updateHeader(channelId) {
    const ch = channels.find(c => c.id === channelId);

      if (!ch) return;

      channelTitleEl.textContent = "# " + ch.name;
      channelTopicEl.textContent = ch.parentName || "";

    }

  async function selectChannel(id) {
    currentChannel = id;

    updateHeader(id);

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
    msg.dataset.id = data.id;

    msg.innerHTML = `
      <img class="discord-avatar" src="${data.author.avatar}" />
      <div class="discord-content">
        <div class="discord-author">${data.author.name}</div>
        <div>${data.content}</div>

        <div class="discord-reaction-bar">
          <div class="discord-reactions"></div>
          <div class="reaction-add">+</div>

          <div class="emoji-picker">
            <input class="emoji-search" placeholder="Sök emojis..." />

            <div class="emoji-categories">
              <button data-cat="smileys">😀</button>
              <button data-cat="animals">🐶</button>
              <button data-cat="food">🍔</button>
              <button data-cat="activities">⚽</button>
              <button data-cat="objects">💡</button>
              <button data-cat="symbols">❤️</button>
              <button data-cat="flags">🏳️</button>
              <button data-cat="custom">✨</button>
            </div>

            <div class="emoji-grid"></div>
          </div>
        </div>
      </div>
    `;

    messagesEl.appendChild(msg);

    if (data.reactions) {
      const reactionsEl = msg.querySelector(".discord-reactions");

      data.reactions.forEach(r => {
        const span = document.createElement("span");
        span.className = "discord-reaction";
        span.dataset.emoji = r.emoji;
        span.textContent = `${r.emoji} ${r.count}`;

        reactionsEl.appendChild(span);
      });
    }

    // --- Reaction logic ---
    const addBtn = msg.querySelector(".reaction-add");
    const picker = msg.querySelector(".emoji-picker");
    const emojiGrid = msg.querySelector(".emoji-grid");
    const emojiSearch = msg.querySelector(".emoji-search");

    // Ladda standardkategori vid öppning
    loadEmojiCategory("smileys");

    // Öppna emoji-picker
    addBtn.onclick = () => {
      picker.style.display = "block";
    };

    // Stäng när man klickar utanför
    document.addEventListener("click", e => {
      if (!msg.contains(e.target)) {
        picker.style.display = "none";
      }
    });

    // Kategoriknappar
    msg.querySelectorAll(".emoji-categories button").forEach(btn => {
      btn.onclick = () => {
        const cat = btn.dataset.cat;
        loadEmojiCategory(cat);
      };
    });

    // Sök emojis
    emojiSearch.oninput = () => {
      const q = emojiSearch.value.toLowerCase();
      emojiGrid.innerHTML = "";

      Object.values(EMOJI_SETS).flat().forEach(e => {
        if (e.toLowerCase().includes(q)) {
          const span = document.createElement("span");
          span.textContent = e;
          span.onclick = () => {
            ws.send(JSON.stringify({
              type: "reaction",
              channel: currentChannel,
              messageId: data.id,
              emoji: e
            }));
            picker.style.display = "none";
          };
          emojiGrid.appendChild(span);
        }
      });
    };

    // Funktion för att ladda kategori
    function loadEmojiCategory(cat) {
      emojiGrid.innerHTML = "";
      EMOJI_SETS[cat].forEach(e => {
        const span = document.createElement("span");
        span.textContent = e;
        span.onclick = () => {
          ws.send(JSON.stringify({
            type: "reaction",
            channel: currentChannel,
            messageId: data.id,
            emoji: e
          }));
          picker.style.display = "none";
        };
        emojiGrid.appendChild(span);
      });
    }
  }
})();
