// handlers/email.go
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

func GenerarToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func EnviarCorreoVerificacion(correoDestino, nombreUsuario, token string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	appUrl := os.Getenv("APP_URL")

	client := resend.NewClient(apiKey)

	link := fmt.Sprintf("%s/api/verificar-email?token=%s", appUrl, token)

	// Nota: Resend en modo gratuito requiere que envíes desde "onboarding@resend.dev"
	// hasta que verifiques un dominio propio.
	params := &resend.SendEmailRequest{
		From:    "Veltrix Solutions <onboarding@resend.dev>",
		To:      []string{correoDestino},
		Subject: "Activación de Cuenta - Veltrix",
		Html: fmt.Sprintf(`
			<div style="font-family: sans-serif; padding: 20px; color: #333; background-color: #f9fafb;">
				<div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: auto; border: 1px solid #e5e7eb;">
					<h2 style="color: #4285F4; text-align: center;">Bienvenido a Veltrix</h2>
					<p>Hola <b>%s</b>,</p>
					<p>Para completar el registro de tu cuenta corporativa, por favor confirma tu dirección de correo haciendo clic en el siguiente botón:</p>
					<div style="text-align: center; margin: 30px 0;">
						<a href="%s" style="background-color: #34A853; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar mi cuenta</a>
					</div>
					<p style="font-size: 0.8rem; color: #9ca3af; text-align: center;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
				</div>
			</div>
		`, nombreUsuario, link),
	}

	_, err := client.Emails.Send(params)
	return err
}
