// static/js/permiso.js
const PermisoModule = (() => {
    let permisosData = [], perfilesDisponibles = [], modulosDisponibles = [];
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId, perfilId) {
        // 1. Validar seguridad del usuario actual
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                        <div style="width: 80px; height: 80px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-lock" style="font-size: 2.5rem; color: #ef4444;"></i>
                        </div>
                        <h1 style="color: #0f172a; font-size: 1.8rem; margin-bottom: 10px; font-weight: 700;">Acceso Restringido</h1>
                        <p style="color: #64748b; font-size: 1rem; line-height: 1.5;">No tienes los privilegios necesarios para visualizar la matriz de permisos.</p>
                    </div>
                </div>`;
            return;
        }

        // 2. Inyectar UI (Estilo Cuadrícula Estática Veltrix)
        container.innerHTML = `
            <style>
                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: #ffffff; border-radius: 10px; padding: 16px 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 4px solid #3b82f6; }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: #ef4444; }
                
                .ux-table-row { transition: background-color 0.2s ease; border-bottom: 1px solid #e2e8f0; }
                .ux-table-row:hover { background-color: #f8fafc; }
                
                .ux-select { width: 100%; max-width: 400px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; color: #0f172a; transition: all 0.2s; background: #ffffff; font-weight: 500; cursor: pointer; }
                .ux-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.15); }

                /* Checkboxes Grandes y Centrados */
                .matriz-checkbox { width: 20px; height: 20px; accent-color: #2563eb; cursor: pointer; transition: transform 0.1s; }
                .matriz-checkbox:hover { transform: scale(1.1); }
                .matriz-checkbox:disabled { cursor: not-allowed; opacity: 0.6; filter: grayscale(100%); }
                
                th { text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem; padding: 16px; color: #475569; }
                td { padding: 14px 16px; }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                <div style="margin-bottom: 25px;">
                    <h1 style="color: #0f172a; font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px;">Matriz de Permisos</h1>
                    <p style="color: #64748b; font-size: 1rem; margin: 0;">Selecciona un perfil y configura sus accesos a los diferentes módulos.</p>
                </div>

                <div style="background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-bottom: 20px; display: flex; align-items: center; gap: 20px;">
                    <div style="flex-grow: 1; max-width: 500px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase;">[Datos Perfil]</label>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <i class="fas fa-users-cog" style="color: #3b82f6; font-size: 1.5rem;"></i>
                            <select id="sel-perfil-buscador" class="ux-select">
                                <option value="">Cargando perfiles...</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
                    <div style="background: #1e293b; padding: 12px 20px;">
                        <span style="color: #f8fafc; font-weight: 600; font-size: 0.9rem;">[Módulos Web]</span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                            <thead style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                                <tr>
                                    <th style="width: 30%;">Módulo</th>
                                    <th style="text-align: center; width: 15%;"><i class="fas fa-plus-circle" style="color: #10b981;"></i> Agregar</th>
                                    <th style="text-align: center; width: 15%;"><i class="fas fa-edit" style="color: #f59e0b;"></i> Editar</th>
                                    <th style="text-align: center; width: 15%;"><i class="fas fa-trash-alt" style="color: #ef4444;"></i> Eliminar</th>
                                    <th style="text-align: center; width: 15%;"><i class="fas fa-eye" style="color: #3b82f6;"></i> Consultar</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-matriz-body">
                                <tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">Selecciona un perfil en la parte superior para cargar los permisos.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 15px;">
                        <button type="button" id="btn-cancelar" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: none;">Cancelar</button>
                        <button type="button" id="btn-guardar-matriz" style="background: #10b981; border: none; color: white; padding: 10px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; display: none; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">
                            <i class="fas fa-save"></i> <span>Guardar Privilegios</span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="ux-toast" class="ux-toast">
                <div id="toast-icon" style="font-size: 1.2rem;"></div>
                <div style="display: flex; flex-direction: column;">
                    <span id="toast-title" style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">Notificación</span>
                    <span id="toast-msg" style="color: #64748b; font-size: 0.85rem;"></span>
                </div>
            </div>
        `;

        await inicializarDatos();
        setupEventListeners();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

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
            document.getElementById('toast-icon').innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
        }
        setTimeout(() => { toast.classList.remove('show'); }, 4000);
    }

    // --- CARGA MASIVA DE DATOS INICIALES ---
    async function inicializarDatos() {
        try {
            // Hacemos 3 peticiones al mismo tiempo para optimizar velocidad
            const [resPerfiles, resModulos, resPermisos] = await Promise.all([ 
                fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }), 
                fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
                fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } })
            ]);

            if (resPerfiles.ok) perfilesDisponibles = await resPerfiles.json() || [];
            if (resModulos.ok) modulosDisponibles = await resModulos.json() || [];
            if (resPermisos.ok) permisosData = await resPermisos.json() || [];

            // Llenar el Dropdown de Perfiles
            const selector = document.getElementById('sel-perfil-buscador');
            selector.innerHTML = '<option value="">-- Selecciona un Perfil --</option>';
            perfilesDisponibles.forEach(p => {
                selector.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`;
            });

        } catch (e) { 
            console.error("Error de conexión al servidor", e); 
            showToast("Error", "No se pudieron cargar los catálogos del sistema.", "error");
        }
    }

    // --- RECARGAR PERMISOS EN SEGUNDO PLANO (DESPUÉS DE GUARDAR) ---
    async function refrescarDataPermisos() {
        try {
            const res = await fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) permisosData = await res.json() || [];
        } catch(e) { console.error(e); }
    }

    // --- RENDERIZAR LA MATRIZ (LA CUADRÍCULA ESTÁTICA) ---
    function renderMatriz(perfilIdSeleccionado) {
        const tbody = document.getElementById('tabla-matriz-body');
        const btnGuardar = document.getElementById('btn-guardar-matriz');
        const btnCancelar = document.getElementById('btn-cancelar');
        tbody.innerHTML = '';

        if (!perfilIdSeleccionado) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-mouse-pointer" style="font-size: 2rem; margin-bottom: 15px; opacity:0.5; display:block;"></i>Selecciona un perfil en la parte superior para configurar sus accesos.</td></tr>';
            btnGuardar.style.display = 'none';
            btnCancelar.style.display = 'none';
            return;
        }

        // Si el usuario actual no tiene permiso de Editar, mostramos pero bloqueamos
        const disabledAttr = permisos.bitEditar ? '' : 'disabled';
        
        // Si tiene permiso de editar, mostramos los botones
        if(permisos.bitEditar) {
            btnGuardar.style.display = 'flex';
            btnCancelar.style.display = 'inline-block';
        }

        // Pintamos TODOS los módulos existentes en la base de datos
        modulosDisponibles.forEach(modulo => {
            // Buscamos si ya existe un registro de permiso para [Este Perfil] + [Este Módulo]
            const permisoActual = permisosData.find(p => p.idPerfil == perfilIdSeleccionado && p.idModulo == modulo.id);

            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';
            tr.dataset.moduloId = modulo.id;
            tr.dataset.permisoId = permisoActual ? permisoActual.id : ''; // Si existe guardamos su ID para hacer PUT, si no hacemos POST

            const bitAgr = permisoActual ? permisoActual.bitAgregar : false;
            const bitEdi = permisoActual ? permisoActual.bitEditar : false;
            const bitEli = permisoActual ? permisoActual.bitEliminar : false;
            const bitCon = permisoActual ? permisoActual.bitConsulta : false;

            tr.innerHTML = `
                <td style="color: #0f172a; font-weight: 600; font-size: 0.95rem;">${modulo.strNombreModulo}</td>
                <td style="text-align: center;"><input type="checkbox" class="matriz-checkbox chk-agr" ${bitAgr ? 'checked' : ''} ${disabledAttr}></td>
                <td style="text-align: center;"><input type="checkbox" class="matriz-checkbox chk-edi" ${bitEdi ? 'checked' : ''} ${disabledAttr}></td>
                <td style="text-align: center;"><input type="checkbox" class="matriz-checkbox chk-eli" ${bitEli ? 'checked' : ''} ${disabledAttr}></td>
                <td style="text-align: center;"><input type="checkbox" class="matriz-checkbox chk-con" ${bitCon ? 'checked' : ''} ${disabledAttr}></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- GUARDAR TODA LA CUADRÍCULA ---
    async function guardarMatrizCompleta() {
        const perfilId = parseInt(document.getElementById('sel-perfil-buscador').value);
        if (!perfilId) return;

        const btnSave = document.getElementById('btn-guardar-matriz');
        const originalContent = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Procesando...</span>';
        btnSave.disabled = true;

        const filas = document.querySelectorAll('#tabla-matriz-body tr.ux-table-row');
        const peticionesHTTP = [];

        filas.forEach(fila => {
            const modId = parseInt(fila.dataset.moduloId);
            const permId = fila.dataset.permisoId; // String, vacío si es nuevo

            const chkAgr = fila.querySelector('.chk-agr').checked;
            const chkEdi = fila.querySelector('.chk-edi').checked;
            const chkEli = fila.querySelector('.chk-eli').checked;
            const chkCon = fila.querySelector('.chk-con').checked;

            const payload = {
                idPerfil: perfilId,
                idModulo: modId,
                bitAgregar: chkAgr,
                bitEditar: chkEdi,
                bitEliminar: chkEli,
                bitConsulta: chkCon,
                bitDetalle: false
            };

            if (permId) {
                // Si el permiso ya existía en la BD, hacemos un UPDATE (PUT)
                peticionesHTTP.push(
                    fetch(`/api/v1/permisos/${permId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                        body: JSON.stringify(payload)
                    })
                );
            } else {
                // Si NO existía, hacemos un INSERT (POST), pero SOLO si al menos marcó una casilla
                if (chkAgr || chkEdi || chkEli || chkCon) {
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
            // Ejecutamos TODAS las peticiones al servidor simultáneamente
            await Promise.all(peticionesHTTP);
            showToast('¡Configuración Guardada!', 'Los privilegios del perfil han sido actualizados exitosamente.', 'success');
            
            // Recargamos silenciosamente los datos de la BD y refrescamos la tabla
            await refrescarDataPermisos();
            renderMatriz(perfilId); 

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
        
        // Cuando el usuario cambia de perfil en el Dropdown
        if (selectPerfil) {
            selectPerfil.addEventListener('change', (e) => {
                const perfilId = e.target.value;
                renderMatriz(perfilId);
            });
        }

        // Botón Guardar Matriz
        const btnGuardar = document.getElementById('btn-guardar-matriz');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', guardarMatrizCompleta);
        }

        // Botón Cancelar (Restaura la tabla a como estaba en la base de datos)
        const btnCancelar = document.getElementById('btn-cancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                const perfilId = document.getElementById('sel-perfil-buscador').value;
                renderMatriz(perfilId); // Vuelve a pintar los checks con los datos originales
                showToast('Acción Cancelada', 'Se han restaurado los valores originales.', 'success');
            });
        }
    }
    
    return { render: renderView };
})();