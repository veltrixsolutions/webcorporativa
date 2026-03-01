// handlers/auth.go
package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Usuario  string `json:"usuario"`
	Password string `json:"password"`
	Captcha  string `json:"captcha"`
}

type LoginResponse struct {
	Token   string `json:"token"`
	Mensaje string `json:"mensaje"`
}

type JwtCustomClaims struct {
	UsuarioID  int    `json:"id"`
	Nombre     string `json:"nombre"`
	PerfilID   int    `json:"perfil_id"`
	RutaImagen string `json:"ruta_imagen"`
	jwt.RegisteredClaims
}

type RecaptchaResponse struct {
	Success    bool     `json:"success"`
	Challenge  string   `json:"challenge_ts"`
	Hostname   string   `json:"hostname"`
	ErrorCodes []string `json:"error-codes"`
}

// Estructura para el cambio de contraseña obligatorio
type ChangePwdReq struct {
	UsuarioID int    `json:"usuario_id"`
	NuevaPwd  string `json:"nueva_pwd"`
}

// --- 1. FUNCIÓN DE LOGIN PRINCIPAL ---
func Login(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := new(LoginRequest)
		if err := c.Bind(req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Formato de petición inválido"})
		}

		// Validar reCAPTCHA
		recaptchaSecret := os.Getenv("RECAPTCHA_SECRET")
		if recaptchaSecret != "" {
			resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify",
				url.Values{"secret": {recaptchaSecret}, "response": {req.Captcha}})
			if err == nil {
				defer resp.Body.Close()
				var googleResp RecaptchaResponse
				json.NewDecoder(resp.Body).Decode(&googleResp)
				if !googleResp.Success {
					return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Verificación de reCAPTCHA fallida."})
				}
			}
		}

		// Buscar usuario en BD incluyendo banderas de seguridad
		var id, idPerfil, idEstadoUsuario int
		var hashPwd, strRutaImagen sql.NullString
		var bitEmailVerificado, bitForzarCambioPwd bool

		query := `SELECT id, idPerfil, strPwd, idEstadoUsuario, strRutaImagen, bitEmailVerificado, bitForzarCambioPwd 
				  FROM Usuario WHERE strNombreUsuario = $1`

		err := db.QueryRow(query, req.Usuario).Scan(&id, &idPerfil, &hashPwd, &idEstadoUsuario, &strRutaImagen, &bitEmailVerificado, &bitForzarCambioPwd)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Credenciales incorrectas"})
		}

		if idEstadoUsuario != 1 {
			return c.JSON(http.StatusForbidden, map[string]string{"error": "El usuario se encuentra inactivo"})
		}

		// REGLA: Bloqueo si el email no está verificado
		if !bitEmailVerificado {
			return c.JSON(http.StatusForbidden, map[string]string{"error": "Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada."})
		}

		err = bcrypt.CompareHashAndPassword([]byte(hashPwd.String), []byte(req.Password))
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Credenciales incorrectas"})
		}

		// REGLA: Forzar cambio de contraseña en primer login
		if bitForzarCambioPwd {
			return c.JSON(http.StatusLocked, map[string]interface{}{
				"error":           "Por razones de seguridad, debes actualizar tu contraseña temporal.",
				"requiere_cambio": true,
				"usuario_id":      id,
			})
		}

		// Generar Token JWT
		claims := &JwtCustomClaims{
			UsuarioID:  id,
			Nombre:     req.Usuario,
			PerfilID:   idPerfil,
			RutaImagen: strRutaImagen.String,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24)),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "clave_secreta_desarrollo"
		}

		t, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al generar el token"})
		}

		return c.JSON(http.StatusOK, LoginResponse{Token: t, Mensaje: "Inicio de sesión exitoso"})
	}
}

// --- 2. FUNCIÓN PARA VERIFICAR EL CORREO (El enlace del email) ---
func VerificarEmail(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		token := c.QueryParam("token")
		if token == "" {
			return c.HTML(http.StatusBadRequest, "<h2 style='color:red; text-align:center;'>Token no proporcionado</h2>")
		}

		query := `UPDATE Usuario SET bitEmailVerificado = TRUE, strTokenVerificacion = NULL 
				  WHERE strTokenVerificacion = $1 RETURNING strNombreUsuario`

		var username string
		err := db.QueryRow(query, token).Scan(&username)

		if err != nil {
			return c.HTML(http.StatusBadRequest, "<div style='text-align:center; padding: 50px;'><h2 style='color:red;'>El token es inválido o ya fue utilizado.</h2><a href='/login.html'>Ir al Login</a></div>")
		}

		htmlExito := `
		<div style="text-align:center; padding: 50px; font-family: sans-serif;">
			<h1 style="color: #34A853;">¡Cuenta Verificada Exitosamente!</h1>
			<p>Gracias <b>` + username + `</b>. Tu correo corporativo ha sido validado.</p>
			<a href="/login.html" style="display:inline-block; margin-top:20px; padding: 12px 25px; background: #4285F4; color: white; text-decoration: none; border-radius: 5px; font-weight:bold;">Ir al Login</a>
		</div>`

		return c.HTML(http.StatusOK, htmlExito)
	}
}

// --- 3. FUNCIÓN PARA GUARDAR LA NUEVA CONTRASEÑA ---
func ActualizarPasswordPrimerLogin(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := new(ChangePwdReq)
		if err := c.Bind(req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		hashPwd, err := bcrypt.GenerateFromPassword([]byte(req.NuevaPwd), bcrypt.DefaultCost)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al encriptar"})
		}

		// Quitamos la bandera de bloqueo
		_, err = db.Exec("UPDATE Usuario SET strPwd = $1, bitForzarCambioPwd = FALSE WHERE id = $2", string(hashPwd), req.UsuarioID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar en BD"})
		}

		return c.JSON(http.StatusOK, map[string]string{"mensaje": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."})
	}
}
