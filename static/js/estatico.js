// static/js/estatico.js

const ModuloEstatico = (() => {
    
    // Función principal que renderiza la pantalla dependiendo de los permisos
    async function renderView(container, moduleId, moduleName) {
        
        // 1. Pantalla de Carga Profesional (Spinner animado adaptado al tema)
        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: var(--bg-card); border-radius: 20px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--brand-primary); margin-bottom: 20px;"></i>
                    <h1 style="color: var(--text-primary); font-size: 1.5rem; font-weight: 600; margin-bottom: 10px;">Cargando ${moduleName}...</h1>
                    <p style="color: var(--text-secondary); font-size: 1rem;">Sincronizando permisos de seguridad corporativa</p>
                </div>
            </div>
        `;

        try {
            const token = sessionStorage.getItem('jwt_token');
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("Acceso denegado o sesión expirada.");
            const permisos = await res.json();

            // Dibujamos la pantalla estática basándonos en los booleanos
            construirInterfaz(container, moduleName, permisos);

        } catch (error) {
            // 2. Pantalla de Error Estilizada (Adaptada al tema)
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: var(--bg-card); border-radius: 20px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
                        <div style="width: 80px; height: 80px; background: var(--danger-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-shield-alt" style="font-size: 2.5rem; color: var(--danger-text);"></i>
                        </div>
                        <h1 style="color: var(--text-primary); font-size: 1.8rem; margin-bottom: 10px; font-weight: 700;">Acceso Restringido</h1>
                        <p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.5;">${error.message}</p>
                    </div>
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
                <button class="btn-primary" style="background-color: var(--brand-primary); color: var(--text-inverse); border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                    <i class="fas fa-plus"></i> Nuevo Registro
                </button>`;
        }

        // Botones dentro de la tabla estática (Iconos interactivos)
        if (permisos.bitConsulta || permisos.bitDetalle) {
            tablaBotonesHTML += `<button title="Ver Detalles" style="color: var(--text-accent); background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 8px; margin: 0 4px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-eye"></i></button>`;
        }
        if (permisos.bitEditar) {
            tablaBotonesHTML += `<button title="Editar Registro" style="color: var(--brand-primary); background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 8px; margin: 0 4px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-pen"></i></button>`;
        }
        if (permisos.bitEliminar) {
            tablaBotonesHTML += `<button title="Eliminar" style="color: var(--danger-text); background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 8px; margin: 0 4px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-trash-alt"></i></button>`;
        }

        if (tablaBotonesHTML === '') {
            tablaBotonesHTML = `<span style="color: var(--text-secondary); font-size: 0.9rem; font-style: italic;"><i class="fas fa-lock" style="margin-right: 5px;"></i>Solo lectura</span>`;
        }

        // 3. Renderizado de la Vista Principal con inyección de CSS Theming
        container.innerHTML = `
            <style>
                .ux-table-row { transition: background-color 0.2s ease, transform 0.2s ease; }
                .ux-table-row:hover { background-color: var(--bg-hover); transform: scale(1.002); }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h1 style="color: var(--text-primary); font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px;">
                            <i class="fas fa-folder-open" style="color: var(--text-secondary); margin-right: 12px;"></i>${moduleName}
                        </h1>
                        <p style="color: var(--text-secondary); font-size: 1rem; margin: 0;">Gestión y administración de registros del sistema (Modo Demo).</p>
                    </div>
                    <div>
                        ${botonesHTML}
                    </div>
                </div>

                <div style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                            <thead style="background: var(--table-header-bg); border-bottom: 1px solid var(--border-color);">
                                <tr>
                                    <th style="padding: 16px 24px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Código</th>
                                    <th style="padding: 16px 24px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Descripción</th>
                                    <th style="padding: 16px 24px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Estado</th>
                                    <th style="padding: 16px 24px; text-align: right; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody style="background-color: var(--bg-card);">
                                <tr class="ux-table-row">
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); font-weight: 600;">#VLX-001</td>
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">Registro corporativo demostrativo A</td>
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color);">
                                        <span style="background-color: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                            <i class="fas fa-circle" style="font-size: 0.4rem;"></i>Completado
                                        </span>
                                    </td>
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); text-align: right;">${tablaBotonesHTML}</td>
                                </tr>
                                <tr class="ux-table-row">
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); font-weight: 600;">#VLX-002</td>
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">Registro corporativo demostrativo B</td>
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color);">
                                        <span style="background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                            <i class="fas fa-circle" style="font-size: 0.4rem;"></i>Pendiente
                                        </span>
                                    </td>
                                    <td style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); text-align: right;">${tablaBotonesHTML}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    return { render: renderView };
})();