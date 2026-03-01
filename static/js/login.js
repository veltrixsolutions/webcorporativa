// static/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('login-form');
    const formChangePwd = document.getElementById('change-pwd-form');
    const alertBox = document.getElementById('alert-box');
    const tituloLogin = document.getElementById('titulo-login');
    
    // Variable para guardar el ID del usuario mientras cambia su contraseña
    let pendingUserId = null;

    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `alert ${type}`;
        alertBox.classList.remove('hidden');
    }

    // --- FLUJO 1: LOGIN NORMAL ---
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        const usuario = document.getElementById('usuario').value.trim();
        const password = document.getElementById('password').value.trim();
        const captchaResponse = grecaptcha.getResponse();

        if (!usuario || !password) {
            showAlert("Todos los campos son obligatorios.", "error");
            return;
        }

        if (captchaResponse.length === 0) {
            showAlert("Por favor, verifica que no eres un robot.", "error");
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    usuario: usuario, 
                    password: password,
                    captcha: captchaResponse 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Validación para Cambio Obligatorio de Contraseña (Status 423 Locked)
                if (response.status === 423 && data.requiere_cambio) {
                    showAlert(data.error, "error");
                    
                    // Ocultar Login y Mostrar Cambio de Contraseña
                    formLogin.style.display = 'none';
                    tituloLogin.textContent = 'Actualizar Contraseña';
                    formChangePwd.style.display = 'block';
                    
                    // Guardamos el ID que nos mandó el servidor
                    pendingUserId = data.usuario_id;
                    grecaptcha.reset();
                } else {
                    // Errores normales (Credenciales, falta verificar email, etc)
                    showAlert(data.error || "Ocurrió un error al iniciar sesión.", "error");
                    grecaptcha.reset();
                }
            } else {
                // Éxito total
                localStorage.setItem('jwt_token', data.token);
                window.location.href = '/dashboard.html'; 
            }
        } catch (error) {
            console.error('Error en la petición:', error);
            window.location.href = '/error500.html'; 
        }
    });

    // --- FLUJO 2: CAMBIO DE CONTRASEÑA ---
    formChangePwd.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        const newPwd = document.getElementById('new-pwd').value;
        const confirmPwd = document.getElementById('confirm-pwd').value;

        if (newPwd !== confirmPwd) {
            showAlert("Las contraseñas no coinciden. Intenta de nuevo.", "error");
            return;
        }

        if (newPwd.length < 6) {
            showAlert("La contraseña debe tener al menos 6 caracteres.", "error");
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
                showAlert(data.error || "No se pudo actualizar la contraseña.", "error");
            } else {
                // Contraseña actualizada: Regresar al login con mensaje de éxito
                showAlert("Contraseña actualizada con éxito. Por favor inicia sesión.", "success");
                formChangePwd.reset();
                formChangePwd.style.display = 'none';
                
                tituloLogin.textContent = 'Iniciar Sesión';
                formLogin.style.display = 'block';
                document.getElementById('password').value = ''; // Limpiar la contraseña vieja
                pendingUserId = null;
            }
        } catch (error) {
            showAlert("Error de conexión al servidor.", "error");
        }
    });

    // Botón Cancelar (Regresa al login normal)
    document.getElementById('btn-cancel-change').addEventListener('click', () => {
        formChangePwd.reset();
        formChangePwd.style.display = 'none';
        tituloLogin.textContent = 'Iniciar Sesión';
        formLogin.style.display = 'block';
        alertBox.classList.add('hidden');
        pendingUserId = null;
    });
});