document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const alertBox = document.getElementById('alert-box');

    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `alert ${type}`;
        alertBox.classList.remove('hidden');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        const usuario = document.getElementById('usuario').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Obtener la respuesta del reCAPTCHA de Google
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    usuario: usuario, 
                    password: password,
                    captcha: captchaResponse // Enviamos el token al backend
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showAlert(data.error || "Ocurrió un error al iniciar sesión.", "error");
                grecaptcha.reset(); // Reiniciar el captcha si hay error
            } else {
                localStorage.setItem('jwt_token', data.token);
                window.location.href = '/dashboard.html'; 
            }
        } catch (error) {
            console.error('Error en la petición:', error);
            window.location.href = '/error500.html'; 
        }
    });
});