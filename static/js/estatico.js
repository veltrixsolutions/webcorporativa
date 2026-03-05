// static/js/estatico.js

const ModuloEstatico = (() => {
    
    // Función principal que renderiza la pantalla dependiendo de los permisos
    async function renderView(container, moduleId, moduleName) {
        
        // 1. Pantalla de Carga Profesional (Spinner animado)
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 900px; padding: 60px 20px; text-align: center; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: #3b82f6; margin-bottom: 20px;"></i>
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.5rem; font-weight: 600;">Cargando ${moduleName}...</h1>
                <p style="color: #6b7280; font-size: 1rem;">
                    Sincronizando permisos de seguridad corporativa
                </p>
            </div>
        `;

        try {
            const token = localStorage.getItem('jwt_token');
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("Acceso denegado o sesión expirada.");
            const permisos = await res.json();

            // Dibujamos la pantalla estática basándonos en los booleanos
            construirInterfaz(container, moduleName, permisos);

        } catch (error) {
            // 2. Pantalla de Error Estilizada
            container.innerHTML = `
                <div class="data-card-centered" style="max-width: 600px; padding: 40px; text-align: center; background: #fef2f2; border: 1px solid #f87171; border-radius: 12px;">
                    <i class="fas fa-shield-alt" style="font-size: 3.5rem; color: #ef4444; margin-bottom: 15px;"></i>
                    <h1 style="color: #991b1b; font-size: 1.8rem; margin-bottom: 10px;">Acceso Restringido</h1>
                    <p style="color: #7f1d1d; font-size: 1.1rem;">${error.message}</p>
                </div>
            `;
        }
    }

    function construirInterfaz(container, moduleName, permisos) {
        let botonesHTML = '';
        let tablaBotonesHTML = '';

        // Botón Global de Agregar (Estilo Primary Action)
        if (permisos.bitAgregar) {
            botonesHTML += `
                <button class="btn-submit" style="background-color: #2563eb; color: white; margin-bottom: 15px; display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 6px; font-weight: 500; border: none; cursor: pointer; transition: background-color 0.2s;">
                    <i class="fas fa-plus"></i> Nuevo Registro
                </button>`;
        }

        // Botones dentro de la tabla estática (Iconos limpios y minimalistas)
        if (permisos.bitConsulta || permisos.bitDetalle) {
            tablaBotonesHTML += `<button title="Ver Detalles" style="color: #6366f1; background: transparent; border: none; cursor: pointer; font-size: 1.2rem; margin: 0 8px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-eye"></i></button>`;
        }
        if (permisos.bitEditar) {
            tablaBotonesHTML += `<button title="Editar Registro" style="color: #f59e0b; background: transparent; border: none; cursor: pointer; font-size: 1.2rem; margin: 0 8px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-edit"></i></button>`;
        }
        if (permisos.bitEliminar) {
            tablaBotonesHTML += `<button title="Eliminar" style="color: #ef4444; background: transparent; border: none; cursor: pointer; font-size: 1.2rem; margin: 0 8px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-trash-alt"></i></button>`;
        }

        if (tablaBotonesHTML === '') {
            tablaBotonesHTML = `<span style="color: #9ca3af; font-size: 0.9rem; font-style: italic;"><i class="fas fa-lock" style="margin-right: 5px;"></i>Solo lectura</span>`;
        }

        // 3. Renderizado de la Vista Principal
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 1000px; text-align: left; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);">
                
                <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="margin: 0; color: #111827; font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-folder-open" style="color: #9ca3af; margin-right: 10px;"></i>${moduleName}
                        </h1>
                        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 0.95rem;">
                            Gestión y administración de registros del sistema.
                        </p>
                    </div>
                    <div>
                        ${botonesHTML}
                    </div>
                </div>

                <div class="table-container" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                            <tr>
                                <th style="padding: 12px 20px; color: #374151; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Código</th>
                                <th style="padding: 12px 20px; color: #374151; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Descripción</th>
                                <th style="padding: 12px 20px; color: #374151; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Estado</th>
                                <th style="padding: 12px 20px; color: #374151; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody style="background-color: #ffffff;">
                            <tr style="border-bottom: 1px solid #e5e7eb; transition: background-color 0.15s;" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                                <td style="padding: 15px 20px; color: #111827; font-weight: 500;">#VLX-001</td>
                                <td style="padding: 15px 20px; color: #4b5563;">Registro corporativo demostrativo A</td>
                                <td style="padding: 15px 20px;">
                                    <span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.025em;">
                                        <i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 4px; vertical-align: middle;"></i>Completado
                                    </span>
                                </td>
                                <td style="padding: 15px 20px; text-align: right;">${tablaBotonesHTML}</td>
                            </tr>
                            <tr style="transition: background-color 0.15s;" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                                <td style="padding: 15px 20px; color: #111827; font-weight: 500;">#VLX-002</td>
                                <td style="padding: 15px 20px; color: #4b5563;">Registro corporativo demostrativo B</td>
                                <td style="padding: 15px 20px;">
                                    <span style="background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.025em;">
                                        <i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 4px; vertical-align: middle;"></i>Pendiente
                                    </span>
                                </td>
                                <td style="padding: 15px 20px; text-align: right;">${tablaBotonesHTML}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    return { render: renderView };
})();