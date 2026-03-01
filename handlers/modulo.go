// handlers/modulo.go
package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type Modulo struct {
	ID              int    `json:"id"`
	StrNombreModulo string `json:"strNombreModulo"`
}

// --- CRUD de Módulos ---

func ObtenerModulos(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		rows, err := db.Query("SELECT id, strNombreModulo FROM Modulo ORDER BY id DESC")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al consultar módulos"})
		}
		defer rows.Close()

		var modulos []Modulo
		for rows.Next() {
			var m Modulo
			if err := rows.Scan(&m.ID, &m.StrNombreModulo); err != nil {
				continue
			}
			modulos = append(modulos, m)
		}
		return c.JSON(http.StatusOK, modulos)
	}
}

func CrearModulo(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		m := new(Modulo)
		if err := c.Bind(m); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		// Iniciamos una transacción para guardar en Modulo y en Menu al mismo tiempo
		tx, err := db.Begin()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error interno del servidor"})
		}

		// 1. Insertar en la tabla Modulo
		err = tx.QueryRow("INSERT INTO Modulo (strNombreModulo) VALUES ($1) RETURNING id", m.StrNombreModulo).Scan(&m.ID)
		if err != nil {
			tx.Rollback()
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear módulo"})
		}

		// 2. Insertar en la tabla Menu para que no quede invisible (Categoría 1 por defecto)
		_, err = tx.Exec("INSERT INTO Menu (idMenu, idModulo) VALUES ($1, $2)", 1, m.ID)
		if err != nil {
			tx.Rollback()
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al vincular el módulo al menú"})
		}

		// Confirmar la transacción
		err = tx.Commit()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al confirmar la transacción"})
		}

		return c.JSON(http.StatusCreated, m)
	}
}

func ActualizarModulo(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		m := new(Modulo)
		if err := c.Bind(m); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		_, err := db.Exec("UPDATE Modulo SET strNombreModulo = $1 WHERE id = $2", m.StrNombreModulo, id)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar módulo"})
		}
		m.ID = id
		return c.JSON(http.StatusOK, m)
	}
}

func EliminarModulo(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		_, err := db.Exec("DELETE FROM Modulo WHERE id = $1", id)
		if err != nil {
			return c.JSON(http.StatusConflict, map[string]string{"error": "No se puede eliminar: el módulo está en uso en menús o permisos"})
		}
		return c.JSON(http.StatusOK, map[string]string{"mensaje": "Módulo eliminado correctamente"})
	}
}

// --- Endpoint de Seguridad Dinámica ---

// ObtenerMisPermisosModulo devuelve los booleanos exactos para el usuario logueado en la pantalla actual
func ObtenerMisPermisosModulo(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		idModulo, _ := strconv.Atoi(c.Param("idModulo"))

		// Extraer Perfil del JWT
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(*JwtCustomClaims)
		perfilID := claims.PerfilID

		var p PermisoRes
		query := `SELECT bitAgregar, bitEditar, bitConsulta, bitEliminar, bitDetalle 
                  FROM PermisosPerfil 
                  WHERE idPerfil = $1 AND idModulo = $2 LIMIT 1`

		err := db.QueryRow(query, perfilID, idModulo).Scan(&p.BitAgregar, &p.BitEditar, &p.BitConsulta, &p.BitEliminar, &p.BitDetalle)
		if err != nil {
			// Si no hay registro, todo es falso por seguridad
			return c.JSON(http.StatusOK, PermisoRes{BitAgregar: false, BitEditar: false, BitConsulta: false, BitEliminar: false, BitDetalle: false})
		}

		return c.JSON(http.StatusOK, p)
	}
}
