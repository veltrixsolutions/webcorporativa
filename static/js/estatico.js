// static/js/estatico.js

const ModuloEstatico = (() => {
    
    // Función principal que renderiza la pantalla dependiendo de los permisos
    async function renderView(container, moduleId, moduleName) {
        
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 800px; padding: 40px;">
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.8rem;">${moduleName}</h1>
                <p style="color: #6b7280; font-size: 1.1rem; margin-bottom: 30px;">
                    Validando credenciales de seguridad...
                </p>
            </div>
        `;

        try {
            const token = localStorage.getItem('jwt_token');
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("No se pudieron verificar los permisos");
            const permisos = await res.json();

            // Dibujamos la pantalla estática basándonos en los booleanos
            construirInterfaz(container, moduleName, permisos);

        } catch (error) {
            container.innerHTML = `
                <div class="data-card-centered">
                    <h1 style="color: #b91c1c;">Error de Acceso</h1>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    function construirInterfaz(container, moduleName, permisos) {
        let botonesHTML = '';
        let tablaBotonesHTML = '';

        // Botón Global de Agregar
        if (permisos.bitAgregar) {
            botonesHTML += `<button class="btn-submit" style="background-color: #10b981; margin-right: 10px; width: auto; padding: 12px 25px;">+ Nuevo Registro</button>`;
        }

        // Botones dentro de la tabla estática
        if (permisos.bitConsulta) {
            tablaBotonesHTML += `<button class="btn-edit" style="background-color: #6b7280;">Consultar</button>`;
        }
        if (permisos.bitDetalle) {
            tablaBotonesHTML += `<button class="btn-edit" style="background-color: #8b5cf6;">Detalles</button>`;
        }
        if (permisos.bitEditar) {
            tablaBotonesHTML += `<button class="btn-edit">Editar</button>`;
        }
        if (permisos.bitEliminar) {
            tablaBotonesHTML += `<button class="btn-delete">Eliminar</button>`;
        }

        // Si no hay botones permitidos en la tabla, evitamos dejar la celda vacía
        if (tablaBotonesHTML === '') {
            tablaBotonesHTML = `<span style="color: #9ca3af; font-size: 0.9rem;">Sin permisos de acción</span>`;
        }

        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 800px; text-align: left;">
                <h1 style="margin-bottom: 5px; color: #1f2937; font-size: 1.8rem; text-align: center;">${moduleName}</h1>
                <p style="color: #6b7280; font-size: 1.05rem; text-align: center; margin-bottom: 25px;">
                    Esta es una pantalla estática de demostración responsiva.
                </p>

                <div style="margin-bottom: 20px; text-align: right;">
                    ${botonesHTML}
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Dato de Ejemplo</th>
                                <th>Estado</th>
                                <th>Acciones Permitidas</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Registro Falso #1</td>
                                <td><span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">Completado</span></td>
                                <td>${tablaBotonesHTML}</td>
                            </tr>
                            <tr>
                                <td>Registro Falso #2</td>
                                <td><span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">Pendiente</span></td>
                                <td>${tablaBotonesHTML}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    return { render: renderView };
})();