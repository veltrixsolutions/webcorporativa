document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const alertBox = document.getElementById('alert-box');
    const captchaQuestion = document.getElementById('captcha-question');
    const captchaAnswer = document.getElementById('captcha-answer');
    
    let captchaCorrect = 0;

    // Generar Captcha Dinámico
    function generateCaptcha() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        captchaCorrect = num1 + num2;
        captchaQuestion.textContent = `${num1} + ${num2} = `;
        captchaAnswer.value = '';
    }

    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `alert ${type}`;
        alertBox.classList.remove('hidden');
    }

    generateCaptcha();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.classList.add('hidden');

        // Validar Captcha
        if (parseInt(captchaAnswer.value) !== captchaCorrect) {
            showAlert("El captcha es incorrecto. Intenta de nuevo.", "error");
            generateCaptcha();
            return;
        }

        const usuario = document.getElementById('usuario').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!usuario || !password) {
            showAlert("Todos los campos son obligatorios.", "error");
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showAlert(data.error || "Ocurrió un error al iniciar sesión.", "error");
                generateCaptcha();
            } else {
                // Guardar Token y redireccionar a la pantalla principal
                localStorage.setItem('jwt_token', data.token);
                window.location.href = '/index.html'; // Redirige a la base protegida
            }
        } catch (error) {
            console.error('Error en la petición:', error);
            window.location.href = '/error500.html'; // Redirección a página de error
        }
    });
});