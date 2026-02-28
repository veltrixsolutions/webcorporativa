// main.go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"WebCorporativa/handlers"

	"github.com/joho/godotenv"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"
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

	// Middlewares globales
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Servir archivos estáticos del Frontend
	e.Static("/", "static")

	// Manejador de errores personalizado
	e.HTTPErrorHandler = customHTTPErrorHandler

	// Grupo de rutas de API públicas
	api := e.Group("/api")
	api.POST("/login", handlers.Login(db))

	// Grupo de rutas privadas protegidas con JWT
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("ERROR: La variable JWT_SECRET no está configurada")
	}

	apiPrivada := e.Group("/api/v1")
	// Usamos el nuevo paquete echo-jwt
	apiPrivada.Use(echojwt.JWT([]byte(secret)))

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
	code := 500
	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
	}

	errorPage := fmt.Sprintf("static/error%d.html", code)
	if _, errStat := os.Stat(errorPage); errStat == nil {
		_ = c.File(errorPage)
	} else {
		// Fallback por si la página personalizada no existe
		_ = c.File("static/error_general.html")
	}

	c.Logger().Error(err)
}
