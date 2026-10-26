const SUPABASE_CONFIG = {
    url: "https://snxzhnegslsbxsejnoaj.supabase.co",
    anonKey: "sb_publishable_nouoNfSWMdbGvex4PoJlNQ_IGbbiVMT"
};

const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    : null;

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}
applySavedTheme();

function toggleSiteTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    return next;
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem('currentUser');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function saveUserSession(user) {
    const sessionUser = {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        firstname: user.firstname || null,
        lastname: user.lastname || null,
        tokens: user.tokens ?? 5,
        score: user.score ?? 0
    };
    localStorage.setItem('currentUser', JSON.stringify(sessionUser));
}

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    updateNavigationHeader();

    const registerForm = document.getElementById('register-form');
    if (registerForm) initRegisterForm(registerForm);

    const loginForm = document.getElementById('login-form');
    if (loginForm) initLoginForm(loginForm);

    const rankingTableBody = document.getElementById('ranking-tbody');
    if (rankingTableBody) initRankingPage();

    const profileContainer = document.getElementById('profile-section');
    if (profileContainer) initProfilePage();
});

function updateNavigationHeader() {
    const navRight = document.querySelector('nav .right');
    if (!navRight) return;

    const rootPrefix = document.body.getAttribute('data-root') || '.';
    const user = getCurrentUser();

    navRight.replaceChildren();

    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.setAttribute('aria-label', 'Changer le thème clair ou sombre');
    const themeIcon = document.createElement('i');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    const themeSpan = document.createElement('span');
    themeSpan.textContent = isDark ? 'Clair' : 'Sombre';
    themeBtn.append(themeIcon, themeSpan);

    themeBtn.addEventListener('click', () => {
        const newTheme = toggleSiteTheme();
        themeIcon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        themeSpan.textContent = newTheme === 'dark' ? 'Clair' : 'Sombre';
    });

    navRight.appendChild(themeBtn);

    if (user) {
        const chatLink = document.createElement('a');
        chatLink.href = `${rootPrefix}/user/discussion.html`;
        chatLink.className = 'login-button';
        const chatIcon = document.createElement('i');
        chatIcon.className = 'fa-solid fa-comments';
        const chatText = document.createElement('span');
        chatText.textContent = `Discussion (${user.tokens} jetons)`;
        chatLink.append(chatIcon, chatText);

        const profileLink = document.createElement('a');
        profileLink.href = `${rootPrefix}/user/profile.html`;
        profileLink.className = 'register-button';
        const profileIcon = document.createElement('i');
        profileIcon.className = 'fa-solid fa-user-check';
        const profileText = document.createElement('span');
        profileText.textContent = user.pseudo;
        profileLink.append(profileIcon, profileText);

        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.className = 'login-button';
        const logoutIcon = document.createElement('i');
        logoutIcon.className = 'fa-solid fa-right-from-bracket';
        const logoutText = document.createElement('span');
        logoutText.textContent = 'Déconnexion';
        logoutBtn.append(logoutIcon, logoutText);

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = `${rootPrefix}/index.html`;
        });

        navRight.append(chatLink, profileLink, logoutBtn);
    } else {
        const loginLink = document.createElement('a');
        loginLink.href = `${rootPrefix}/auth/login.html`;
        loginLink.className = 'login-button';
        const loginIcon = document.createElement('i');
        loginIcon.className = 'fa-solid fa-arrow-right-to-bracket';
        const loginText = document.createElement('span');
        loginText.textContent = 'Connexion';
        loginLink.append(loginIcon, loginText);

        const registerLink = document.createElement('a');
        registerLink.href = `${rootPrefix}/auth/register.html`;
        registerLink.className = 'register-button';
        const regIcon = document.createElement('i');
        regIcon.className = 'fa-solid fa-user';
        const regText = document.createElement('span');
        regText.textContent = 'Inscription';
        registerLink.append(regIcon, regText);

        navRight.append(loginLink, registerLink);
    }
}

