/* ============================================================
   Messageri(re) - script.js
   Règles de validation des formulaires (sécurité de base côté client)

   IMPORTANT : cette validation côté client est un confort pour
   l'utilisateur (retour immédiat), elle ne remplace PAS une
   validation côté serveur. Quand Supabase sera branché, toutes
   ces règles devront être revérifiées côté back (ou via les
   règles de Supabase Auth / une policy) avant d'écrire en base.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        initRegisterForm(registerForm);
    }
});

function initRegisterForm(form) {
    const pseudoInput = document.getElementById('pseudo');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');

    const rulesList = document.getElementById('password-rules');

    // Caractères interdits dans le mot de passe : / \ < > " ' ` ;
    // (évite les soucis d'injection basique, de casse d'URL, etc.)
    const forbiddenCharsRegex = /[\/\\<>'"`;]/;
    const specialCharsRegex = /[!@#$%^&*()_\-+=\[\]{}.,?]/;

    // Met à jour le checklist visuel pendant que l'utilisateur tape
    passwordInput.addEventListener('input', () => {
        const value = passwordInput.value;
        const results = checkPasswordRules(value);
        updateRuleDisplay('length', results.length);
        updateRuleDisplay('uppercase', results.uppercase);
        updateRuleDisplay('number', results.number);
        updateRuleDisplay('special', results.special);

        // On n'affiche pas une liste de caractères interdits en permanence :
        // on prévient seulement si l'utilisateur en a effectivement tapé un.
        const offendingChars = getForbiddenChars(value);
        if (offendingChars.length > 0) {
            const list = offendingChars.map(c => `« ${c} »`).join(', ');
            setFieldError('password-error', `Caractère non autorisé : ${list}`);
        } else {
            clearFieldError('password-error');
        }
    });

    passwordConfirmInput.addEventListener('input', () => {
        clearFieldError('password-confirm-error');
    });

    pseudoInput.addEventListener('input', () => clearFieldError('pseudo-error'));
    emailInput.addEventListener('input', () => clearFieldError('email-error'));

    function checkPasswordRules(value) {
        return {
            length: value.length >= 16,
            uppercase: /[A-Z]/.test(value),
            number: /[0-9]/.test(value),
            special: specialCharsRegex.test(value),
            noForbiddenChars: getForbiddenChars(value).length === 0
        };
    }

    // Retourne la liste (sans doublons) des caractères interdits
    // réellement présents dans la valeur, pour un message d'erreur ciblé.
    function getForbiddenChars(value) {
        const matches = value.match(new RegExp(forbiddenCharsRegex.source, 'g'));
        return matches ? [...new Set(matches)] : [];
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
        // Vérification simple côté client, Supabase validera aussi côté serveur.
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFieldError('form-error');

        let isFormValid = true;

        // --- Pseudo ---
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

        // --- Email ---
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

        // --- Mot de passe ---
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

        // --- Confirmation du mot de passe ---
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

        // Prénom / Nom (optionnels, pas de contrainte de sécurité particulière,
        // juste un nettoyage des espaces superflus)
        const firstname = document.getElementById('firstname').value.trim();
        const lastname = document.getElementById('lastname').value.trim();

        const registrationData = {
            pseudo,
            email,
            password,
            firstname: firstname || null,
            lastname: lastname || null
        };

        /* ------------------------------------------------------------
           TODO (Supabase) :
           Remplacer ce bloc par l'appel réel à Supabase, par exemple :

           const { data, error } = await supabase.auth.signUp({
               email: registrationData.email,
               password: registrationData.password
           });

           if (error) {
               setFieldError('form-error', "Une erreur est survenue : " + error.message);
               return;
           }

           // Puis insérer les infos complémentaires dans la table "profiles" :
           await supabase.from('profiles').insert({
               id: data.user.id,
               pseudo: registrationData.pseudo,
               firstname: registrationData.firstname,
               lastname: registrationData.lastname
           });

           // Puis rediriger l'utilisateur (ex: vers login.html ou l'accueil).
           ------------------------------------------------------------ */

        console.log('Formulaire valide, données prêtes pour Supabase :', registrationData);
        // Simulation temporaire en attendant le branchement Supabase :
        setFieldError('form-error', '');
        alert('Inscription simulée avec succès (branchement base de données à venir).');
    });
}
