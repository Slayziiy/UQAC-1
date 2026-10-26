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

let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let currentChannelId = 1;
let currentChannelName = 'Général';
let userHasCreatedChannel = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }

    await syncUserTokens();
    updateTokenUI();

    await loadChannels();
    await renderMessages();

    initModalsAndButtons();
    initPopupQuiz();

    client.channel('public:messages').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
    }, (payload) => {
        const msgChannel = payload.new.channel_id || 1;
        if (Number(msgChannel) === Number(currentChannelId)) {
            pushMessage(payload.new);
        }
    }).subscribe();

    client.channel('public:channels').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'channels'
    }, () => {
        loadChannels();
    }).subscribe();
});

async function syncUserTokens() {
    if (!currentUser || !currentUser.id) return;
    const { data, error } = await client
        .from('users')
        .select('tokens, score')
        .eq('id', currentUser.id);

    if (!error && data && data.length > 0) {
        currentUser.tokens = data[0].tokens;
        currentUser.score = data[0].score;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
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
    const { data, error } = await client
        .from('channels')
        .select('*')
        .order('id', { ascending: true });

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
            if (currentChannelLabel) {
                currentChannelLabel.textContent = `# ${channel.name}`;
            }
            updateTokenUI();
            await loadChannels();
            await renderMessages();
        });

        li.appendChild(btn);
        channelsListEl.appendChild(li);
    });
}

async function renderMessages() {
    divMessages.replaceChildren();

    const { data, error } = await client
        .from('messages')
        .select('*')
        .eq('channel_id', currentChannelId)
        .order('id', { ascending: true });

    if (error) {
        console.error('Erreur lors de la récupération des messages :', error);
        return;
    }

    if (!data || data.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = `Aucun message dans #${currentChannelName} pour le moment. Lancez la discussion !`;
        emptyMsg.style.color = 'var(--text-muted)';
        divMessages.appendChild(emptyMsg);
        return;
    }

    data.forEach((element) => {
        pushMessage(element);
    });
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

    if (!currentUser || currentUser.tokens <= 0) {
        openModal('quiz-modal');
        return;
    }

    await sendMessage(messageText);
    formInput.value = '';
});

async function sendMessage(messageText) {
    const nowIso = new Date().toISOString();

    const { error } = await client
        .from('messages')
        .insert([{
            content: messageText,
            username: currentUser.pseudo,
            user_id: currentUser.id,
            channel_id: currentChannelId,
            timestamp: nowIso
        }]);

    if (error) {
        console.error('Erreur lors de l\'envoi du message :', error);
        return;
    }

    const newTokens = Math.max(0, currentUser.tokens - 1);
    const { error: tokenError } = await client
        .from('users')
        .update({ tokens: newTokens })
        .eq('id', currentUser.id);

    if (!tokenError) {
        currentUser.tokens = newTokens;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateTokenUI();
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
        if (name.length < 3 || name.length > 20) {
            if (channelErrorEl) channelErrorEl.textContent = 'Le nom du salon doit contenir entre 3 et 20 caractères.';
            return;
        }

        const { data: existingUserChannel } = await client
            .from('channels')
            .select('id')
            .eq('created_by', currentUser.id);

        if (existingUserChannel && existingUserChannel.length > 0) {
            if (channelErrorEl) channelErrorEl.textContent = 'Vous avez déjà utilisé votre création de salon unique.';
            return;
        }

        const { data: newChannel, error } = await client
            .from('channels')
            .insert([{ name: name, created_by: currentUser.id }])
            .select();

        if (error) {
            if (channelErrorEl) channelErrorEl.textContent = 'Ce nom de salon existe déjà ou la table channels est absente.';
            return;
        }

        if (newChannel && newChannel.length > 0) {
            currentChannelId = newChannel[0].id;
            currentChannelName = newChannel[0].name;
            if (currentChannelLabel) currentChannelLabel.textContent = `# ${currentChannelName}`;
        }

        channelNameInput.value = '';
        closeModal('channel-modal');
        await loadChannels();
        await renderMessages();
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

function createRandomMathProblem(diff = 'easy') {
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    if (diff === 'easy') {
        const a = rand(6, 45);
        const b = rand(5, 35);
        return { text: `${a} + ${b} = ?`, answer: a + b, tokens: 1, points: 10 };
    }
    if (diff === 'medium') {
        const a = rand(4, 12);
        const b = rand(3, 9);
        const c = rand(4, 20);
        return { text: `(${a} × ${b}) + ${c} = ?`, answer: a * b + c, tokens: 2, points: 25 };
    }
    const x = rand(2, 12);
    const a = rand(2, 8);
    const b = rand(4, 20);
    return { text: `Trouvez x : ${a}x + ${b} = ${a * x + b}`, answer: x, tokens: 3, points: 50 };
}

function initPopupQuiz() {
    let diff = 'easy';
    let problem = createRandomMathProblem(diff);

    const questionEl = document.getElementById('modal-quiz-question');
    const quizForm = document.getElementById('modal-quiz-form');
    const answerInput = document.getElementById('modal-quiz-answer');
    const feedbackEl = document.getElementById('modal-quiz-feedback');
    const diffBtns = document.querySelectorAll('[data-modal-diff]');

    function updateQuizDisplay() {
        if (questionEl) questionEl.textContent = problem.text;
    }

    diffBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            diffBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            diff = btn.getAttribute('data-modal-diff') || 'easy';
            problem = createRandomMathProblem(diff);
            if (feedbackEl) feedbackEl.textContent = '';
            updateQuizDisplay();
        });
    });

    quizForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = Number(answerInput.value.trim());
        if (answerInput.value.trim() === '' || Number.isNaN(val)) return;

        if (val === problem.answer) {
            const newTokens = (currentUser.tokens || 0) + problem.tokens;
            const newScore = (currentUser.score || 0) + problem.points;

            const { error } = await client
                .from('users')
                .update({ tokens: newTokens, score: newScore })
                .eq('id', currentUser.id);

            if (!error) {
                currentUser.tokens = newTokens;
                currentUser.score = newScore;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateTokenUI();
            }
            if (feedbackEl) {
                feedbackEl.textContent = `Exact ! +${problem.tokens} jeton(s) et +${problem.points} pts gagnés !`;
                feedbackEl.style.color = 'var(--success)';
            }
        } else {
            if (feedbackEl) {
                feedbackEl.textContent = `Faux ! La réponse était ${problem.answer}. Essayez le suivant !`;
                feedbackEl.style.color = 'var(--danger)';
            }
        }

        answerInput.value = '';
        problem = createRandomMathProblem(diff);
        updateQuizDisplay();
    });

    updateQuizDisplay();
}