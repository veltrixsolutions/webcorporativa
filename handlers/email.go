// handlers/email.go
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
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

	// VALIDACIÓN CRÍTICA: Evita que el servidor se detenga si falta la API Key
	if apiKey == "" {
		return fmt.Errorf("la variable RESEND_API_KEY está vacía en el servidor")
	}

	client := resend.NewClient(apiKey)

	link := fmt.Sprintf("%s/api/verificar-email?token=%s", appUrl, token)

	// IMPORTANTE: Resend es muy estricto con el formato del 'From'
	// Asegúrate de que no haya espacios extraños.
	params := &resend.SendEmailRequest{
		From:    "onboarding@resend.dev", // Simplificado para asegurar compatibilidad
		To:      []string{correoDestino},
		Subject: "Activación de Cuenta - Veltrix",
		Html: fmt.Sprintf(`
			<div style="font-family: sans-serif; padding: 20px; color: #333; background-color: #f9fafb;">
				<div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: auto; border: 1px solid #e5e7eb;">
					<h2 style="color: #4285F4; text-align: center;">Bienvenido a Veltrix</h2>
					<p>Hola <b>%s</b>,</p>
					<p>Para completar el registro de tu cuenta corporativa, por favor confirma tu correo haciendo clic en el botón:</p>
					<div style="text-align: center; margin: 30px 0;">
						<a href="%s" style="background-color: #34A853; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar mi cuenta</a>
					</div>
					<p style="font-size: 0.8rem; color: #9ca3af; text-align: center;">Si no creaste esta cuenta, ignora este mensaje.</p>
				</div>
			</div>
		`, nombreUsuario, link),
	}

	sent, err := client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("error de Resend API: %v", err)
	}

	log.Printf("Correo enviado exitosamente. ID: %s", sent.Id)
	return nil
}
