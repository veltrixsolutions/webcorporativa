// static/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('login-form');
    const formChangePwd = document.getElementById('change-pwd-form');
    const alertBox = document.getElementById('alert-box');
    const tituloLogin = document.getElementById('titulo-login');
    const subtituloLogin = document.getElementById('subtitulo-login');
    
    // Variable para guardar el ID del usuario mientras cambia su contraseña
    let pendingUserId = null;

    // --- FUNCIONES DE SEGURIDAD Y VALIDACIÓN ---

    // Valida que el usuario no contenga código malicioso, pero PERMITE espacios y acentos
    const isValidUsername = (username) => {
        const usernameRegex = /^[a-zA-Z0-9_.@áéíóúÁÉÍÓÚñÑ\s-]{3,50}$/;
        return usernameRegex.test(username);
    };

    // Política de Contraseña Enterprise: Min 8 chars, 1 Mayúscula, 1 Minúscula, 1 Número, 1 Carácter Especial
    const isStrongPassword = (password) => {
        const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,64}$/;
        return strongPwdRegex.test(password);
    };

    // Limpia los valores de los inputs de contraseña por seguridad en memoria
    const clearPasswords = () => {
        document.getElementById('password').value = '';
        document.getElementById('new-pwd').value = '';
        document.getElementById('confirm-pwd').value = '';
    };

    function showAlert(message, type) {
        const icon = type === 'error' ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-check-circle"></i>';
        alertBox.innerHTML = `${icon} ${message}`;
        alertBox.className = `alert ${type}`;
        alertBox.classList.remove('hidden');
    }

    // Utilidad para restaurar el estado de los botones
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

        // 1. Validaciones iniciales
        if (!inputUsuario || !inputPassword) {
            showAlert("Todos los campos son obligatorios.", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            return;
        }

        // 2. Límite de longitud y caracteres prohibidos (Anti-XSS / SQLi)
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

        // 3. Validación de reCAPTCHA
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
                // Validación para Cambio Obligatorio de Contraseña (Status 423 Locked)
                if (response.status === 423 && data.requiere_cambio) {
                    alertBox.classList.add('hidden'); 
                    
                    formLogin.style.display = 'none';
                    tituloLogin.textContent = 'Actualizar Contraseña';
                    subtituloLogin.style.display = 'none'; 
                    formChangePwd.style.display = 'block';
                    
                    pendingUserId = data.usuario_id;
                    grecaptcha.reset();
                    clearPasswords(); // Limpiamos el password ingresado
                } else {
                    showAlert(data.error || "Credenciales inválidas o error de sistema.", "error");
                    grecaptcha.reset();
                    clearPasswords();
                }
            } else {
                // Éxito total: Guardamos el token
                localStorage.setItem('jwt_token', data.token);
                // NOTA DE SEGURIDAD: Limpiamos la URL antes de redirigir para no dejar rastro
                window.history.replaceState(null, null, window.location.pathname);
                window.location.href = '/dashboard.html'; 
            }
        } catch (error) {
            console.error('Error de red:', error);
            showAlert("Error de conexión al servidor corporativo.", "error");
            clearPasswords();
        } finally {
            restoreButton(btnSubmit, originalBtnHtml);
        }
    });


    // --- FLUJO 2: CAMBIO DE CONTRASEÑA ---
    formChangePwd.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        const btnSubmit = formChangePwd.querySelector('button[type="submit"]');
        const originalBtnHtml = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Actualizando...</span>';
        btnSubmit.disabled = true;

        const newPwd = document.getElementById('new-pwd').value;
        const confirmPwd = document.getElementById('confirm-pwd').value;

        // 1. Validación de coincidencia
        if (newPwd !== confirmPwd) {
            showAlert("Las contraseñas no coinciden. Intenta de nuevo.", "error");
            restoreButton(btnSubmit, originalBtnHtml);
            return;
        }

        // 2. Validación estricta de fortaleza de contraseña
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

    // Botón Cancelar (Regresa al login normal y limpia estado)
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
});