// main.go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"WebCorporativa/handlers"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"
	"golang.org/x/time/rate"
)

func main() {
	// Cargar el archivo .env si existe (entorno local).
	errEnv := godotenv.Load()
	if errEnv != nil {
		fmt.Println("Nota: No se encontró archivo .env, leyendo variables del sistema...")
	}

	// Configuración de la conexión a PostgreSQL
	dbHost := os.Getenv("PGHOST")
	dbPort := os.Getenv("PGPORT")
	dbUser := os.Getenv("PGUSER")
	dbPass := os.Getenv("PGPASSWORD")
	dbName := os.Getenv("PGDATABASE")

	dbDSN := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	db, err := sql.Open("postgres", dbDSN)
	if err != nil {
		log.Fatalf("Error abriendo la base de datos: %v", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatalf("Error conectando a la base de datos: %v", err)
	}
	fmt.Println("Conexión exitosa a PostgreSQL")

	// Inicializar framework Echo
	e := echo.New()

	// ==========================================
	// 🛡️ 1. MIDDLEWARES DE SEGURIDAD BÁSICA
	// ==========================================
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// ==========================================
	// 🛡️ 2. SECURITY HEADERS (Cabeceras de Seguridad)
	// Protege contra Clickjacking, XSS reflejado y Sniffing
	// ==========================================
	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		XSSProtection:         "1; mode=block",
		ContentTypeNosniff:    "nosniff",
		XFrameOptions:         "DENY",   // Impide que Veltrix sea cargado en un iframe de terceros
		HSTSMaxAge:            31536000, // Fuerza HTTPS por 1 año
		ContentSecurityPolicy: "default-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com https://ui-avatars.com https://res.cloudinary.com https://widget.cloudinary.com;",
	}))

	// ==========================================
	// 🛡️ 3. RATE LIMITING GLOBAL (Límite de Peticiones)
	// Evita ataques de denegación de servicio (DDoS)
	// Limita a 50 peticiones por segundo por cada IP (con un margen extra de 10)
	// ==========================================
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(rate.Limit(50))))

	// Servir archivos estáticos del Frontend
	e.Static("/", "static")

	// --- NUEVA REDIRECCIÓN ---
	e.GET("/", func(c echo.Context) error {
		return c.Redirect(302, "/login.html")
	})

	// Manejador de errores personalizado
	e.HTTPErrorHandler = customHTTPErrorHandler

	// Grupo de rutas de API públicas
	api := e.Group("/api")

	// ==========================================
	// 🛡️ 4. RATE LIMITING ESTRICTO PARA EL LOGIN
	// Protege contra ataques de fuerza bruta adivinando contraseñas
	// Límite: 5 intentos de login por minuto por cada IP
	// ==========================================
	loginRateLimiter := middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 5.0 / 60.0, Burst: 5, ExpiresIn: 1 * time.Minute},
		),
		IdentifierExtractor: func(c echo.Context) (string, error) {
			return c.RealIP(), nil
		},
		ErrorHandler: func(c echo.Context, err error) error {
			return c.JSON(429, map[string]string{"error": "Demasiados intentos. Por favor, espera un minuto."})
		},
	})

	// Aplicamos el limitador estricto a las rutas de acceso
	api.POST("/login", handlers.Login(db), loginRateLimiter)
	api.POST("/cambiar-pwd", handlers.ActualizarPasswordPrimerLogin(db), loginRateLimiter)

	api.POST("/recuperar-pwd", handlers.SolicitarRecuperacionPwd(db), loginRateLimiter)
	api.POST("/reset-pwd", handlers.RestablecerPassword(db), loginRateLimiter)

	api.GET("/verificar-email", handlers.VerificarEmail(db))

	// Grupo de rutas privadas protegidas con JWT
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("ERROR: La variable JWT_SECRET no está configurada")
	}

	apiPrivada := e.Group("/api/v1")
	apiPrivada.Use(echojwt.WithConfig(echojwt.Config{
		SigningKey: []byte(secret),
		NewClaimsFunc: func(c echo.Context) jwt.Claims {
			return new(handlers.JwtCustomClaims)
		},
	}))

	// --- Rutas del Menú ---
	apiPrivada.GET("/menu", handlers.ObtenerMenuUsuario(db))

	// --- Rutas CRUD: Perfiles ---
	apiPrivada.GET("/perfiles", handlers.ObtenerPerfiles(db))
	apiPrivada.POST("/perfiles", handlers.CrearPerfil(db))
	apiPrivada.PUT("/perfiles/:id", handlers.ActualizarPerfil(db))
	apiPrivada.DELETE("/perfiles/:id", handlers.EliminarPerfil(db))

	// --- Rutas CRUD: Usuarios ---
	apiPrivada.GET("/usuarios", handlers.ObtenerUsuarios(db))
	apiPrivada.POST("/usuarios", handlers.CrearUsuario(db))
	apiPrivada.PUT("/usuarios/:id", handlers.ActualizarUsuario(db))
	apiPrivada.DELETE("/usuarios/:id", handlers.EliminarUsuario(db))

	// --- Rutas CRUD: Permisos-Perfil ---
	apiPrivada.GET("/permisos", handlers.ObtenerPermisos(db))
	apiPrivada.POST("/permisos", handlers.CrearPermiso(db))
	apiPrivada.PUT("/permisos/:id", handlers.ActualizarPermiso(db))
	apiPrivada.DELETE("/permisos/:id", handlers.EliminarPermiso(db))

	// --- Rutas CRUD: Módulos ---
	apiPrivada.GET("/modulos", handlers.ObtenerModulos(db))
	apiPrivada.POST("/modulos", handlers.CrearModulo(db))
	apiPrivada.PUT("/modulos/:id", handlers.ActualizarModulo(db))
	apiPrivada.DELETE("/modulos/:id", handlers.EliminarModulo(db))

	// --- Ruta de Seguridad para Pantallas Estáticas ---
	apiPrivada.GET("/mis-permisos/:idModulo", handlers.ObtenerMisPermisosModulo(db))

	// Configuración del puerto dinámico
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Servidor corriendo en el puerto: " + port)
	e.Logger.Fatal(e.Start(":" + port))
}

// customHTTPErrorHandler redirige los errores a páginas estáticas personalizadas
func customHTTPErrorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError // 500 por defecto
	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
	}

	// Intentamos buscar la página específica del error (ej. error404.html o error500.html)
	errorPage := fmt.Sprintf("static/error%d.html", code)
	if _, errStat := os.Stat(errorPage); errStat == nil {
		fileContent, _ := os.ReadFile(errorPage)
		_ = c.HTMLBlob(code, fileContent)
	} else {
		// Fallback: Si no existe la página específica, buscamos error_general.html
		if _, errGen := os.Stat("static/error_general.html"); errGen == nil {
			fileContentGen, _ := os.ReadFile("static/error_general.html")
			_ = c.HTMLBlob(code, fileContentGen)
		} else {
			// Fallback extremo
			_ = c.String(code, fmt.Sprintf("Error %d: Ha ocurrido un problema en el servidor.", code))
		}
	}

	c.Logger().Error(err)
}
