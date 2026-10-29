(() => {
    const config = {
        supabase_url: "https://snxzhnegslsbxsejnoaj.supabase.co",
        supabase_anon_key: "sb_publishable_nouoNfSWMdbGvex4PoJlNQ_IGbbiVMT"
    };

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const client = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);

    const form = document.getElementById('send-message-form');
    const formInput = document.getElementById('form-input');
    const divMessages = document.getElementById('messages-list');
    const channelsListEl = document.getElementById('channels-list');
    const currentChannelLabel = document.getElementById('current-channel-name');
    const tokenCountLabel = document.getElementById('user-token-count');
    const openCreateChannelBtn = document.getElementById('open-create-channel-btn');

    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
        currentUser = null;
    }

    let currentChannelId = 1;
    let currentChannelName = 'Général';
    let userHasCreatedChannel = false;
    let lastRenderedMessageId = 0;
    let realtimeChannel = null;

    document.addEventListener('DOMContentLoaded', async () => {
        if (!currentUser || !currentUser.session_token) {
            localStorage.removeItem('currentUser');
            window.location.href = '../auth/login.html';
            return;
        }

        const isValid = await syncUserTokens();
        if (!isValid) {
            localStorage.removeItem('currentUser');
            window.location.href = '../auth/login.html';
            return;
        }

        updateTokenUI();
        await loadChannels();
        await renderMessages(true);

        initModalsAndButtons();
        await initPopupQuiz();

        realtimeChannel = client.channel('delta-talk-sync')
            .on('broadcast', { event: 'new_message' }, async (payload) => {
                if (Number(payload.payload?.channel_id) === Number(currentChannelId)) {
                    await renderMessages(false);
                }
            })
            .on('broadcast', { event: 'new_channel' }, async () => {
                await loadChannels();
            })
            .subscribe();

        setInterval(async () => {
            await renderMessages(false);
        }, 3000);
    });

    async function syncUserTokens() {
        if (!currentUser || !currentUser.session_token) return false;

        const { data, error } = await client.rpc('get_my_profile', {
            p_session_token: currentUser.session_token
        });

        if (error || !data) return false;

        currentUser = {
            id: data.id,
            pseudo: data.pseudo,
            tokens: data.tokens,
            score: data.score,
            session_token: currentUser.session_token
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        return true;
    }

    function updateTokenUI() {
        if (tokenCountLabel && currentUser) {
            tokenCountLabel.textContent = `${currentUser.tokens} jeton(s)`;
        }
        if (!formInput || !currentUser) return;

        if (currentUser.tokens > 0) {
            formInput.placeholder = `Écrire dans #${currentChannelName}... (Coût : 1 jeton)`;
            formInput.disabled = false;
        } else {
            formInput.placeholder = '0 jeton disponible ! Cliquez sur "Quiz Maths" en haut pour en gagner.';
            formInput.disabled = true;
        }
    }

    async function loadChannels() {
        const { data, error } = await client.rpc('get_channels_list', {
            p_session_token: currentUser.session_token
        });

        channelsListEl.replaceChildren();

        const channels = (!error && data && data.length > 0)
            ? data
            : [{ id: 1, name: 'Général', created_by: null }];

        userHasCreatedChannel = channels.some((ch) => Number(ch.created_by) === Number(currentUser.id));

        if (openCreateChannelBtn) {
            if (userHasCreatedChannel) {
                openCreateChannelBtn.disabled = true;
                openCreateChannelBtn.textContent = 'Salon perso déjà créé (1 max)';
            } else {
                openCreateChannelBtn.disabled = false;
                openCreateChannelBtn.textContent = '+ Créer mon salon (1 max)';
            }
        }

        channels.forEach((channel) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = `# ${channel.name}`;
            if (Number(channel.id) === Number(currentChannelId)) {
                btn.classList.add('active-channel');
            }

            btn.addEventListener('click', async () => {
                currentChannelId = channel.id;
                currentChannelName = channel.name;
                lastRenderedMessageId = 0;
                if (currentChannelLabel) {
                    currentChannelLabel.textContent = `# ${channel.name}`;
                }
                updateTokenUI();
                await loadChannels();
                await renderMessages(true);
            });

            li.appendChild(btn);
            channelsListEl.appendChild(li);
        });
    }

    async function renderMessages(forceRebuild = false) {
        const { data, error } = await client.rpc('get_channel_messages', {
            p_session_token: currentUser.session_token,
            p_channel_id: currentChannelId
        });

        if (error) return;

        if (!data || data.length === 0) {
            if (forceRebuild || divMessages.children.length === 0) {
                divMessages.replaceChildren();
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = `Ce salon est public, il y a aucun message dans #${currentChannelName} pour le moment. Lancez la discussion !`;
                emptyMsg.style.color = 'var(--text-muted)';
                divMessages.appendChild(emptyMsg);
                lastRenderedMessageId = 0;
            }
            return;
        }

        const newestId = Number(data[data.length - 1].id);
        if (!forceRebuild && newestId === lastRenderedMessageId) {
            return;
        }

        divMessages.replaceChildren();
        data.forEach((element) => {
            pushMessage(element);
        });
        lastRenderedMessageId = newestId;
        scrollToBottom();
    }

    function pushMessage(msgObj) {
        const firstChild = divMessages.firstElementChild;
        if (firstChild && firstChild.tagName === 'P') {
            divMessages.replaceChildren();
        }

        const isNearBottom =
            divMessages.scrollHeight - divMessages.scrollTop - divMessages.clientHeight < 120;

        const container = document.createElement('article');
        container.className = 'message';

        const header = document.createElement('div');
        header.className = 'message-header';

        const user = document.createElement('span');
        user.className = 'username';
        user.textContent = msgObj.username || 'Anonyme';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        const rawDate = msgObj.created_at || msgObj.timestamp;
        if (rawDate) {
            const date = new Date(rawDate);
            if (!Number.isNaN(date.getTime())) {
                timeSpan.textContent = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
        }

        header.append(user, timeSpan);

        const text = document.createElement('p');
        text.className = 'text';
        text.textContent = msgObj.content;

        container.append(header, text);
        divMessages.appendChild(container);

        if (isNearBottom) scrollToBottom();
    }

    function scrollToBottom() {
        divMessages.scrollTop = divMessages.scrollHeight;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = formInput.value.trim();
        if (!messageText) return;

        await sendMessage(messageText);
        formInput.value = '';
    });

    async function sendMessage(messageText) {
        const { data: remainingTokens, error } = await client.rpc('send_chat_message', {
            p_session_token: currentUser.session_token,
            p_channel_id: currentChannelId,
            p_content: messageText
        });

        if (error) {
            await syncUserTokens();
            updateTokenUI();
            if (currentUser.tokens <= 0) {
                openModal('quiz-modal');
            }
            return;
        }

        currentUser.tokens = remainingTokens;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateTokenUI();

        await renderMessages(false);
        if (realtimeChannel) {
            realtimeChannel.send({
                type: 'broadcast',
                event: 'new_message',
                payload: { channel_id: currentChannelId }
            });
        }
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.hidden = false;
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.hidden = true;
    }

    function initModalsAndButtons() {
        document.getElementById('open-quiz-btn')?.addEventListener('click', () => openModal('quiz-modal'));
        document.getElementById('open-rules-btn')?.addEventListener('click', () => openModal('rules-modal'));
        document.getElementById('open-settings-btn')?.addEventListener('click', () => {
            updateThemeButtonsState();
            openModal('settings-modal');
        });
        openCreateChannelBtn?.addEventListener('click', () => {
            if (!userHasCreatedChannel) openModal('channel-modal');
        });

        document.querySelectorAll('[data-close-modal]').forEach((btn) => {
            btn.addEventListener('click', () => {
                closeModal(btn.getAttribute('data-close-modal'));
            });
        });

        document.querySelectorAll('.modal-overlay').forEach((overlay) => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.hidden = true;
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach((overlay) => {
                    overlay.hidden = true;
                });
            }
        });

        const lightBtn = document.getElementById('theme-light-btn');
        const darkBtn = document.getElementById('theme-dark-btn');

        lightBtn?.addEventListener('click', () => {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            updateThemeButtonsState();
        });

        darkBtn?.addEventListener('click', () => {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            updateThemeButtonsState();
        });

        const createChannelForm = document.getElementById('create-channel-form');
        const channelNameInput = document.getElementById('new-channel-name');
        const channelErrorEl = document.getElementById('channel-modal-error');

        createChannelForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (channelErrorEl) channelErrorEl.textContent = '';

            const name = channelNameInput.value.trim();

            const { data: newChannel, error } = await client.rpc('create_user_channel', {
                p_session_token: currentUser.session_token,
                p_name: name
            });

            if (error || !newChannel) {
                if (channelErrorEl) channelErrorEl.textContent = error?.message || 'Impossible de créer ce salon.';
                return;
            }

            currentChannelId = newChannel.id;
            currentChannelName = newChannel.name;
            lastRenderedMessageId = 0;
            if (currentChannelLabel) currentChannelLabel.textContent = `# ${currentChannelName}`;

            channelNameInput.value = '';
            closeModal('channel-modal');
            await loadChannels();
            await renderMessages(true);

            if (realtimeChannel) {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'new_channel',
                    payload: {}
                });
            }
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = '../auth/login.html';
        });
    }

    function updateThemeButtonsState() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const lightBtn = document.getElementById('theme-light-btn');
        const darkBtn = document.getElementById('theme-dark-btn');
        if (lightBtn && darkBtn) {
            lightBtn.classList.toggle('active', current === 'light');
            darkBtn.classList.toggle('active', current === 'dark');
        }
    }

    async function initPopupQuiz() {
        let diff = 'easy';

        const questionEl = document.getElementById('modal-quiz-question');
        const quizForm = document.getElementById('modal-quiz-form');
        const answerInput = document.getElementById('modal-quiz-answer');
        const feedbackEl = document.getElementById('modal-quiz-feedback');
        const diffBtns = document.querySelectorAll('[data-modal-diff]');

        async function fetchServerQuiz() {
            const { data, error } = await client.rpc('request_math_quiz', {
                p_session_token: currentUser.session_token,
                p_difficulty: diff
            });
            if (!error && data && questionEl) {
                questionEl.textContent = data.question;
            }
        }

        diffBtns.forEach((btn) => {
            btn.addEventListener('click', async () => {
                diffBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                diff = btn.getAttribute('data-modal-diff') || 'easy';
                if (feedbackEl) feedbackEl.textContent = '';
                await fetchServerQuiz();
            });
        });

        quizForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const val = parseInt(answerInput.value.trim(), 10);
            if (Number.isNaN(val)) return;

            const { data, error } = await client.rpc('submit_math_quiz', {
                p_session_token: currentUser.session_token,
                p_answer: val
            });

            if (error || !data) return;

            currentUser.tokens = data.tokens;
            currentUser.score = data.score;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateTokenUI();

            if (data.correct) {
                if (feedbackEl) {
                    feedbackEl.textContent = `Exact ! +${data.added_tokens} jeton(s) et +${data.added_points} pts gagnés !`;
                    feedbackEl.style.color = 'var(--success)';
                }
            } else {
                if (feedbackEl) {
                    feedbackEl.textContent = `Faux ! La réponse était ${data.expected}. Essayez le suivant !`;
                    feedbackEl.style.color = 'var(--danger)';
                }
            }

            answerInput.value = '';
            await fetchServerQuiz();
        });

        await fetchServerQuiz();
    }
})();
