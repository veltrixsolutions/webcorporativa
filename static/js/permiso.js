const PermisoModule = (() => {
    let permisosData = [], perfilesDisponibles = [], modulosDisponibles = [];
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };
    
    // Variables para la paginación y el manejo de estado
    let matrizEdicion = []; 
    let currentPage = 1;
    const rowsPerPage = 5;
    let currentPerfilId = null;

    async function renderView(container, moduleId, perfilId) {
        // 1. Validar seguridad del usuario actual
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: var(--bg-card); border-radius: 20px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
                        <div style="width: 80px; height: 80px; background: var(--danger-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-lock" style="font-size: 2.5rem; color: var(--danger-text);"></i>
                        </div>
                        <h1 style="color: var(--text-primary); font-size: 1.8rem; margin-bottom: 10px; font-weight: 700;">Acceso Restringido</h1>
                        <p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.5;">No tienes los privilegios necesarios para visualizar la matriz de permisos.</p>
                    </div>
                </div>`;
            return;
        }

        // 2. Inyectar UI (Estilo Theming Veltrix)
        container.innerHTML = `
            <style>
                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: var(--bg-card); border-radius: 10px; padding: 16px 24px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 4px solid var(--brand-primary); }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: var(--danger-text); }
                
                .ux-table-row { transition: background-color 0.2s ease, transform 0.2s ease; border-bottom: 1px solid var(--border-color); }
                .ux-table-row:hover { background-color: var(--bg-hover); transform: scale(1.002); }
                
                .ux-select { width: 100%; max-width: 400px; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; color: var(--text-primary); transition: all 0.2s; background: var(--input-bg); font-weight: 500; cursor: pointer; }
                .ux-select:focus { outline: none; border-color: var(--border-focus); box-shadow: var(--shadow-focus); }

                /* Checkboxes Grandes y Centrados */
                .matriz-checkbox { width: 20px; height: 20px; accent-color: var(--brand-primary); cursor: pointer; transition: transform 0.1s; }
                .matriz-checkbox:hover { transform: scale(1.1); }
                .matriz-checkbox:disabled { cursor: not-allowed; opacity: 0.6; filter: grayscale(100%); }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="margin: 0; color: var(--text-primary); font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-user-shield" style="color: var(--text-secondary); margin-right: 10px;"></i>Matriz de Permisos
                        </h1>
                        <p style="margin: 5px 0 0 0; color: var(--text-secondary); font-size: 0.95rem;">Selecciona un perfil y configura sus accesos a los diferentes módulos.</p>
                    </div>
                </div>

                <div style="background: var(--bg-card); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); margin-bottom: 25px; display: flex; align-items: center; gap: 20px;">
                    <div style="flex-grow: 1; max-width: 500px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Perfil a Configurar</label>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="background: var(--bg-active); color: var(--brand-primary); width: 40px; height: 40px; border-radius: 10px; display: flex; justify-content: center; align-items: center;">
                                <i class="fas fa-users-cog" style="font-size: 1.2rem;"></i>
                            </div>
                            <select id="sel-perfil-buscador" class="ux-select">
                                <option value="">Cargando perfiles...</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                            <thead style="background: var(--table-header-bg); border-bottom: 1px solid var(--border-color);">
                                <tr>
                                    <th style="padding: 16px 20px; width: 40%; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Módulo Web</th>
                                    <th style="padding: 16px 20px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"><i class="fas fa-plus-circle" style="color: #10b981; margin-right: 5px;"></i> Agregar</th>
                                    <th style="padding: 16px 20px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"><i class="fas fa-edit" style="color: #f59e0b; margin-right: 5px;"></i> Editar</th>
                                    <th style="padding: 16px 20px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"><i class="fas fa-trash-alt" style="color: var(--danger-text); margin-right: 5px;"></i> Eliminar</th>
                                    <th style="padding: 16px 20px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"><i class="fas fa-eye" style="color: var(--brand-primary); margin-right: 5px;"></i> Consultar</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-matriz-body">
                                <tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">Selecciona un perfil en la parte superior para cargar los permisos.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div id="pagination-controls-matriz" style="padding: 15px 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: center; gap: 8px; background: var(--bg-card); flex-wrap: wrap;"></div>
                    
                    <div style="padding: 20px 24px; background: var(--bg-card); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 15px;">
                        <button type="button" id="btn-cancelar" style="background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: none;">Descartar Cambios</button>
                        <button type="button" id="btn-guardar-matriz" style="background: #10b981; border: none; color: white; padding: 10px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; display: none; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">
                            <i class="fas fa-save"></i> <span>Guardar Privilegios</span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="ux-toast" class="ux-toast">
                <div id="toast-icon" style="font-size: 1.2rem;"></div>
                <div style="display: flex; flex-direction: column;">
                    <span id="toast-title" style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">Notificación</span>
                    <span id="toast-msg" style="color: var(--text-secondary); font-size: 0.85rem;"></span>
                </div>
            </div>
        `;

        await inicializarDatos();
        setupEventListeners();
    }

    function getToken() { return sessionStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) { console.error("Error", e); }
    }

    function showToast(title, msg, type = 'success') {
        const toast = document.getElementById('ux-toast');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerText = msg;
        
        if(type === 'success') {
            toast.className = 'ux-toast show success';
            document.getElementById('toast-icon').innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
        } else {
            toast.className = 'ux-toast show error';
            document.getElementById('toast-icon').innerHTML = '<i class="fas fa-exclamation-circle" style="color: var(--danger-text);"></i>';
        }
        setTimeout(() => { toast.classList.remove('show'); }, 4000);
    }

    // --- CARGA MASIVA DE DATOS INICIALES ---
    async function inicializarDatos() {
        try {
            const [resPerfiles, resModulos, resPermisos] = await Promise.all([ 
                fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }), 
                fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
                fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } })
            ]);

            if (resPerfiles.ok) perfilesDisponibles = await resPerfiles.json() || [];
            if (resModulos.ok) modulosDisponibles = await resModulos.json() || [];
            if (resPermisos.ok) permisosData = await resPermisos.json() || [];

            const selector = document.getElementById('sel-perfil-buscador');
            selector.innerHTML = '<option value="">-- Selecciona un Perfil --</option>';
            perfilesDisponibles.forEach(p => {
                selector.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`;
            });

        } catch (e) { 
            showToast("Error", "No se pudieron cargar los catálogos del sistema.", "error");
        }
    }

    async function refrescarDataPermisos() {
        try {
            const res = await fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) permisosData = await res.json() || [];
        } catch(e) { console.error(e); }
    }

    // --- CONSTRUIR EL ESTADO EN MEMORIA ---
    function construirMatrizState(perfilIdSeleccionado) {
        currentPerfilId = parseInt(perfilIdSeleccionado);
        currentPage = 1;

        if (!currentPerfilId) {
            matrizEdicion = [];
            renderTablaPaginada();
            return;
        }

        matrizEdicion = modulosDisponibles.map(modulo => {
            const dbPerm = permisosData.find(p => p.idPerfil === currentPerfilId && p.idModulo === modulo.id);
            return {
                idModulo: modulo.id,
                strNombreModulo: modulo.strNombreModulo,
                permisoId: dbPerm ? dbPerm.id : null,
                bitAgregar: dbPerm ? dbPerm.bitAgregar : false,
                bitEditar: dbPerm ? dbPerm.bitEditar : false,
                bitEliminar: dbPerm ? dbPerm.bitEliminar : false,
                bitConsulta: dbPerm ? dbPerm.bitConsulta : false
            };
        });

        renderTablaPaginada();
    }

    // --- RENDERIZAR LA TABLA (CON PAGINACIÓN) ---
    function renderTablaPaginada() {
        const tbody = document.getElementById('tabla-matriz-body');
        const btnGuardar = document.getElementById('btn-guardar-matriz');
        const btnCancelar = document.getElementById('btn-cancelar');
        const pagControls = document.getElementById('pagination-controls-matriz');

        tbody.innerHTML = '';

        if (!currentPerfilId || matrizEdicion.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 60px 40px; color: var(--text-secondary);"><i class="fas fa-mouse-pointer" style="font-size: 2.5rem; margin-bottom: 15px; opacity:0.5; display:block;"></i>Selecciona un perfil en la parte superior para configurar sus accesos.</td></tr>';
            btnGuardar.style.display = 'none';
            btnCancelar.style.display = 'none';
            pagControls.innerHTML = '';
            return;
        }

        // Mostrar botones si tiene permisos
        if(permisos.bitEditar) {
            btnGuardar.style.display = 'flex';
            btnCancelar.style.display = 'inline-block';
        }

        const disabledAttr = permisos.bitEditar ? '' : 'disabled';
        
        const start = (currentPage - 1) * rowsPerPage; 
        const paginatedData = matrizEdicion.slice(start, start + rowsPerPage);

        paginatedData.forEach((item, index) => {
            const globalIndex = start + index; 
            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';
            
            tr.innerHTML = `
                <td style="padding: 15px 20px; color: var(--text-primary); font-weight: 600; font-size: 0.95rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="background: var(--bg-hover); color: var(--text-secondary); width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center; border: 1px solid var(--border-color);">
                            <i class="fas fa-cube"></i>
                        </div>
                        ${item.strNombreModulo}
                    </div>
                </td>
                <td style="padding: 15px 20px; text-align: center;"><input type="checkbox" class="matriz-checkbox" data-idx="${globalIndex}" data-field="bitAgregar" ${item.bitAgregar ? 'checked' : ''} ${disabledAttr}></td>
                <td style="padding: 15px 20px; text-align: center;"><input type="checkbox" class="matriz-checkbox" data-idx="${globalIndex}" data-field="bitEditar" ${item.bitEditar ? 'checked' : ''} ${disabledAttr}></td>
                <td style="padding: 15px 20px; text-align: center;"><input type="checkbox" class="matriz-checkbox" data-idx="${globalIndex}" data-field="bitEliminar" ${item.bitEliminar ? 'checked' : ''} ${disabledAttr}></td>
                <td style="padding: 15px 20px; text-align: center;"><input type="checkbox" class="matriz-checkbox" data-idx="${globalIndex}" data-field="bitConsulta" ${item.bitConsulta ? 'checked' : ''} ${disabledAttr}></td>
            `;
            tbody.appendChild(tr);
        });

        // EventListeners Dinámicos
        tbody.querySelectorAll('.matriz-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                matrizEdicion[idx][field] = e.target.checked; 
            });
        });

        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-matriz'); 
        controls.innerHTML = '';
        const pageCount = Math.ceil(matrizEdicion.length / rowsPerPage);
        
        if(pageCount <= 1) return; 

        const createBtn = (text, pageNum, disabled = false, icon = null) => {
            const btn = document.createElement('button');
            const innerContent = icon ? `<i class="${icon}"></i>` : text;
            btn.innerHTML = innerContent;
            
            if (disabled) {
                btn.style.cssText = `background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; margin: 2px; cursor: not-allowed; opacity: 0.5;`;
                btn.disabled = true;
            } else {
                const isCurrent = pageNum === currentPage && text !== 'Inicio' && text !== 'Fin';
                btn.style.cssText = `background: ${isCurrent ? 'var(--brand-primary)' : 'var(--bg-card)'}; color: ${isCurrent ? 'var(--text-inverse)' : 'var(--text-secondary)'}; border: 1px solid ${isCurrent ? 'var(--brand-primary)' : 'var(--border-color)'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; margin: 2px;`;
                if (!isCurrent) btn.onmouseover = () => btn.style.background = 'var(--bg-hover)';
                if (!isCurrent) btn.onmouseout = () => btn.style.background = 'var(--bg-card)';
                btn.onclick = () => { currentPage = pageNum; renderTablaPaginada(); };
            }
            return btn;
        };

        // Paginación con Inicio y Fin unificados
        controls.appendChild(createBtn('Inicio', 1, currentPage === 1, 'fas fa-angle-double-left'));

        for (let i = 1; i <= pageCount; i++) {
            controls.appendChild(createBtn(i, i));
        }

        controls.appendChild(createBtn('Fin', pageCount, currentPage === pageCount, 'fas fa-angle-double-right'));
    }

    // --- GUARDAR TODA LA MATRIZ ---
    async function guardarMatrizCompleta() {
        if (!currentPerfilId) return;

        const btnSave = document.getElementById('btn-guardar-matriz');
        const originalContent = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Procesando...</span>';
        btnSave.disabled = true;

        const peticionesHTTP = [];

        matrizEdicion.forEach(item => {
            const payload = {
                idPerfil: currentPerfilId,
                idModulo: item.idModulo,
                bitAgregar: item.bitAgregar,
                bitEditar: item.bitEditar,
                bitEliminar: item.bitEliminar,
                bitConsulta: item.bitConsulta,
                bitDetalle: false
            };

            if (item.permisoId) {
                peticionesHTTP.push(
                    fetch(`/api/v1/permisos/${item.permisoId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                        body: JSON.stringify(payload)
                    })
                );
            } else {
                if (item.bitAgregar || item.bitEditar || item.bitEliminar || item.bitConsulta) {
                    peticionesHTTP.push(
                        fetch(`/api/v1/permisos`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                            body: JSON.stringify(payload)
                        })
                    );
                }
            }
        });

        try {
            await Promise.all(peticionesHTTP);
            showToast('¡Configuración Guardada!', 'Los privilegios del perfil han sido actualizados exitosamente.', 'success');
            
            await refrescarDataPermisos();
            construirMatrizState(currentPerfilId); 

        } catch (error) {
            showToast('Error', 'Hubo un problema de conexión al guardar.', 'error');
        } finally {
            btnSave.innerHTML = originalContent;
            btnSave.disabled = false;
        }
    }

    // --- EVENTOS DE LA INTERFAZ ---
    function setupEventListeners() {
        const selectPerfil = document.getElementById('sel-perfil-buscador');
        
        if (selectPerfil) {
            selectPerfil.addEventListener('change', (e) => {
                construirMatrizState(e.target.value);
            });
        }

        const btnGuardar = document.getElementById('btn-guardar-matriz');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', guardarMatrizCompleta);
        }

        const btnCancelar = document.getElementById('btn-cancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                const perfilId = document.getElementById('sel-perfil-buscador').value;
                construirMatrizState(perfilId); 
                showToast('Acción Descartada', 'Se han restaurado los valores originales.', 'success');
            });
        }
    }
    
    return { render: renderView };
})();