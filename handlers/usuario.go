// handlers/usuario.go
package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

type UsuarioReq struct {
	ID               int    `json:"id"`
	StrNombreUsuario string `json:"strNombreUsuario"`
	IdPerfil         int    `json:"idPerfil"`
	StrPwd           string `json:"strPwd"` // Se envía vacío si no se desea actualizar
	IdEstadoUsuario  int    `json:"idEstadoUsuario"`
	StrCorreo        string `json:"strCorreo"`
	StrNumeroCelular string `json:"strNumeroCelular"`
	StrRutaImagen    string `json:"strRutaImagen"`
}

type UsuarioRes struct {
	ID               int    `json:"id"`
	StrNombreUsuario string `json:"strNombreUsuario"`
	PerfilNombre     string `json:"perfilNombre"`
	IdPerfil         int    `json:"idPerfil"`
	IdEstadoUsuario  int    `json:"idEstadoUsuario"`
	StrCorreo        string `json:"strCorreo"`
	StrNumeroCelular string `json:"strNumeroCelular"`
	StrRutaImagen    string `json:"strRutaImagen"`
}

func ObtenerUsuarios(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		query := `
			SELECT u.id, u.strNombreUsuario, p.strNombrePerfil, u.idPerfil, u.idEstadoUsuario, 
				   u.strCorreo, u.strNumeroCelular, u.strRutaImagen 
			FROM Usuario u 
			INNER JOIN Perfil p ON u.idPerfil = p.id 
			ORDER BY u.id DESC`

		rows, err := db.Query(query)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al consultar usuarios"})
		}
		defer rows.Close()

		var usuarios []UsuarioRes
		for rows.Next() {
			var u UsuarioRes
			var ruta, celular sql.NullString
			if err := rows.Scan(&u.ID, &u.StrNombreUsuario, &u.PerfilNombre, &u.IdPerfil,
				&u.IdEstadoUsuario, &u.StrCorreo, &celular, &ruta); err != nil {
				continue
			}
			u.StrNumeroCelular = celular.String
			u.StrRutaImagen = ruta.String
			usuarios = append(usuarios, u)
		}
		return c.JSON(http.StatusOK, usuarios)
	}
}

func CrearUsuario(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		u := new(UsuarioReq)
		if err := c.Bind(u); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		hashPwd, err := bcrypt.GenerateFromPassword([]byte(u.StrPwd), bcrypt.DefaultCost)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al encriptar contraseña"})
		}

		tokenValidacion := GenerarToken()

		query := `INSERT INTO Usuario (strNombreUsuario, idPerfil, strPwd, idEstadoUsuario, strCorreo, strNumeroCelular, strRutaImagen, strTokenVerificacion, bitEmailVerificado, bitForzarCambioPwd) 
				  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, TRUE) RETURNING id`

		err = db.QueryRow(query, u.StrNombreUsuario, u.IdPerfil, string(hashPwd), u.IdEstadoUsuario, u.StrCorreo, u.StrNumeroCelular, u.StrRutaImagen, tokenValidacion).Scan(&u.ID)

		if err != nil {
			// Manejo amigable de correo duplicado
			if err.Error() == "pq: duplicate key value violates unique constraint \"usuario_strcorreo_key\"" {
				return c.JSON(http.StatusConflict, map[string]string{"error": "Este correo electrónico ya está registrado en el sistema."})
			}
			fmt.Printf("Error BD al crear usuario: %v\n", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Ocurrió un error al guardar el usuario en la Base de Datos."})
		}

		// Extraemos la contraseña en texto plano antes de limpiarla
		pwdTemporal := u.StrPwd

		// CORRECCIÓN: Pasar datos específicos (incluyendo contraseña) a la goroutine
		go func(email, nombre, token, pwd string) {
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("Pánico recuperado en envío de correo: %v\n", r)
				}
			}()

			errCorreo := EnviarCorreoVerificacion(email, nombre, token, pwd)
			if errCorreo != nil {
				fmt.Printf("Error de Resend (API): %v\n", errCorreo)
			} else {
				fmt.Println("Correo de verificación enviado con éxito vía Resend.")
			}
		}(u.StrCorreo, u.StrNombreUsuario, tokenValidacion, pwdTemporal)

		// Limpiar contraseña por seguridad antes de responder
		u.StrPwd = ""
		return c.JSON(http.StatusCreated, u)
	}
}

func ActualizarUsuario(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		u := new(UsuarioReq)
		if err := c.Bind(u); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
		}

		// Si se envía una nueva contraseña, la actualizamos; si no, conservamos la actual
		if u.StrPwd != "" {
			hashPwd, _ := bcrypt.GenerateFromPassword([]byte(u.StrPwd), bcrypt.DefaultCost)
			_, err := db.Exec(`UPDATE Usuario SET strNombreUsuario=$1, idPerfil=$2, strPwd=$3, idEstadoUsuario=$4, strCorreo=$5, strNumeroCelular=$6, strRutaImagen=$7 WHERE id=$8`,
				u.StrNombreUsuario, u.IdPerfil, string(hashPwd), u.IdEstadoUsuario, u.StrCorreo, u.StrNumeroCelular, u.StrRutaImagen, id)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar usuario con contraseña"})
			}
		} else {
			_, err := db.Exec(`UPDATE Usuario SET strNombreUsuario=$1, idPerfil=$2, idEstadoUsuario=$3, strCorreo=$4, strNumeroCelular=$5, strRutaImagen=$6 WHERE id=$7`,
				u.StrNombreUsuario, u.IdPerfil, u.IdEstadoUsuario, u.StrCorreo, u.StrNumeroCelular, u.StrRutaImagen, id)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar usuario"})
			}
		}

		u.ID = id
		u.StrPwd = ""
		return c.JSON(http.StatusOK, u)
	}
}

func EliminarUsuario(db *sql.DB) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, _ := strconv.Atoi(c.Param("id"))
		_, err := db.Exec("DELETE FROM Usuario WHERE id = $1", id)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar usuario"})
		}
		return c.JSON(http.StatusOK, map[string]string{"mensaje": "Usuario eliminado correctamente"})
	}
}
