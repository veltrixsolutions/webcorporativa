// handlers/menu.go
package handlers

import (
	"database/sql"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type ModuloMenu struct {
	ID     int    `json:"id"`
	Nombre string `json:"nombre"`
	MenuID int    `json:"menu_id"` // 1: Seguridad, 2: Principal 1, 3: Principal 2
}

type MenuResponse struct {
	NombreMenu string       `json:"nombre_menu"`
	Modulos    []ModuloMenu `json:"modulos"`
}

func ObtenerMenuUsuario(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Extraer el token del middleware JWT
		userToken := c.Get("user").(*jwt.Token)
		claims := userToken.Claims.(*JwtCustomClaims)
		perfilID := claims.PerfilID

		// Consultar módulos a los que el perfil tiene acceso (al menos un permiso en TRUE)
		query := `
			SELECT m.id, m.strNombreModulo, me.idMenu
			FROM PermisosPerfil pp
			INNER JOIN Modulo m ON pp.idModulo = m.id
			INNER JOIN Menu me ON m.id = me.idModulo
			WHERE pp.idPerfil = $1 
			AND (pp.bitAgregar = TRUE OR pp.bitEditar = TRUE OR pp.bitConsulta = TRUE OR pp.bitEliminar = TRUE OR pp.bitDetalle = TRUE)
			ORDER BY me.idMenu, m.id`

		rows, err := db.Query(query, perfilID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al consultar el menú"})
		}
		defer rows.Close()

		menusMap := make(map[int][]ModuloMenu)
		for rows.Next() {
			var mod ModuloMenu
			if err := rows.Scan(&mod.ID, &mod.Nombre, &mod.MenuID); err != nil {
				continue
			}
			menusMap[mod.MenuID] = append(menusMap[mod.MenuID], mod)
		}

		// Construir respuesta agrupada
		var respuesta []MenuResponse

		if mods, ok := menusMap[1]; ok && len(mods) > 0 {
			respuesta = append(respuesta, MenuResponse{NombreMenu: "Seguridad", Modulos: mods})
		}
		if mods, ok := menusMap[2]; ok && len(mods) > 0 {
			respuesta = append(respuesta, MenuResponse{NombreMenu: "Principal 1", Modulos: mods})
		}
		if mods, ok := menusMap[3]; ok && len(mods) > 0 {
			respuesta = append(respuesta, MenuResponse{NombreMenu: "Principal 2", Modulos: mods})
		}

		return c.JSON(http.StatusOK, respuesta)
	}
}
