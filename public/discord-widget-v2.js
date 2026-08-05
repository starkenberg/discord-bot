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

            this.reactionPicker = null;

            this.activeReactionMessage = null;

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

            this.bindInputEvents();

        }

        buildUI(){

            this.container.innerHTML = this.template();

            this.cacheDOM();

            this.reactionPicker = this.createReactionPicker();

            this.container.appendChild(
                this.reactionPicker
            ); 

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

                el.className = "discord-channel-item";

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

            this.scrollBottom();

        }

        /**
         * Renderar ett Discord-meddelande.
         */
        renderMessage(data){
            const element = this.createMessageElement(data);

            this.bindMessageEvents(element);

            this.renderReactions(element, data);

            this.messagesEl.appendChild(element)

        }

        /**
         * createMessageElement - Skapar DOM-element för ett Discord-meddelande.
         */
        createMessageElement(data){

            const msg = document.createElement("article");

            msg.className = "discord-message";

            msg.dataset.id = data.id;

            msg.innerHTML = `

                <img
                    class="discord-avatar"
                    src="${data.author.avatar}"
                    alt="${data.author.name}">

                <div class="discord-content">

                    <div class="discord-message-toolbar">

                        <button
                            class="discord-add-reaction"
                            type="button">

                            😊

                        </button>

                    </div>

                    <div class="discord-author">

                        ${data.author.name}

                    </div>

                    <div class="discord-text">

                        ${data.content}

                    </div>

                    <div class="discord-reaction-bar">

                        <div class="discord-reactions"></div>

                        <button
                            class="discord-reaction-add"
                            type="button">

                            +

                        </button>

                    </div>

                </div>

            `;

            return msg;

        }

        /**
         * createReactionPicker - Skapar emoji-picker.
         */
        createReactionPicker(){

            const picker = document.createElement("div");

            picker.className = "discord-emoji-picker";

            picker.innerHTML = `

                <div class="discord-emoji-grid">

                    <span data-emoji="😀">😀</span>
                    <span data-emoji="😂">😂</span>
                    <span data-emoji="😍">😍</span>
                    <span data-emoji="❤️">❤️</span>
                    <span data-emoji="🔥">🔥</span>

                </div>

            `;

            return picker;

        }

        /**
         * Kopplar events till inputfältet.
         */
        bindInputEvents(){

            this.inputEl.addEventListener("keydown", e => {

                if(e.key !== "Enter")
                    return;

                const content = this.inputEl.value.trim();

                if(!content)
                    return;

                if(this.ws?.readyState !== WebSocket.OPEN)
                    return;

                this.ws.send(JSON.stringify({

                    type: "send",

                    channel: this.currentChannel,

                    content

                }));

                this.inputEl.value = "";

            });

        }

        /**
         * bindMessageEvents - Kopplar events till ett meddelande.
         */
        bindMessageEvents(messageElement){

            const button =
                messageElement.querySelector(".discord-reaction-add");

            const picker = this.reactionPicker;

            button.addEventListener("click", e => {

                e.stopPropagation();

                picker.classList.toggle("open");

            });

            picker.addEventListener("click", e => {

                e.stopPropagation();

                const emoji = e.target.dataset.emoji;

                if(!emoji)
                    return;

                if(this.ws?.readyState !== WebSocket.OPEN)
                    return;

                this.ws.send(JSON.stringify({

                    type:"reaction",

                    channel:this.currentChannel,

                    messageId:messageElement.dataset.id,

                    emoji

                }));

                picker.classList.remove("open");

            });

            document.addEventListener("click", () => {

                picker.classList.remove("open");

            });

        }

        /**
         * Renderar alla reactions för ett meddelande.
         */
        renderReactions(messageElement, data){

            if(!data.reactions?.length)
                return

            const container = messageElement.querySelector(".discord-reactions");

            data.reactions.forEach(reaction => {

                container.appendChild(
                    this.renderReaction(reaction)
                );

            });

        }


        /**
         * Renderar en enskild reaction.
         */
        renderReaction(reaction){

            const badge = document.createElement("span");

            badge.className = "discord-reaction";

            badge.dataset.emoji = reaction.emoji;

            badge.textContent =
                `${reaction.emoji} ${reaction.count}`;

            return badge;

        }

        /**
         * updateReaction
         * 
         * Uppdaterar en befintlig reaction eller skapar en ny
         * om emojin inte redan finns på meddelandet.
         */
        updateReaction(container, data){

            let badge = container.querySelector(
                `[data-emoji="${data.emoji}"]`
            );

            if(!badge){

                badge = this.renderReaction(data);

                container.appendChild(badge);

                return;

            }

            badge.textContent = `${data.emoji} ${data.count}`;

        }

        /**
         * scrollBottom - Scrollar till sista meddelandet.
         * 
         */
        scrollBottom(){

            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

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

                 this.handleSocketMessage(data);

            };

        }

        /**
         * handleSocketMessage - Tar emot alla inkommande WebSocket-events.
         */
        handleSocketMessage(data){

           switch(data.type){

                case "message":
                    this.handleMessage(data);
                    break;

                case "typing":
                    this.handleTyping(data);
                    break;

                case "reaction":
                    this.handleReaction(data);
                    break;

            }

        }

        /**
         * Hanterar nya meddelanden.
         */
        handleMessage(data){

            if(data.channel !== this.currentChannel)
                return;

            this.renderMessage(data);

            this.scrollBottom();

        }

        /**
         * Hanterar typing-events.
         */
        handleTyping(data){

            if(data.channel !== this.currentChannel)
                return;

            this.typingEl.textContent =
                `${data.user} skriver...`;

            clearTimeout(this.typingTimeout);

            this.typingTimeout = setTimeout(() => {

                this.typingEl.textContent = "";

            }, 2000);

        }

        /**
         * Hanterar inkommande reactions från WebSocket.
         */
        handleReaction(data){

            if(data.channel !== this.currentChannel)
                return;

            const messageElement = this.messagesEl.querySelector(
                `[data-id="${data.messageId}"]`
            );

            if(!messageElement)
                return;

            const reactionsContainer =
                messageElement.querySelector(".discord-reactions");

            if(!reactionsContainer)
                return;

            this.updateReaction(
                reactionsContainer,
                data
            );

        }

    }

    const widgets = document.querySelectorAll(".discord-widget");

    widgets.forEach(widget => {

        new DiscordWidget(widget);

    });

})();