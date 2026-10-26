(() => {
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
            tokens: user.tokens ?? 5,
            score: user.score ?? 0,
            session_token: user.session_token
        };
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
    }

    async function verifyAndSyncSession() {
        const localUser = getCurrentUser();
        if (!localUser || !localUser.session_token || !supabaseClient) return null;

        const { data, error } = await supabaseClient.rpc('get_my_profile', {
            p_session_token: localUser.session_token
        });

        if (error || !data) {
            localStorage.removeItem('currentUser');
            return null;
        }

        const verifiedUser = {
            id: data.id,
            pseudo: data.pseudo,
            tokens: data.tokens,
            score: data.score,
            rank: data.rank,
            total: data.total,
            session_token: localUser.session_token
        };
        saveUserSession(verifiedUser);
        return verifiedUser;
    }

    document.addEventListener('DOMContentLoaded', async () => {
        applySavedTheme();
        await verifyAndSyncSession();
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

        if (user && user.session_token) {
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

    async function initRankingPage() {
        let currentDifficulty = 'easy';

        const questionEl = document.getElementById('quiz-question');
        const answerForm = document.getElementById('quiz-form');
        const answerInput = document.getElementById('quiz-answer');
        const feedbackEl = document.getElementById('quiz-feedback');
        const userStatusEl = document.getElementById('quiz-user-status');
        const diffButtons = document.querySelectorAll('.difficulty-btn');

        async function loadNewServerQuestion() {
            const user = getCurrentUser();
            if (!user || !user.session_token) {
                if (questionEl) questionEl.textContent = 'Connexion requise pour lancer un défi.';
                if (userStatusEl) userStatusEl.textContent = 'Connectez-vous pour gagner des jetons et des points au classement.';
                if (answerInput) answerInput.disabled = true;
                return;
            }

            if (answerInput) answerInput.disabled = false;
            if (userStatusEl) {
                userStatusEl.textContent = `Connecté en tant que ${user.pseudo} | Jetons : ${user.tokens} | Score : ${user.score} pts`;
            }

            const { data, error } = await supabaseClient.rpc('request_math_quiz', {
                p_session_token: user.session_token,
                p_difficulty: currentDifficulty
            });

            if (error || !data) {
                if (questionEl) questionEl.textContent = 'Erreur de chargement du quiz.';
                return;
            }

            if (questionEl) questionEl.textContent = data.question;
        }

        diffButtons.forEach((btn) => {
            btn.addEventListener('click', async () => {
                diffButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                currentDifficulty = btn.getAttribute('data-diff') || 'easy';
                if (feedbackEl) {
                    feedbackEl.textContent = '';
                    feedbackEl.className = 'quiz-feedback';
                }
                await loadNewServerQuestion();
            });
        });

        if (answerForm) {
            answerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = getCurrentUser();
                if (!user || !user.session_token) return;

                const userVal = parseInt(answerInput.value.trim(), 10);
                if (Number.isNaN(userVal)) {
                    feedbackEl.textContent = 'Veuillez saisir un nombre entier valide.';
                    feedbackEl.className = 'quiz-feedback error';
                    return;
                }

                const { data, error } = await supabaseClient.rpc('submit_math_quiz', {
                    p_session_token: user.session_token,
                    p_answer: userVal
                });

                if (error || !data) {
                    feedbackEl.textContent = 'Erreur lors de la vérification serveur.';
                    feedbackEl.className = 'quiz-feedback error';
                    return;
                }

                user.tokens = data.tokens;
                user.score = data.score;
                saveUserSession(user);
                updateNavigationHeader();

                if (data.correct) {
                    feedbackEl.textContent = `Bravo ! +${data.added_tokens} jeton(s) et +${data.added_points} points crédités par le serveur.`;
                    feedbackEl.className = 'quiz-feedback success';
                } else {
                    feedbackEl.textContent = `Raté ! La bonne réponse était ${data.expected}. Voici un nouveau calcul.`;
                    feedbackEl.className = 'quiz-feedback error';
                }

                answerInput.value = '';
                await loadNewServerQuestion();
                await loadLeaderboardTable();
            });
        }

        await loadNewServerQuestion();
        await loadLeaderboardTable();
    }

    async function loadLeaderboardTable() {
        const tbody = document.getElementById('ranking-tbody');
        if (!tbody || !supabaseClient) return;

        const { data, error } = await supabaseClient.rpc('get_leaderboard');

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
        const rootPrefix = document.body.getAttribute('data-root') || '..';
        const verifiedUser = await verifyAndSyncSession();

        if (!verifiedUser) {
            window.location.href = `${rootPrefix}/auth/login.html`;
            return;
        }

        const pseudoEl = document.getElementById('profile-pseudo');
        const tokensEl = document.getElementById('profile-tokens');
        const scoreEl = document.getElementById('profile-score');
        const rankEl = document.getElementById('profile-rank');
        const levelLabelEl = document.getElementById('profile-level-label');
        const progressFillEl = document.getElementById('profile-progress-fill');

        if (pseudoEl) pseudoEl.value = verifiedUser.pseudo;
        if (tokensEl) tokensEl.textContent = `${verifiedUser.tokens}`;
        if (scoreEl) scoreEl.textContent = `${verifiedUser.score} pts`;
        if (rankEl) rankEl.textContent = `#${verifiedUser.rank} sur ${verifiedUser.total}`;

        const score = verifiedUser.score || 0;
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

            try {
                if (submitBtn) submitBtn.disabled = true;

                const { data, error } = await supabaseClient.rpc('register_user', {
                    p_pseudo: pseudo,
                    p_email: email,
                    p_password: password,
                    p_firstname: firstname || null,
                    p_lastname: lastname || null
                });

                if (error) throw error;

                if (data && data.session_token) {
                    saveUserSession(data);
                    window.location.href = '../user/discussion.html';
                }
            } catch (err) {
                setFieldError('form-error', err.message || 'Erreur lors de la création du compte.');
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

                const { data, error } = await supabaseClient.rpc('login_user', {
                    p_pseudo: pseudo,
                    p_password: password
                });

                if (error) throw error;

                if (data && data.session_token) {
                    saveUserSession(data);
                    window.location.href = '../user/discussion.html';
                }
            } catch (err) {
                setFieldError('login-form-error', err.message || 'Identifiants incorrects.');
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
})();
