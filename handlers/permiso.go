// handlers/permiso.go
package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type PermisoReq struct {
	ID          int  `json:"id"`
	IdModulo    int  `json:"idModulo"`
	IdPerfil    int  `json:"idPerfil"`
	BitAgregar  bool `json:"bitAgregar"`
	BitEditar   bool `json:"bitEditar"`
	BitConsulta bool `json:"bitConsulta"`
	BitEliminar bool `json:"bitEliminar"`
	BitDetalle  bool `json:"bitDetalle"`
}

type PermisoRes struct {
	ID           int    `json:"id"`
	IdModulo     int    `json:"idModulo"`
	ModuloNombre string `json:"moduloNombre"`
	IdPerfil     int    `json:"idPerfil"`
	PerfilNombre string `json:"perfilNombre"`
	BitAgregar   bool   `json:"bitAgregar"`
	BitEditar    bool   `json:"bitEditar"`
	BitConsulta  bool   `json:"bitConsulta"`
	BitEliminar  bool   `json:"bitEliminar"`
	BitDetalle   bool   `json:"bitDetalle"`
}

func ObtenerPermisos(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		query := `
			SELECT pp.id, pp.idModulo, m.strNombreModulo, pp.idPerfil, p.strNombrePerfil, 
			       pp.bitAgregar, pp.bitEditar, pp.bitConsulta, pp.bitEliminar, pp.bitDetalle
			FROM PermisosPerfil pp
			INNER JOIN Modulo m ON pp.idModulo = m.id
			INNER JOIN Perfil p ON pp.idPerfil = p.id
			ORDER BY pp.id DESC`

		rows, err := db.Query(query)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al consultar permisos"})
		}
		defer rows.Close()

		var permisos []PermisoRes
		for rows.Next() {
			var p PermisoRes
			if err := rows.Scan(&p.ID, &p.IdModulo, &p.ModuloNombre, &p.IdPerfil, &p.PerfilNombre,
				&p.BitAgregar, &p.BitEditar, &p.BitConsulta, &p.BitEliminar, &p.BitDetalle); err != nil {
				continue
			}
			permisos = append(permisos, p)
		}
		return c.JSON(http.StatusOK, permisos)
	}
}

func CrearPermiso(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		p := new(PermisoReq)
		if err := c.Bind(p); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		// Validar si ya existe un permiso para ese perfil y módulo
		var existe int
		err := db.QueryRow("SELECT COUNT(*) FROM PermisosPerfil WHERE idPerfil = $1 AND idModulo = $2", p.IdPerfil, p.IdModulo).Scan(&existe)
		if err == nil && existe > 0 {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existen permisos configurados para este perfil y módulo"})
		}

		query := `INSERT INTO PermisosPerfil (idModulo, idPerfil, bitAgregar, bitEditar, bitConsulta, bitEliminar, bitDetalle) 
		          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`

		err = db.QueryRow(query, p.IdModulo, p.IdPerfil, p.BitAgregar, p.BitEditar, p.BitConsulta, p.BitEliminar, p.BitDetalle).Scan(&p.ID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear permiso"})
		}
		return c.JSON(http.StatusCreated, p)
	}
}

func ActualizarPermiso(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		p := new(PermisoReq)
		if err := c.Bind(p); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		query := `UPDATE PermisosPerfil 
		          SET bitAgregar=$1, bitEditar=$2, bitConsulta=$3, bitEliminar=$4, bitDetalle=$5 
		          WHERE id=$6`

		_, err := db.Exec(query, p.BitAgregar, p.BitEditar, p.BitConsulta, p.BitEliminar, p.BitDetalle, id)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar permiso"})
		}
		p.ID = id
		return c.JSON(http.StatusOK, p)
	}
}

func EliminarPermiso(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		_, err := db.Exec("DELETE FROM PermisosPerfil WHERE id = $1", id)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar permiso"})
		}
		return c.JSON(http.StatusOK, map[string]string{"mensaje": "Permiso eliminado correctamente"})
	}
}
