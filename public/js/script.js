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

    form.addEventListener('submit', (event) => {
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
            pseudo,
            email,
            password,
            firstname: firstname || null,
            lastname: lastname || null
        };

        console.log('Formulaire valide, données prêtes pour Supabase :', registrationData);
        setFieldError('form-error', '');

        // TODO CHANGE
        alert('Inscription simulée avec succès (branchement base de données à venir).');
    });
}