function generateMathQuestion(difficulty = 'easy') {
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    if (difficulty === 'easy') {
        const mode = randInt(1, 3);
        if (mode === 1) {
            const a = randInt(8, 60);
            const b = randInt(5, 50);
            return { text: `${a} + ${b} = ?`, answer: a + b, tokens: 1, points: 10 };
        } else if (mode === 2) {
            const a = randInt(25, 80);
            const b = randInt(4, 24);
            return { text: `${a} - ${b} = ?`, answer: a - b, tokens: 1, points: 10 };
        } else {
            const a = randInt(2, 9);
            const b = randInt(3, 9);
            return { text: `${a} × ${b} = ?`, answer: a * b, tokens: 1, points: 10 };
        }
    }

    if (difficulty === 'medium') {
        const mode = randInt(1, 3);
        if (mode === 1) {
            const a = randInt(4, 12);
            const b = randInt(3, 9);
            const c = randInt(5, 30);
            return { text: `(${a} × ${b}) + ${c} = ?`, answer: a * b + c, tokens: 2, points: 25 };
        } else if (mode === 2) {
            const b = randInt(3, 11);
            const quotient = randInt(4, 14);
            const a = b * quotient;
            return { text: `${a} ÷ ${b} = ?`, answer: quotient, tokens: 2, points: 25 };
        } else {
            const a = randInt(6, 14);
            const b = randInt(4, 9);
            const c = randInt(5, 20);
            return { text: `(${a} × ${b}) - ${c} = ?`, answer: a * b - c, tokens: 2, points: 25 };
        }
    }

    const mode = randInt(1, 2);
    if (mode === 1) {
        const x = randInt(2, 15);
        const a = randInt(2, 9);
        const b = randInt(3, 25);
        const c = a * x + b;
        return {
            text: `Trouvez x : ${a}x + ${b} = ${c}`,
            answer: x,
            tokens: 3,
            points: 50
        };
    } else {
        const a = randInt(4, 12);
        const b = randInt(3, 8);
        const c = randInt(2, 7);
        return {
            text: `${a}² + (${b} × ${c}) = ?`,
            answer: a * a + b * c,
            tokens: 3,
            points: 50
        };
    }
}

async function initRankingPage() {
    let currentDifficulty = 'easy';
    let currentProblem = generateMathQuestion(currentDifficulty);

    const questionEl = document.getElementById('quiz-question');
    const answerForm = document.getElementById('quiz-form');
    const answerInput = document.getElementById('quiz-answer');
    const feedbackEl = document.getElementById('quiz-feedback');
    const userStatusEl = document.getElementById('quiz-user-status');
    const diffButtons = document.querySelectorAll('.difficulty-btn');

    function renderQuizState() {
        if (questionEl) questionEl.textContent = currentProblem.text;
        const user = getCurrentUser();
        if (userStatusEl) {
            if (user) {
                userStatusEl.textContent = `Connecté en tant que ${user.pseudo} | Jetons : ${user.tokens} | Score : ${user.score} pts`;
            } else {
                userStatusEl.textContent = 'Connectez-vous pour enregistrer vos jetons et vos points au classement.';
            }
        }
    }

    diffButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            diffButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentDifficulty = btn.getAttribute('data-diff') || 'easy';
            currentProblem = generateMathQuestion(currentDifficulty);
            if (feedbackEl) {
                feedbackEl.textContent = '';
                feedbackEl.className = 'quiz-feedback';
            }
            renderQuizState();
        });
    });

    if (answerForm) {
        answerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userVal = Number(answerInput.value.trim());
            if (answerInput.value.trim() === '' || Number.isNaN(userVal)) {
                feedbackEl.textContent = 'Veuillez saisir un nombre valide.';
                feedbackEl.className = 'quiz-feedback error';
                return;
            }

            if (userVal === currentProblem.answer) {
                const user = getCurrentUser();
                if (user && supabaseClient) {
                    const newTokens = (user.tokens || 0) + currentProblem.tokens;
                    const newScore = (user.score || 0) + currentProblem.points;

                    const { error } = await supabaseClient
                        .from('users')
                        .update({ tokens: newTokens, score: newScore })
                        .eq('id', user.id);

                    if (!error) {
                        user.tokens = newTokens;
                        user.score = newScore;
                        saveUserSession(user);
                        updateNavigationHeader();
                    }
                    feedbackEl.textContent = `Bravo ! +${currentProblem.tokens} jeton(s) et +${currentProblem.points} points ajoutés à votre compte.`;
                } else {
                    feedbackEl.textContent = `Bonne réponse (${currentProblem.answer}) ! Connectez-vous pour sauvegarder vos gains.`;
                }
                feedbackEl.className = 'quiz-feedback success';
            } else {
                feedbackEl.textContent = `Raté ! La bonne réponse était ${currentProblem.answer}. Voici un nouveau calcul.`;
                feedbackEl.className = 'quiz-feedback error';
            }

            answerInput.value = '';
            currentProblem = generateMathQuestion(currentDifficulty);
            renderQuizState();
            await loadLeaderboardTable();
        });
    }

    renderQuizState();
    await loadLeaderboardTable();
}

