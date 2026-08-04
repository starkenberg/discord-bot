(async () => {

    "use strict";

    const API_URL = "https://discord-bot-vcu3.onrender.com";
    const WS_URL  = "wss://discord-bot-vcu3.onrender.com";

    const EMOJI_SETS = {
        smileys:["😀","😁","😂","🤣","😊","😎","😍","😘","😡","😭","😱","🤔"],
        animals:["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁"],
        food:["🍏","🍎","🍔","🍟","🍕","🌭","🍿","🍣","🍪","🍩"],
        activities:["⚽","🏀","🏈","⚾","🎾","🏐","🎱","🏓","🏸"],
        objects:["💡","📱","💻","🖥️","⌨️","🖱️","💾","📷"],
        symbols:["❤️","💔","💯","🔥","✨","⭐","⚡","💥"],
        flags:["🇸🇪","🇺🇸","🇬🇧","🇩🇰","🇫🇮","🇳🇴","🇩🇪","🇫🇷"]
    };

    const widgets = document.querySelectorAll(".discord-widget");

    widgets.forEach(widget => {

        new DiscordWidget(widget);

    });

    class DiscordWidget {

        constructor(container){

            this.container = container;

            this.category =
                container.dataset.category || null;

            this.channel =
                container.dataset.channel || null;

            this.channels = [];

            this.visibleChannels = [];

            this.currentChannel = null;

            this.ws = null;

            this.typingTimeout = null;

            this.buildUI();

            this.bindEvents();

            this.init();

        }

       async init(){

            await this.fetchChannels();

            this.buildSidebar();

            this.updateHeader(this.currentChannel);

            await this.loadHistory(this.currentChannel);

            this.connectWebSocket();

        }

        buildUI(){

            this.container.innerHTML = this.template();

            this.cacheDOM(); 

        }

        bindEvents(){

            // Input

            // Buttons

            // Keyboard

        }

        template(){

            return `
                <div class="discord-wrapper">

                    <aside class="discord-sidebar">

                        <div class="discord-server-header"></div>

                        <div class="discord-channel-list"></div>

                    </aside>

                    <main class="discord-chat-area">

                        <header class="discord-chat-header">

                            <div class="discord-channel-title"></div>

                            <div class="discord-channel-topic"></div>

                        </header>

                        <section class="discord-messages"></section>

                        <div class="discord-typing"></div>

                        <footer class="discord-input-area">

                            <input
                                class="discord-input"
                                placeholder="Skriv ett meddelande..."
                            >

                        </footer>

                    </main>

                </div>
            `;

        }

        cacheDOM() {

            this.messagesEl =
                this.container.querySelector(".discord-messages");

            this.inputEl =
                this.container.querySelector(".discord-input");

            this.typingEl =
                this.container.querySelector(".discord-typing");

            this.channelListEl =
                this.container.querySelector(".discord-channel-list");

            this.channelTitleEl =
                this.container.querySelector(".discord-channel-title");

            this.channelTopicEl =
                this.container.querySelector(".discord-channel-topic");
        }


        /**
         * fetchChannels - Hämtar tillgängliga Discord-kanaler från backend. 
         * 
         */
        async fetchChannels(){

            this.channels = await fetch(API_URL + "/channels")
                .then(r => r.json());

            this.visibleChannels = this.channels;

            if(this.category){

                this.visibleChannels = this.channels.filter(c =>
                    c.parentName === this.category
                );

            }

            if(this.channel){

                const found = this.channels.find(c =>
                    c.name.toLowerCase() ===
                    this.channel.toLowerCase()
                );

                if(found){

                    this.currentChannel = found.id;

                }

            }

            if(!this.currentChannel &&
                this.visibleChannels.length){

                this.currentChannel =
                    this.visibleChannels[0].id;

            }

            if(!this.currentChannel &&
                this.channels.length){

                this.currentChannel =
                    this.channels[0].id;

            }

        }

        /**
         * buildSidebar - Bygger sidebar i widget wrapper-strukturen 
         * 
         */
        buildSidebar(){

            this.channelListEl.innerHTML = "";

            this.visibleChannels.forEach(ch =>{

                const el = document.createElement("div");

                el.className = "channel-item";

                if(ch.id === this.currentChannel){

                    el.classList.add("active");

                }

                el.textContent = "#" + ch.name;

                el.onclick = ()=>{

                    this.channelListEl
                        .querySelectorAll(".channel-item")
                        .forEach(x=>x.classList.remove("active"));

                    el.classList.add("active");

                    this.selectChannel(ch.id);

                };

                this.channelListEl.appendChild(el);

            });

        }

        /**
         * updateHeader - Updaterar headern med kanal-titel och information om kanalen 
         * 
         */
        updateHeader(channelId){

            const ch = this.channels.find(c =>
                c.id === channelId);

            if(!ch) return;

            this.channelTitleEl.textContent =
                "# " + ch.name;

            this.channelTopicEl.textContent =
                ch.parentName || "";

        }

        /**
         * selectChannel - Sätter startkanal 
         * 
         */
        async selectChannel(id){

            this.currentChannel = id;

            this.updateHeader(id);

            await this.loadHistory(id);

        }

        /**
         * loadHistory - Laddar kanalens historiska inlägg 
         * 
         */
        async loadHistory(channelId){

            const history = await fetch(
                API_URL + "/messages/" + channelId
            ).then(r=>r.json());

            this.messagesEl.innerHTML = "";

            history.forEach(msg=>{

                this.renderMessage(msg);

            });

            this.messagesEl.scrollTop =
                this.messagesEl.scrollHeight;

        }

        /**
         * renderMessage - Bygger logik runt meddelanden 
         * 
         */
        renderMessage(data){

            const msg =
                document.createElement("div");

            msg.className =
                "discord-message";

            msg.innerHTML = `

                <img
                    class="discord-avatar"
                    src="${data.author.avatar}">

                <div class="discord-content">

                    <div class="discord-author">

                        ${data.author.name}

                    </div>

                    <div>

                        ${data.content}

                    </div>

                </div>

            `;

            this.messagesEl.appendChild(msg);

        }

        /**
         * connectWebsocket 
         *
         * Ansluter widgeten till backend via WebSocket och
         * registrerar grundläggande event handlers.
         */
        connectWebSocket(){

            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {

                console.log("[Discord Widget] Connected");

            };

            this.ws.onclose = () => {

                console.log("[Discord Widget] Disconnected");

            };

            this.ws.onerror = error => {

                console.error("[Discord Widget]", error);

            };

            this.ws.onmessage = event => {

                const data = JSON.parse(event.data);

                console.log("[Discord Widget] Incoming:", data);

            };

        }

    }

})();