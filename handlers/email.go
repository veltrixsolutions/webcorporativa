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

// CORRECCIÓN: Ahora recibimos también el 'password' temporal
func EnviarCorreoVerificacion(correoDestino, nombreUsuario, token, password string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	appUrl := os.Getenv("APP_URL")

	client := resend.NewClient(apiKey)

	link := fmt.Sprintf("%s/api/verificar-email?token=%s", appUrl, token)

	params := &resend.SendEmailRequest{
		From:    "Veltrix Solutions <no-reply@kevin.rodnix.com.mx>",
		To:      []string{correoDestino},
		Subject: "Bienvenido a Veltrix - Credenciales de Acceso",
		Html: fmt.Sprintf(`
		<div style="background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px 20px; color: #333333;">
			<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
				
				<div style="background-color: #1a56db; padding: 25px; text-align: center;">
					<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px;">Veltrix Solutions</h1>
				</div>
				
				<div style="padding: 40px 30px;">
					<h2 style="font-size: 20px; color: #1f2937; margin-top: 0;">Hola, %s</h2>
					<p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
						El administrador ha creado tu perfil de acceso para la plataforma corporativa. A continuación, encontrarás tus credenciales temporales.
					</p>

					<div style="background-color: #f8fafc; border-left: 4px solid #1a56db; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
						<p style="margin: 0 0 10px 0; font-size: 15px; color: #334155;">
							<strong>Usuario:</strong> 
							<span style="font-family: monospace; font-size: 16px; background: #e2e8f0; padding: 3px 8px; border-radius: 4px; margin-left: 5px;">%s</span>
						</p>
						<p style="margin: 0; font-size: 15px; color: #334155;">
							<strong>Contraseña:</strong> 
							<span style="font-family: monospace; font-size: 16px; background: #e2e8f0; padding: 3px 8px; border-radius: 4px; margin-left: 5px;">%s</span>
						</p>
					</div>

					<p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
						Para activar tu cuenta y poder iniciar sesión, es indispensable que verifiques tu correo haciendo clic en el siguiente botón:
					</p>

					<div style="text-align: center; margin: 35px 0;">
						<a href="%s" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Verificar mi cuenta</a>
					</div>

					<p style="font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 0;">
						<strong style="color: #dc2626;">Atención:</strong> Por motivos de seguridad, el sistema te solicitará cambiar esta contraseña temporal obligatoriamente durante tu primer inicio de sesión.
					</p>
				</div>
				
				<div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
					<p style="margin: 0;">&copy; 2026 Veltrix Solutions. Todos los derechos reservados.</p>
					<p style="margin: 5px 0 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>
				</div>
				
			</div>
		</div>
		`, nombreUsuario, nombreUsuario, password, link), // Pasamos los parámetros al Sprintf
	}

	_, err := client.Emails.Send(params)
	return err
}
