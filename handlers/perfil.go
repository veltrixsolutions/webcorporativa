// handlers/perfil.go
package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type Perfil struct {
	ID               int    `json:"id"`
	StrNombrePerfil  string `json:"strNombrePerfil"`
	BitAdministrador bool   `json:"bitAdministrador"`
}

// ObtenerPerfiles devuelve todos los perfiles para paginarlos en el frontend
func ObtenerPerfiles(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		rows, err := db.Query("SELECT id, strNombrePerfil, bitAdministrador FROM Perfil ORDER BY id DESC")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al consultar perfiles"})
		}
		defer rows.Close()

		var perfiles []Perfil
		for rows.Next() {
			var p Perfil
			if err := rows.Scan(&p.ID, &p.StrNombrePerfil, &p.BitAdministrador); err != nil {
				continue
			}
			perfiles = append(perfiles, p)
		}
		return c.JSON(http.StatusOK, perfiles)
	}
}

// CrearPerfil inserta un nuevo registro
func CrearPerfil(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		p := new(Perfil)
		if err := c.Bind(p); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		err := db.QueryRow("INSERT INTO Perfil (strNombrePerfil, bitAdministrador) VALUES ($1, $2) RETURNING id",
			p.StrNombrePerfil, p.BitAdministrador).Scan(&p.ID)

		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear perfil"})
		}
		return c.JSON(http.StatusCreated, p)
	}
}

// ActualizarPerfil modifica un registro existente
func ActualizarPerfil(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		p := new(Perfil)
		if err := c.Bind(p); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		_, err := db.Exec("UPDATE Perfil SET strNombrePerfil = $1, bitAdministrador = $2 WHERE id = $3",
			p.StrNombrePerfil, p.BitAdministrador, id)

		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar perfil"})
		}
		p.ID = id
		return c.JSON(http.StatusOK, p)
	}
}

// EliminarPerfil borra un registro (si no está en uso)
func EliminarPerfil(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		_, err := db.Exec("DELETE FROM Perfil WHERE id = $1", id)
		if err != nil {
			// Si el perfil está asignado a un usuario, PostgreSQL arrojará un error de llave foránea (RESTRICT)
			return c.JSON(http.StatusConflict, map[string]string{"error": "No se puede eliminar: el perfil está en uso"})
		}
		return c.JSON(http.StatusOK, map[string]string{"mensaje": "Perfil eliminado correctamente"})
	}
}
