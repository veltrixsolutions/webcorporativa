// handlers/email.go
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/smtp"
	"os"
)

// GenerarToken crea una cadena segura y aleatoria de 32 caracteres
func GenerarToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// EnviarCorreoVerificacion manda el email usando el SMTP configurado
func EnviarCorreoVerificacion(correoDestino, nombreUsuario, token string) error {
	from := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASS")
	smtpHost := "smtp.gmail.com" // Servidor de Gmail
	smtpPort := "587"

	appUrl := os.Getenv("APP_URL")
	if appUrl == "" {
		appUrl = "http://localhost:8080"
	}

	// Link que el usuario debe clickear
	link := fmt.Sprintf("%s/api/verificar-email?token=%s", appUrl, token)

	auth := smtp.PlainAuth("", from, password, smtpHost)

	subject := "Subject: Activacion de Cuenta Corporativa Veltrix\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f3f4f6; color: #333;">
			<div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
				<h2 style="color: #4285F4;">Bienvenido a Veltrix Solutions</h2>
				<p>Hola <b>%s</b>,</p>
				<p>El Super Administrador ha creado tu cuenta corporativa. Para poder iniciar sesión, necesitas verificar este correo.</p>
				<div style="text-align: center; margin: 30px 0;">
					<a href="%s" style="background-color: #34A853; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Validar mi cuenta</a>
				</div>
				<p style="font-size: 0.9rem; color: #6b7280;">Por razones de seguridad, se te pedirá que cambies tu contraseña temporal durante tu primer inicio de sesión.</p>
			</div>
		</div>
	`, nombreUsuario, link)

	msg := []byte(subject + mime + body)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{correoDestino}, msg)
	return err
}
