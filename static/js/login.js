// static/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('login-form');
    const formChangePwd = document.getElementById('change-pwd-form');
    const formForgotPwd = document.getElementById('forgot-pwd-form');
    const alertBox = document.getElementById('alert-box');
    const tituloLogin = document.getElementById('titulo-login');
    const subtituloLogin = document.getElementById('subtitulo-login');
    
    let pendingUserId = null;

    const isValidUsername = (username) => /^[a-zA-Z0-9_.@áéíóúÁÉÍÓÚñÑ\s-]{3,50}$/.test(username);
    const isStrongPassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,64}$/.test(password);

    const clearPasswords = () => {
        if(document.getElementById('password')) document.getElementById('password').value = '';
        if(document.getElementById('new-pwd')) document.getElementById('new-pwd').value = '';
        if(document.getElementById('confirm-pwd')) document.getElementById('confirm-pwd').value = '';
    };

    function showAlert(message, type) {
        const icon = type === 'error' ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-check-circle"></i>';
        alertBox.innerHTML = `${icon} ${message}`;
        alertBox.className = `alert ${type}`;
        alertBox.classList.remove('hidden');
    }

    function restoreButton(button, html) {
        button.innerHTML = html;
        button.disabled = false;
    }

    // --- FLUJO 1: LOGIN NORMAL ---
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        const btnSubmit = formLogin.querySelector('button[type="submit"]');
        const originalBtnHtml = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verificando...</span>';
        btnSubmit.disabled = true;

        const inputUsuario = document.getElementById('usuario').value.trim();
        const inputPassword = document.getElementById('password').value.trim();
        const captchaResponse = grecaptcha.getResponse();

        if (!inputUsuario || !inputPassword) {
            showAlert("Todos los campos son obligatorios.", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            return;
        }

        if (inputUsuario.length > 50 || inputPassword.length > 100) {
            showAlert("La longitud de los datos excede el límite permitido.", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            clearPasswords();
            return;
        }

        if (!isValidUsername(inputUsuario)) {
            showAlert("El nombre de usuario contiene caracteres no permitidos.", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            clearPasswords();
            return;
        }

        if (captchaResponse.length === 0) {
            showAlert("Por favor, verifica que no eres un robot.", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    usuario: inputUsuario, 
                    password: inputPassword,
                    captcha: captchaResponse 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 423 && data.requiere_cambio) {
                    alertBox.classList.add('hidden'); 
                    formLogin.style.display = 'none';
                    tituloLogin.textContent = 'Actualizar Contraseña';
                    subtituloLogin.style.display = 'none'; 
                    formChangePwd.style.display = 'block';
                    
                    pendingUserId = data.usuario_id;
                    grecaptcha.reset();
                    clearPasswords(); 
                } else {
                    showAlert(data.error || "Credenciales inválidas o error de sistema.", "error");
                    grecaptcha.reset();
                    clearPasswords();
                }
            } else {
                // GUARDAMOS EL TOKEN EN SESSIONSTORAGE (AISLADO POR PESTAÑA)
                sessionStorage.setItem('jwt_token', data.token);
                window.history.replaceState(null, null, window.location.pathname);
                window.location.href = '/dashboard.html'; 
            }
        } catch (error) {
            showAlert("Error de conexión al servidor corporativo.", "error");
            clearPasswords();
        } finally {
            restoreButton(btnSubmit, originalBtnHtml);
        }
    });

    // --- FLUJO 2: OLVIDÉ MI CONTRASEÑA ---
    document.getElementById('link-forgot-pwd').addEventListener('click', (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');
        formLogin.style.display = 'none';
        
        tituloLogin.textContent = 'Recuperar Acceso';
        subtituloLogin.style.display = 'none';
        formForgotPwd.style.display = 'block';
    });

    document.getElementById('btn-cancel-forgot').addEventListener('click', () => {
        formForgotPwd.reset();
        formForgotPwd.style.display = 'none';
        
        tituloLogin.textContent = 'Iniciar Sesión';
        subtituloLogin.style.display = 'block';
        formLogin.style.display = 'block';
        alertBox.classList.add('hidden');
    });

    formForgotPwd.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        const btnSubmit = formForgotPwd.querySelector('button[type="submit"]');
        const originalBtnHtml = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Enviando...</span>';
        btnSubmit.disabled = true;

        const email = document.getElementById('recovery-email').value.trim();

        try {
            const response = await fetch('/api/recuperar-pwd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: email })
            });

            // Práctica de seguridad: Mostrar éxito incluso si el correo no existe
            showAlert("Si el correo está registrado, recibirás un enlace de recuperación en breve.", "success");
            formForgotPwd.reset();

        } catch (error) {
            showAlert("Fallo de conexión al intentar enviar el correo.", "error");
        } finally {
            restoreButton(btnSubmit, originalBtnHtml);
        }
    });

    // --- FLUJO 3: CAMBIO DE CONTRASEÑA OBLIGATORIO ---
    formChangePwd.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        const btnSubmit = formChangePwd.querySelector('button[type="submit"]');
        const originalBtnHtml = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Actualizando...</span>';
        btnSubmit.disabled = true;

        const newPwd = document.getElementById('new-pwd').value;
        const confirmPwd = document.getElementById('confirm-pwd').value;

        if (newPwd !== confirmPwd) {
            showAlert("Las contraseñas no coinciden. Intenta de nuevo.", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            return;
        }

        if (!isStrongPassword(newPwd)) {
            showAlert("La contraseña debe tener mínimo 8 caracteres, incluir una mayúscula, un número y un símbolo especial (@, #, !, etc).", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            return;
        }

        try {
            const response = await fetch('/api/cambiar-pwd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    usuario_id: pendingUserId, 
                    nueva_pwd: newPwd 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showAlert(data.error || "No se pudo actualizar la configuración de seguridad.", "error");
            } else {
                showAlert("Contraseña actualizada con éxito. Ya puedes iniciar sesión de forma segura.", "success");
                
                formChangePwd.reset();
                formChangePwd.style.display = 'none';
                
                tituloLogin.textContent = 'Iniciar Sesión';
                subtituloLogin.style.display = 'block'; 
                formLogin.style.display = 'block';
                
                pendingUserId = null;
            }
        } catch (error) {
            showAlert("Fallo de conexión al intentar actualizar la seguridad.", "error");
        } finally {
            clearPasswords();
            restoreButton(btnSubmit, originalBtnHtml);
        }
    });

    if(document.getElementById('btn-cancel-change')) {
        document.getElementById('btn-cancel-change').addEventListener('click', () => {
            formChangePwd.reset();
            clearPasswords();
            formChangePwd.style.display = 'none';
            tituloLogin.textContent = 'Iniciar Sesión';
            subtituloLogin.style.display = 'block'; 
            formLogin.style.display = 'block';
            alertBox.classList.add('hidden');
            pendingUserId = null;
        });
    }
});