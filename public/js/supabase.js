
const config = {
    supabase_url: "https://snxzhnegslsbxsejnoaj.supabase.co",
    supabase_anon_key: "sb_publishable_nouoNfSWMdbGvex4PoJlNQ_IGbbiVMT"
};

const client = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
const form = document.getElementById('send-message-form');
const formInput = document.getElementById('form-input');
const divMessages = document.getElementsByClassName('messages')[0];

let currentUser = JSON.parse(localStorage.getItem('currentUser'));

document.addEventListener('DOMContentLoaded', async () => {
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }

    await syncUserTokens();
    updateInputPlaceholder();

    const headerButtons = document.querySelectorAll('.header-bar button');
    const logoutBtn = headerButtons[headerButtons.length - 1];
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = '../auth/login.html';
        });
    }

    await renderMessages();

    client.channel("public:messages").on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages"
    }, (payload) => {
        pushMessage(payload.new);
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


function updateInputPlaceholder() {
    if (!formInput || !currentUser) return;
    if (currentUser.tokens > 0) {
        formInput.placeholder = `Écrire un message... (${currentUser.tokens} jeton(s) disponible(s))`;
        formInput.disabled = false;
    } else {
        formInput.placeholder = "Plus de jetons ! Répondez à un quiz de maths pour parler.";
        formInput.disabled = true;
    }
}


form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = formInput.value.trim();
    if (!messageText) return;

    if (!currentUser || currentUser.tokens <= 0) {
        alert("Vous n'avez plus de jetons ! Faites un quiz de maths pour en gagner.");
        return;
    }

    await sendMessage(messageText);
    formInput.value = '';
});


async function renderMessages() {
    divMessages.innerHTML = '';

    const { data, error } = await client
        .from('messages')
        .select('*')
        .order("id", { ascending: true });
    
    if (error) {
        console.error("Erreur lors de la récupération des messages :", error);
        return;
    }

    data.forEach((element) => {
        pushMessage(element);
    });
}


function pushMessage(msgObj) {
    const isNearBottom =
        divMessages.scrollHeight - divMessages.scrollTop - divMessages.clientHeight < 100;
    
    const container = document.createElement('div');
    container.className = 'message';

    const rawDate = msgObj.created_at || msgObj.timestamp;
    let timeString = '';
    if (rawDate) {
        const date = new Date(rawDate);
        if (!isNaN(date)) {
            timeString = ` (${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`;
        }
    }

    const user = document.createElement('span');
    user.className = 'username';
    user.textContent = (msgObj.username || 'Anonyme') + timeString;

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = msgObj.content;

    container.appendChild(user);
    container.appendChild(text);

    divMessages.appendChild(container);

    if (isNearBottom) scrollToBottom();
}


function scrollToBottom() {
    divMessages.scrollTop = divMessages.scrollHeight;
}


async function sendMessage(messageText) {
    const nowIso = new Date().toISOString();

    const { error } = await client
        .from("messages")
        .insert([{ 
            content: messageText, 
            username: currentUser.pseudo,
            user_id: currentUser.id,
            timestamp: nowIso
        }]);

    if (error) {
        console.error("Erreur lors de l'écriture d'un message :", error);
        return;
    }

    const newTokens = currentUser.tokens - 1;
    const { error: tokenError } = await client
        .from("users")
        .update({ tokens: newTokens })
        .eq("id", currentUser.id);

    if (!tokenError) {
        currentUser.tokens = newTokens;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateInputPlaceholder();
    }
}