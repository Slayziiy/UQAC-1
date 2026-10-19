const config = {
    supabase_url: "https://snxzhnegslsbxsejnoaj.supabase.co",
    supabase_anon_key: "sb_publishable_nouoNfSWMdbGvex4PoJlNQ_IGbbiVMT"
};

const client = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
const form = document.getElementById('send-message-form');
const formInput = document.getElementById('form-input');
const divMessages = document.getElementsByClassName('messages')[0];

document.addEventListener('DOMContentLoaded', () => {
    renderMessages();

    client.channel("public:messages").on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages"
        },
        (payload) => pushMessage(payload.new.content))
        .subscribe();
}); 

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = formInput.value;
    if(!message.trim()) return;
    sendMessage(message);
    formInput.value = '';
});

async function renderMessages(){
    const { data, error } = await client
        .from('messages')
        .select('*')
        .order("id", { ascending: true });
    
    if(error){
        console.error("Erreur lors de la récupération des messages :", error);
    }

    data.forEach((element) => {
        pushMessage(element.content);
    });
}

function pushMessage(message){
    const isNearBottom =
        divMessages.scrollHeight - divMessages.scrollTop - divMessages.clientHeight < 100;
    
    const container = document.createElement('div')
    container.className = 'message';

    const user = document.createElement('span');
    user.className = 'username';
    user.innerHTML = 'Random';

    const text = document.createElement('span');
    text.className = 'text';
    text.innerHTML = message;

    container.appendChild(user);
    container.appendChild(text);

    divMessages.appendChild(container);

    if (isNearBottom) scrollToBottom();
}

function scrollToBottom() {
    divMessages.scrollTop = divMessages.scrollHeight;
}

async function sendMessage(message){
    const { error } = await client
        .from("messages")
        .insert([{ content:  message, timestamp: null }]); // TODO LATER : Change null -> current timestamp

    if(error){
        console.log("Erreur lors de l'écriture d'un message : ", error);
    }
}