// static/js/permiso.js
const PermisoModule = (() => {
    let permisosData = [], perfilesDisponibles = [], modulosDisponibles = [];
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%; animation: fadeIn 0.5s ease-out;">
                    <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
                        <div style="width: 90px; height: 90px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.1);">
                            <i class="fas fa-lock" style="font-size: 2.8rem; color: #ef4444;"></i>
                        </div>
                        <h1 style="color: #0f172a; font-size: 1.8rem; margin-bottom: 12px; font-weight: 800; letter-spacing: -0.5px;">Acceso Restringido</h1>
                        <p style="color: #64748b; font-size: 1.05rem; line-height: 1.6;">Tu perfil actual no cuenta con los privilegios corporativos necesarios para visualizar la matriz de seguridad.</p>
                    </div>
                </div>`;
            return;
        }

        // Estilos UX Premium Inyectados
        container.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: #ffffff; border-radius: 12px; padding: 16px 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 5px solid #3b82f6; font-family: 'Inter', sans-serif; }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: #ef4444; }
                
                /* Select Corporativo */
                .ux-select-wrapper { position: relative; width: 100%; max-width: 450px; }
                .ux-select { width: 100%; padding: 14px 20px 14px 45px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; color: #0f172a; transition: all 0.3s ease; background: #f8fafc; font-weight: 600; cursor: pointer; appearance: none; }
                .ux-select:focus { outline: none; border-color: #3b82f6; background: #ffffff; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
                .ux-select-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #3b82f6; font-size: 1.2rem; pointer-events: none; }
                .ux-select-arrow { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }

                /* Tabla Premium */
                .veltrix-card { background: #ffffff; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03), 0 4px 6px -2px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; overflow: hidden; margin-bottom: 25px; animation: fadeIn 0.4s ease-out; }
                .card-header { padding: 20px 25px; border-bottom: 1px solid #f1f5f9; background: #ffffff; display: flex; align-items: center; gap: 12px; }
                .card-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px; }
                .card-badge { background: #eff6ff; color: #3b82f6; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

                .ux-table-row { transition: all 0.2s ease; border-bottom: 1px solid #f1f5f9; }
                .ux-table-row:hover { background-color: #f8fafc; transform: scale(1.001); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); z-index: 10; position: relative; }
                th { text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.8rem; padding: 18px 20px; color: #64748b; background: #f8fafc; font-weight: 700; }
                td { padding: 16px 20px; }

                /* CHECKBOXES CORPORATIVOS VELTRIX */
                .vt-checkbox { 
                    appearance: none; -webkit-appearance: none; 
                    width: 24px; height: 24px; 
                    border: 2px solid #cbd5e1; border-radius: 6px; 
                    background-color: #ffffff; 
                    cursor: pointer; position: relative; 
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
                    margin: 0 auto; display: block;
                }
                .vt-checkbox:hover { border-color: #94a3b8; transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .vt-checkbox:disabled { cursor: not-allowed; opacity: 0.5; background-color: #f1f5f9; transform: none; box-shadow: none; }
                
                /* Icono de Check personalizado creado con CSS */
                .vt-checkbox::after {
                    content: ''; position: absolute; display: none;
                    left: 7px; top: 3px; width: 6px; height: 12px;
                    border: solid white; border-width: 0 2px 2px 0;
                    transform: rotate(45deg);
                }
                .vt-checkbox:checked::after { display: block; animation: fadeIn 0.2s; }

                /* Colores dinámicos por columna */
                .chk-agr:checked { background-color: #10b981; border-color: #10b981; box-shadow: 0 4px 10px rgba(16,185,129,0.2); }
                .chk-edi:checked { background-color: #f59e0b; border-color: #f59e0b; box-shadow: 0 4px 10px rgba(245,158,11,0.2); }
                .chk-eli:checked { background-color: #ef4444; border-color: #ef4444; box-shadow: 0 4px 10px rgba(239,68,68,0.2); }
                .chk-con:checked { background-color: #3b82f6; border-color: #3b82f6; box-shadow: 0 4px 10px rgba(59,130,246,0.2); }

                /* Botones */
                .btn-action { padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; border: none; }
                .btn-save { background: #10b981; color: white; box-shadow: 0 4px 6px rgba(16,185,129,0.2); }
                .btn-save:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(16,185,129,0.3); }
                .btn-cancel { background: #ffffff; color: #475569; border: 1px solid #e2e8f0; }
                .btn-cancel:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 10px 20px 40px;">
                <div style="margin-bottom: 30px; animation: fadeIn 0.3s ease-out;">
                    <h1 style="color: #0f172a; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px;">Matriz de Permisos</h1>
                    <p style="color: #64748b; font-size: 1.05rem; margin: 0;">Administra los privilegios corporativos de acceso y modificación para cada rol.</p>
                </div>

                <div class="veltrix-card">
                    <div class="card-header">
                        <span class="card-badge">Paso 1</span>
                        <h2 class="card-title">Selección de Perfil</h2>
                    </div>
                    <div style="padding: 25px;">
                        <div class="ux-select-wrapper">
                            <i class="fas fa-id-badge ux-select-icon"></i>
                            <select id="sel-perfil-buscador" class="ux-select">
                                <option value="">Seleccione el perfil a configurar...</option>
                            </select>
                            <i class="fas fa-chevron-down ux-select-arrow"></i>
                        </div>
                    </div>
                </div>

                <div class="veltrix-card">
                    <div class="card-header">
                        <span class="card-badge" style="background: #fef2f2; color: #ef4444;">Paso 2</span>
                        <h2 class="card-title">Asignación de Privilegios</h2>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                            <thead>
                                <tr>
                                    <th style="width: 28%;"><i class="fas fa-layer-group" style="margin-right: 6px; color: #94a3b8;"></i> Módulo del Sistema</th>
                                    <th style="text-align: center; width: 18%;"><i class="fas fa-plus-circle" style="color: #10b981; font-size: 1.1rem; margin-bottom: 4px; display: block;"></i> Agregar</th>
                                    <th style="text-align: center; width: 18%;"><i class="fas fa-edit" style="color: #f59e0b; font-size: 1.1rem; margin-bottom: 4px; display: block;"></i> Editar</th>
                                    <th style="text-align: center; width: 18%;"><i class="fas fa-trash-alt" style="color: #ef4444; font-size: 1.1rem; margin-bottom: 4px; display: block;"></i> Eliminar</th>
                                    <th style="text-align: center; width: 18%;"><i class="fas fa-eye" style="color: #3b82f6; font-size: 1.1rem; margin-bottom: 4px; display: block;"></i> Consultar</th>
                                </tr>
                            </thead>
                            <tbody id="tabla-matriz-body">
                                <tr>
                                    <td colspan="5" style="text-align: center; padding: 60px 20px;">
                                        <div style="color: #cbd5e1; margin-bottom: 15px;"><i class="fas fa-mouse-pointer" style="font-size: 3rem;"></i></div>
                                        <p style="color: #64748b; font-size: 1.1rem; font-weight: 500; margin: 0;">Seleccione un perfil en la parte superior para cargar sus accesos.</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div id="footer-acciones" style="padding: 20px 25px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: none; justify-content: flex-end; gap: 15px;">
                        <button type="button" id="btn-cancelar" class="btn-action btn-cancel"><i class="fas fa-undo"></i> Restaurar</button>
                        <button type="button" id="btn-guardar-matriz" class="btn-action btn-save">
                            <i class="fas fa-shield-alt"></i> <span>Aplicar Privilegios</span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="ux-toast" class="ux-toast">
                <div id="toast-icon" style="font-size: 1.3rem;"></div>
                <div style="display: flex; flex-direction: column;">
                    <span id="toast-title" style="font-weight: 700; color: #0f172a; font-size: 0.95rem;"></span>
                    <span id="toast-msg" style="color: #64748b; font-size: 0.85rem; margin-top: 2px;"></span>
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
            selector.innerHTML = '<option value="">Seleccione el perfil a configurar...</option>';
            perfilesDisponibles.forEach(p => {
                selector.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`;
            });
        } catch (e) { 
            showToast("Error de Conexión", "No se pudieron cargar los catálogos del sistema.", "error");
        }
    }

    async function refrescarDataPermisos() {
        try {
            const res = await fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) permisosData = await res.json() || [];
        } catch(e) {}
    }

    function renderMatriz(perfilIdSeleccionado) {
        const tbody = document.getElementById('tabla-matriz-body');
        const footerAcciones = document.getElementById('footer-acciones');
        tbody.innerHTML = '';

        if (!perfilIdSeleccionado) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 60px 20px;"><div style="color: #cbd5e1; margin-bottom: 15px;"><i class="fas fa-mouse-pointer" style="font-size: 3rem;"></i></div><p style="color: #64748b; font-size: 1.1rem; font-weight: 500; margin: 0;">Seleccione un perfil en la parte superior para cargar sus accesos.</p></td></tr>';
            footerAcciones.style.display = 'none';
            return;
        }

        const disabledAttr = permisos.bitEditar ? '' : 'disabled';
        if(permisos.bitEditar) footerAcciones.style.display = 'flex';

        modulosDisponibles.forEach(modulo => {
            const permisoActual = permisosData.find(p => p.idPerfil == perfilIdSeleccionado && p.idModulo == modulo.id);
            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';
            tr.dataset.moduloId = modulo.id;
            tr.dataset.permisoId = permisoActual ? permisoActual.id : '';

            const bitAgr = permisoActual ? permisoActual.bitAgregar : false;
            const bitEdi = permisoActual ? permisoActual.bitEditar : false;
            const bitEli = permisoActual ? permisoActual.bitEliminar : false;
            const bitCon = permisoActual ? permisoActual.bitConsulta : false;

            tr.innerHTML = `
                <td style="color: #0f172a; font-weight: 700; font-size: 0.95rem; border-right: 1px solid #f1f5f9;">${modulo.strNombreModulo}</td>
                <td><input type="checkbox" class="vt-checkbox chk-agr" ${bitAgr ? 'checked' : ''} ${disabledAttr} title="Permitir Agregar"></td>
                <td><input type="checkbox" class="vt-checkbox chk-edi" ${bitEdi ? 'checked' : ''} ${disabledAttr} title="Permitir Editar"></td>
                <td><input type="checkbox" class="vt-checkbox chk-eli" ${bitEli ? 'checked' : ''} ${disabledAttr} title="Permitir Eliminar"></td>
                <td><input type="checkbox" class="vt-checkbox chk-con" ${bitCon ? 'checked' : ''} ${disabledAttr} title="Permitir Consultar"></td>
            `;
            tbody.appendChild(tr);
        });
    }

    async function guardarMatrizCompleta() {
        const perfilId = parseInt(document.getElementById('sel-perfil-buscador').value);
        if (!perfilId) return;

        const btnSave = document.getElementById('btn-guardar-matriz');
        const originalContent = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Aplicando...</span>';
        btnSave.disabled = true;

        const filas = document.querySelectorAll('#tabla-matriz-body tr.ux-table-row');
        const peticionesHTTP = [];

        filas.forEach(fila => {
            const modId = parseInt(fila.dataset.moduloId);
            const permId = fila.dataset.permisoId;

            const chkAgr = fila.querySelector('.chk-agr').checked;
            const chkEdi = fila.querySelector('.chk-edi').checked;
            const chkEli = fila.querySelector('.chk-eli').checked;
            const chkCon = fila.querySelector('.chk-con').checked;

            const payload = { idPerfil: perfilId, idModulo: modId, bitAgregar: chkAgr, bitEditar: chkEdi, bitEliminar: chkEli, bitConsulta: chkCon, bitDetalle: false };

            if (permId) {
                peticionesHTTP.push(fetch(`/api/v1/permisos/${permId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(payload) }));
            } else if (chkAgr || chkEdi || chkEli || chkCon) {
                peticionesHTTP.push(fetch(`/api/v1/permisos`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(payload) }));
            }
        });

        try {
            await Promise.all(peticionesHTTP);
            showToast('Seguridad Actualizada', 'Los privilegios del perfil han sido aplicados exitosamente en el servidor.', 'success');
            await refrescarDataPermisos();
            renderMatriz(perfilId); 
        } catch (error) {
            showToast('Fallo del Servidor', 'Hubo un problema de conexión al guardar.', 'error');
        } finally {
            btnSave.innerHTML = originalContent;
            btnSave.disabled = false;
        }
    }

    function setupEventListeners() {
        const selectPerfil = document.getElementById('sel-perfil-buscador');
        if (selectPerfil) { selectPerfil.addEventListener('change', (e) => { renderMatriz(e.target.value); }); }

        const btnGuardar = document.getElementById('btn-guardar-matriz');
        if (btnGuardar) { btnGuardar.addEventListener('click', guardarMatrizCompleta); }

        const btnCancelar = document.getElementById('btn-cancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                renderMatriz(document.getElementById('sel-perfil-buscador').value); 
                showToast('Acción Restaurada', 'Se han devuelto los valores a su estado original.', 'success');
            });
        }
    }
    
    return { render: renderView };
})();