async function loadLeaderboardTable() {
    const tbody = document.getElementById('ranking-tbody');
    if (!tbody || !supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('users')
        .select('id, pseudo, score, tokens')
        .order('score', { ascending: false })
        .limit(50);

    tbody.replaceChildren();

    if (error || !data) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.textContent = 'Impossible de charger le classement pour le moment.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    const currentUser = getCurrentUser();

    data.forEach((player, index) => {
        const tr = document.createElement('tr');
        if (currentUser && player.id === currentUser.id) {
            tr.className = 'current-user-row';
        }

        const tdRank = document.createElement('td');
        const rankNum = index + 1;
        tdRank.textContent = rankNum === 1 ? '🥇 1er' : rankNum === 2 ? '🥈 2e' : rankNum === 3 ? '🥉 3e' : `#${rankNum}`;

        const tdPseudo = document.createElement('td');
        tdPseudo.textContent = player.pseudo;

        const tdScore = document.createElement('td');
        tdScore.textContent = `${player.score ?? 0} pts`;

        const tdTokens = document.createElement('td');
        tdTokens.textContent = `${player.tokens ?? 0} 🪙`;

        tr.append(tdRank, tdPseudo, tdScore, tdTokens);
        tbody.appendChild(tr);
    });
}

async function initProfilePage() {
    const user = getCurrentUser();
    const rootPrefix = document.body.getAttribute('data-root') || '..';

    if (!user) {
        window.location.href = `${rootPrefix}/auth/login.html`;
        return;
    }

    const pseudoEl = document.getElementById('profile-pseudo');
    const tokensEl = document.getElementById('profile-tokens');
    const scoreEl = document.getElementById('profile-score');
    const rankEl = document.getElementById('profile-rank');
    const levelLabelEl = document.getElementById('profile-level-label');
    const progressFillEl = document.getElementById('profile-progress-fill');

    if (supabaseClient) {
        const { data: allUsers, error } = await supabaseClient
            .from('users')
            .select('id, pseudo, tokens, score')
            .order('score', { ascending: false });

        if (!error && allUsers) {
            const myIndex = allUsers.findIndex((u) => u.id === user.id);
            if (myIndex !== -1) {
                const freshUser = allUsers[myIndex];
                user.tokens = freshUser.tokens;
                user.score = freshUser.score;
                saveUserSession(user);
                updateNavigationHeader();
                if (rankEl) rankEl.textContent = `#${myIndex + 1} sur ${allUsers.length}`;
            }
        }
    }

    if (pseudoEl) pseudoEl.value = user.pseudo;
    if (tokensEl) tokensEl.textContent = `${user.tokens}`;
    if (scoreEl) scoreEl.textContent = `${user.score} pts`;

    const score = user.score || 0;
    const level = Math.floor(score / 100) + 1;
    const progressPercent = score % 100;

    if (levelLabelEl) {
        levelLabelEl.textContent = `Niveau ${level} (${progressPercent} / 100 pts vers le niveau ${level + 1})`;
    }
    if (progressFillEl) {
        progressFillEl.style.width = `${progressPercent}%`;
    }
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
        if (!rulesList) return;
        const li = rulesList.querySelector(`[data-rule="${ruleName}"]`);
        if (!li) return;
        const icon = li.querySelector('i');
        li.classList.toggle('rule-valid', isValid);
        li.classList.toggle('rule-invalid', !isValid);
        if (icon) {
            icon.className = isValid ? 'fa-regular fa-circle-check' : 'fa-regular fa-circle-xmark';
        }
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
        } else if (forbiddenCharsRegex.test(pseudo)) {
            setFieldError('pseudo-error', 'Le pseudo contient des caractères interdits.');
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
            setFieldError('password-error', 'Le mot de passe ne respecte pas toutes les règles.');
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
            pseudo,
            email,
            password,
            firstname: firstname || null,
            lastname: lastname || null,
            tokens: 5,
            score: 0
        };

        try {
            if (submitBtn) submitBtn.disabled = true;

            const { data: existingPseudo, error: pseudoErr } = await supabaseClient
                .from('users')
                .select('id')
                .eq('pseudo', pseudo);

            if (pseudoErr) throw pseudoErr;
            if (existingPseudo && existingPseudo.length > 0) {
                setFieldError('pseudo-error', 'Ce pseudo est déjà utilisé.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            const { data: existingEmail, error: emailErr } = await supabaseClient
                .from('users')
                .select('id')
                .eq('email', email);

            if (emailErr) throw emailErr;
            if (existingEmail && existingEmail.length > 0) {
                setFieldError('email-error', 'Cette adresse mail est déjà utilisée.');
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
            console.error('Erreur inscription Supabase :', err);
            setFieldError('form-error', `Erreur lors de la création du compte (${err.message || 'accès refusé'}).`);
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

        if (!pseudo) {
            setFieldError('login-pseudo-error', 'Veuillez entrer votre pseudo.');
            isValid = false;
        }
        if (!password) {
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
                setFieldError('login-form-error', 'Identifiants incorrects.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            saveUserSession(users[0]);
            window.location.href = '../user/discussion.html';
        } catch (err) {
            console.error('Erreur connexion Supabase :', err);
            setFieldError('login-form-error', 'Impossible de contacter la base de données.');
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}