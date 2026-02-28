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
	Captcha  string `json:"captcha"` // Nuevo campo para recibir el token de Google
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

// Estructura para la respuesta de Google reCAPTCHA
type RecaptchaResponse struct {
	Success    bool     `json:"success"`
	Challenge  string   `json:"challenge_ts"`
	Hostname   string   `json:"hostname"`
	ErrorCodes []string `json:"error-codes"`
}

func Login(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := new(LoginRequest)
		if err := c.Bind(req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Formato de petición inválido"})
		}

		// 1. Validar el reCAPTCHA con Google
		recaptchaSecret := os.Getenv("RECAPTCHA_SECRET")
		if recaptchaSecret != "" {
			resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify",
				url.Values{"secret": {recaptchaSecret}, "response": {req.Captcha}})

			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error conectando con Google reCAPTCHA"})
			}
			defer resp.Body.Close()

			var googleResp RecaptchaResponse
			if err := json.NewDecoder(resp.Body).Decode(&googleResp); err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error decodificando respuesta de Google"})
			}

			if !googleResp.Success {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Verificación de reCAPTCHA fallida. Intenta de nuevo."})
			}
		}

		// 2. Buscar usuario en la BD
		var id, idPerfil, idEstadoUsuario int
		var hashPwd, strRutaImagen sql.NullString

		query := `SELECT id, idPerfil, strPwd, idEstadoUsuario, strRutaImagen 
				  FROM Usuario WHERE strNombreUsuario = $1`

		err := db.QueryRow(query, req.Usuario).Scan(&id, &idPerfil, &hashPwd, &idEstadoUsuario, &strRutaImagen)
		if err != nil {
			if err == sql.ErrNoRows {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "El usuario no existe o las credenciales son incorrectas"})
			}
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error interno del servidor"})
		}

		// 3. Validar estado activo
		if idEstadoUsuario != 1 {
			return c.JSON(http.StatusForbidden, map[string]string{"error": "El usuario se encuentra inactivo"})
		}

		// 4. Validar contraseña
		err = bcrypt.CompareHashAndPassword([]byte(hashPwd.String), []byte(req.Password))
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Credenciales incorrectas"})
		}

		// 5. Generar Token JWT
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

		return c.JSON(http.StatusOK, LoginResponse{
			Token:   t,
			Mensaje: "Inicio de sesión exitoso",
		})
	}
}
