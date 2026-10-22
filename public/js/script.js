
const SUPABASE_CONFIG = {
    url: "https://snxzhnegslsbxsejnoaj.supabase.co",
    anonKey: "sb_publishable_nouoNfSWMdbGvex4PoJlNQ_IGbbiVMT"
};

const supabaseClient = window.supabase 
    ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey) 
    : null;


document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        initRegisterForm(registerForm);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        initLoginForm(loginForm);
    }
});


function saveUserSession(user) {
    const sessionUser = {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        tokens: user.tokens ?? 5,
        score: user.score ?? 0
    };
    localStorage.setItem('currentUser', JSON.stringify(sessionUser));
}


function initRegisterForm(form) {
    const pseudoInput = document.getElementById('pseudo');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const submitBtn = document.getElementById('register-submit-btn');

    const rulesList = document.getElementById('password-rules');

    const forbiddenCharsRegex = /[\/\\<>'"`;]/;
    const specialCharsRegex = /[!@#$%^&*()_\-+=\[\]{}.,?]/;

    passwordInput.addEventListener('input', () => {
        const value = passwordInput.value;
        const results = checkPasswordRules(value);
        updateRuleDisplay('length', results.length);
        updateRuleDisplay('uppercase', results.uppercase);
        updateRuleDisplay('number', results.number);
        updateRuleDisplay('special', results.special);
        updateRuleDisplay('forbidden', results.noForbiddenChars);
        clearFieldError('password-error');
    });

    passwordConfirmInput.addEventListener('input', () => clearFieldError('password-confirm-error'));
    pseudoInput.addEventListener('input', () => clearFieldError('pseudo-error'));
    emailInput.addEventListener('input', () => clearFieldError('email-error'));

    function checkPasswordRules(value) {
        return {
            length: value.length >= 16,
            uppercase: /[A-Z]/.test(value),
            number: /[0-9]/.test(value),
            special: specialCharsRegex.test(value),
            noForbiddenChars: value.length > 0 && !forbiddenCharsRegex.test(value)
        };
    }

    function updateRuleDisplay(ruleName, isValid) {
        const li = rulesList.querySelector(`[data-rule="${ruleName}"]`);
        if (!li) return;
        const icon = li.querySelector('i');
        li.classList.toggle('rule-valid', isValid);
        li.classList.toggle('rule-invalid', !isValid);
        icon.className = isValid ? 'fa-regular fa-circle-check' : 'fa-regular fa-circle-xmark';
    }

    function setFieldError(errorId, message) {
        const el = document.getElementById(errorId);
        if (el) el.textContent = message;
    }

    function clearFieldError(errorId) {
        setFieldError(errorId, '');
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFieldError('form-error');

        let isFormValid = true;

        const pseudo = pseudoInput.value.trim();
        if (pseudo.length === 0) {
            setFieldError('pseudo-error', 'Le pseudo est obligatoire.');
            isFormValid = false;
        } else if (pseudo.length < 3) {
            setFieldError('pseudo-error', 'Le pseudo doit contenir au moins 3 caractères.');
            isFormValid = false;
        } else {
            clearFieldError('pseudo-error');
        }

        const email = emailInput.value.trim();
        if (email.length === 0) {
            setFieldError('email-error', 'L\'adresse mail est obligatoire.');
            isFormValid = false;
        } else if (!isValidEmail(email)) {
            setFieldError('email-error', 'Le format de l\'adresse mail est invalide.');
            isFormValid = false;
        } else {
            clearFieldError('email-error');
        }

        const password = passwordInput.value;
        const rules = checkPasswordRules(password);
        const allRulesValid = Object.values(rules).every(Boolean);

        if (password.length === 0) {
            setFieldError('password-error', 'Le mot de passe est obligatoire.');
            isFormValid = false;
        } else if (!allRulesValid) {
            setFieldError('password-error', 'Le mot de passe ne respecte pas toutes les règles ci-dessous.');
            isFormValid = false;
        } else {
            clearFieldError('password-error');
        }

        const passwordConfirm = passwordConfirmInput.value;
        if (passwordConfirm.length === 0) {
            setFieldError('password-confirm-error', 'Merci de confirmer le mot de passe.');
            isFormValid = false;
        } else if (password !== passwordConfirm) {
            setFieldError('password-confirm-error', 'Les mots de passe ne correspondent pas.');
            isFormValid = false;
        } else {
            clearFieldError('password-confirm-error');
        }

        if (!isFormValid) {
            setFieldError('form-error', 'Merci de corriger les champs en rouge avant de continuer.');
            return;
        }

        const firstname = document.getElementById('firstname').value.trim();
        const lastname = document.getElementById('lastname').value.trim();

        const registrationData = {
            pseudo: pseudo,
            email: email,
            password: password,
            firstname: firstname || null,
            lastname: lastname || null,
            tokens: 5, 
            score: 0   
        };

        try {
            if (submitBtn) submitBtn.disabled = true;

            const { data: existingPseudo, error: pseudoCheckError } = await supabaseClient
                .from('users')
                .select('id')
                .eq('pseudo', pseudo);

            if (pseudoCheckError) throw pseudoCheckError;

            if (existingPseudo && existingPseudo.length > 0) {
                setFieldError('pseudo-error', 'Ce pseudo est déjà utilisé par un autre compte.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            const { data: existingEmail, error: emailCheckError } = await supabaseClient
                .from('users')
                .select('id')
                .eq('email', email);

            if (emailCheckError) throw emailCheckError;

            if (existingEmail && existingEmail.length > 0) {
                setFieldError('email-error', 'Cette adresse mail est déjà associée à un compte.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            const { data: insertedUsers, error: insertError } = await supabaseClient
                .from('users')
                .insert([registrationData])
                .select();

            if (insertError) throw insertError;

            if (insertedUsers && insertedUsers.length > 0) {
                saveUserSession(insertedUsers[0]);
                window.location.href = '../user/discussion.html';
            }

        } catch (err) {
            console.error('Erreur Supabase lors de l\'inscription :', err);
            setFieldError('form-error', 'Erreur lors de la création du compte. Vérifiez la table users sur Supabase.');
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}


function initLoginForm(form) {
    const pseudoInput = document.getElementById('login-pseudo');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit-btn');

    function setFieldError(errorId, message) {
        const el = document.getElementById(errorId);
        if (el) el.textContent = message;
    }

    function clearFieldError(errorId) {
        setFieldError(errorId, '');
    }

    pseudoInput.addEventListener('input', () => {
        clearFieldError('login-pseudo-error');
        clearFieldError('login-form-error');
    });

    passwordInput.addEventListener('input', () => {
        clearFieldError('login-password-error');
        clearFieldError('login-form-error');
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFieldError('login-form-error');

        const pseudo = pseudoInput.value.trim();
        const password = passwordInput.value;
        let isValid = true;

        if (pseudo.length === 0) {
            setFieldError('login-pseudo-error', 'Veuillez entrer votre nom d\'utilisateur.');
            isValid = false;
        }

        if (password.length === 0) {
            setFieldError('login-password-error', 'Veuillez entrer votre mot de passe.');
            isValid = false;
        }

        if (!isValid) return;

        try {
            if (submitBtn) submitBtn.disabled = true;

            const { data: users, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('pseudo', pseudo)
                .eq('password', password);

            if (error) throw error;

            if (!users || users.length === 0) {
                setFieldError('login-form-error', 'Nom d\'utilisateur ou mot de passe incorrect.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            saveUserSession(users[0]);
            window.location.href = '../user/discussion.html';

        } catch (err) {
            console.error('Erreur Supabase lors de la connexion :', err);
            setFieldError('login-form-error', 'Impossible de se connecter au serveur Supabase.');
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}