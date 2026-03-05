// static/js/permiso.js
const PermisoModule = (() => {
    let permisosData = [], perfilesDisponibles = [], modulosDisponibles = [], currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        // Pantalla de Acceso Denegado
        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div class="data-card-centered" style="max-width: 600px; padding: 40px; text-align: center; background: #fef2f2; border: 1px solid #f87171; border-radius: 12px;">
                    <i class="fas fa-shield-alt" style="font-size: 3rem; color: #ef4444; margin-bottom: 15px;"></i>
                    <h1 style="color: #991b1b; font-size: 1.8rem;">Acceso Denegado</h1>
                    <p style="color: #7f1d1d;">No tienes los permisos necesarios para visualizar este módulo.</p>
                </div>`; 
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-perm" class="btn-submit" style="background-color: #2563eb; width: auto; padding: 10px 20px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-key"></i> Asignar Permisos
               </button>` 
            : '';

        // Renderizado Principal
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 1000px; padding: 30px;">
                
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-unlock-alt" style="color: #64748b; margin-right: 10px;"></i>Matriz de Permisos
                        </h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.95rem;">Control de acceso por perfil y módulo.</p>
                    </div>
                    <div id="contenedor-btn-nuevo">
                        ${btnNuevoHTML}
                    </div>
                </div>

                <div id="alert-permiso" class="alert hidden"></div>

                <form id="form-permiso" class="vertical-form" style="display: none; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                    <h2 id="form-titulo" style="color: #1e293b; font-size: 1.25rem; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Nueva Asignación de Permisos</h2>
                    <input type="hidden" id="permiso-id" value="">
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div class="form-group">
                            <label>Perfil de Usuario</label>
                            <select id="sel-perfil" required></select>
                        </div>
                        <div class="form-group">
                            <label>Módulo del Sistema</label>
                            <select id="sel-modulo" required></select>
                        </div>
                        
                        <div class="form-group" style="grid-column: 1 / -1; margin-top: 10px;">
                            <label style="margin-bottom: 10px; display: block; color: #0f172a;">Acciones Permitidas (Privilegios)</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 25px; background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #334155; font-weight: 500;">
                                    <input type="checkbox" id="chk-agregar" style="width: 18px; height: 18px; cursor: pointer; accent-color: #2563eb;"> Agregar Registros
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #334155; font-weight: 500;">
                                    <input type="checkbox" id="chk-editar" style="width: 18px; height: 18px; cursor: pointer; accent-color: #f59e0b;"> Editar Registros
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #334155; font-weight: 500;">
                                    <input type="checkbox" id="chk-consulta" style="width: 18px; height: 18px; cursor: pointer; accent-color: #6366f1;"> Solo Lectura (Consultar)
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #334155; font-weight: 500;">
                                    <input type="checkbox" id="chk-eliminar" style="width: 18px; height: 18px; cursor: pointer; accent-color: #ef4444;"> Eliminar Registros
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions" style="justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 15px;">
                        <button type="button" id="btn-cancel-perm" class="btn-cancel" style="flex: none; width: 120px;">Cancelar</button>
                        <button type="submit" class="btn-submit" style="flex: none; width: 150px; background-color: #10b981;">
                            <i class="fas fa-save" style="margin-right: 5px;"></i> Guardar
                        </button>
                    </div>
                </form>

                <div id="tabla-contenedor" style="width: 100%;">
                    <div class="table-container" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <table style="min-width: 700px; width: 100%; border-collapse: collapse;">
                            <thead style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 12px 20px;">Perfil</th>
                                    <th style="padding: 12px 20px;">Módulo</th>
                                    <th style="padding: 12px 10px; text-align: center;" title="Agregar"><i class="fas fa-plus-circle" style="color: #64748b;"></i> AGR</th>
                                    <th style="padding: 12px 10px; text-align: center;" title="Editar"><i class="fas fa-edit" style="color: #64748b;"></i> EDI</th>
                                    <th style="padding: 12px 10px; text-align: center;" title="Consultar"><i class="fas fa-eye" style="color: #64748b;"></i> CON</th>
                                    <th style="padding: 12px 10px; text-align: center;" title="Eliminar"><i class="fas fa-trash-alt" style="color: #64748b;"></i> ELI</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 12px 20px; text-align: right;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-permisos-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls-perm" class="pagination"></div>
                </div>
            </div>`;

        setupEventListeners(); cargarCatalogos(); fetchPermisos();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) { console.error("Error", e); }
    }

    function showMessage(msg, isError = false) {
        const a = document.getElementById('alert-permiso'); 
        a.innerHTML = isError ? `<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>${msg}` : `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>${msg}`; 
        a.className = `alert ${isError ? 'error' : 'success'}`; 
        a.style.display = 'flex'; 
        setTimeout(() => a.style.display = 'none', 4000);
    }

    async function cargarCatalogos() {
        try {
            const [rp, rm] = await Promise.all([ fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }), fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } }) ]);
            if (rp.ok) { 
                perfilesDisponibles = await rp.json() || []; 
                const s = document.getElementById('sel-perfil'); 
                s.innerHTML = '<option value="">Seleccione el perfil...</option>'; 
                perfilesDisponibles.forEach(p => s.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`); 
            }
            if (rm.ok) { 
                modulosDisponibles = await rm.json() || []; 
                const s = document.getElementById('sel-modulo'); 
                s.innerHTML = '<option value="">Seleccione el módulo...</option>'; 
                modulosDisponibles.forEach(m => s.innerHTML += `<option value="${m.id}">${m.strNombreModulo}</option>`); 
            }
        } catch (e) { console.error("Error", e); }
    }

    async function fetchPermisos() {
        try { const res = await fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) { permisosData = await res.json() || []; currentPage = 1; renderTable(); } } catch (e) { console.error("Error", e); }
    }

    async function savePermiso(data, id) {
        const url = id ? `/api/v1/permisos/${id}` : '/api/v1/permisos';
        try { 
            const res = await fetch(url, { method: id?'PUT':'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) }); 
            if (res.ok) { showMessage('Configuración de permisos guardada exitosamente.'); resetForm(); fetchPermisos(); } 
        } catch (e) { showMessage("Error de conexión al servidor.", true); }
    }

    async function deletePermiso(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar estos privilegios? El perfil perderá el acceso configurado.')) return;
        try { const res = await fetch(`/api/v1/permisos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) { showMessage('Permisos revocados y eliminados.'); fetchPermisos(); } } catch (e) { showMessage("Error al eliminar.", true); }
    }

    // Diseño de matriz visual limpia para los booleanos
    function getI(s) { 
        return s 
            ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 1.15rem;"></i>' 
            : '<i class="fas fa-minus" style="color: #cbd5e1; font-size: 1rem;"></i>'; 
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-permisos-body'); tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage; const paginated = permisosData.slice(start, start + rowsPerPage);
        
        if (paginated.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #64748b;">No hay asignaciones de permisos configuradas.</td></tr>`; 
            return; 
        }
        
        paginated.forEach(p => {
            const tr = document.createElement('tr');
            tr.style.transition = "background-color 0.2s";
            tr.onmouseover = () => tr.style.backgroundColor = '#f8fafc';
            tr.onmouseout = () => tr.style.backgroundColor = 'transparent';

            tr.innerHTML = `
                <td style="padding: 15px 20px;"><strong style="color: #0f172a;"><i class="fas fa-id-badge" style="color: #94a3b8; margin-right: 6px;"></i>${p.perfilNombre}</strong></td>
                <td style="padding: 15px 20px; color: #475569;"><i class="fas fa-layer-group" style="color: #94a3b8; margin-right: 6px;"></i>${p.moduloNombre}</td>
                <td style="padding: 15px 10px; text-align: center;">${getI(p.bitAgregar)}</td>
                <td style="padding: 15px 10px; text-align: center;">${getI(p.bitEditar)}</td>
                <td style="padding: 15px 10px; text-align: center;">${getI(p.bitConsulta)}</td>
                <td style="padding: 15px 10px; text-align: center;">${getI(p.bitEliminar)}</td>`;
            
            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                td.style.padding = '15px 20px';
                td.style.textAlign = 'right';

                if (permisos.bitEditar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-edit"></i>'; 
                    b.className = 'btn-edit'; 
                    b.title = "Editar Privilegios";
                    b.onclick = () => loadFormData(p); 
                    td.appendChild(b); 
                }
                if (permisos.bitEliminar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    b.className = 'btn-delete'; 
                    b.title = "Revocar Permisos";
                    b.onclick = () => deletePermiso(p.id); 
                    td.appendChild(b); 
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-perm'); controls.innerHTML = '';
        const pageCount = Math.ceil(permisosData.length / rowsPerPage);
        if(pageCount <= 1) return; // Ocultar si hay solo 1 página

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; btn.onclick = () => { currentPage = i; renderTable(); }; controls.appendChild(btn);
        }
    }

    function loadFormData(p) {
        document.getElementById('form-permiso').style.display = 'block'; 
        document.getElementById('tabla-contenedor').style.display = 'none';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if (btnContainer) btnContainer.style.display = 'none';
        
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-edit" style="color: #3b82f6; margin-right: 8px;"></i>Modificar Permisos: ${p.perfilNombre}`;
        document.getElementById('permiso-id').value = p.id; 
        document.getElementById('sel-perfil').value = p.idPerfil; 
        document.getElementById('sel-modulo').value = p.idModulo;
        
        // Bloquear selects al editar para mantener integridad referencial, con estilo CSS adecuado
        document.getElementById('sel-perfil').disabled = true; 
        document.getElementById('sel-modulo').disabled = true;
        document.getElementById('sel-perfil').style.backgroundColor = "#f1f5f9";
        document.getElementById('sel-modulo').style.backgroundColor = "#f1f5f9";
        
        document.getElementById('chk-agregar').checked = p.bitAgregar; 
        document.getElementById('chk-editar').checked = p.bitEditar; 
        document.getElementById('chk-consulta').checked = p.bitConsulta; 
        document.getElementById('chk-eliminar').checked = p.bitEliminar;
    }

    function resetForm() {
        document.getElementById('form-permiso').reset(); 
        document.getElementById('permiso-id').value = '';
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-key" style="color: #10b981; margin-right: 8px;"></i>Nueva Asignación de Permisos`;
        
        document.getElementById('sel-perfil').disabled = false; 
        document.getElementById('sel-modulo').disabled = false;
        document.getElementById('sel-perfil').style.backgroundColor = "#ffffff";
        document.getElementById('sel-modulo').style.backgroundColor = "#ffffff";

        document.getElementById('form-permiso').style.display = 'none'; 
        document.getElementById('tabla-contenedor').style.display = 'block';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if (btnContainer) btnContainer.style.display = 'block';
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-perm');
        if (btn) btn.addEventListener('click', () => { resetForm(); document.getElementById('form-permiso').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none'; document.getElementById('contenedor-btn-nuevo').style.display = 'none'; });
        
        document.getElementById('btn-cancel-perm').addEventListener('click', resetForm);
        
        document.getElementById('form-permiso').addEventListener('submit', (e) => {
            e.preventDefault();
            savePermiso({ 
                idPerfil: parseInt(document.getElementById('sel-perfil').value), 
                idModulo: parseInt(document.getElementById('sel-modulo').value), 
                bitAgregar: document.getElementById('chk-agregar').checked, 
                bitEditar: document.getElementById('chk-editar').checked, 
                bitConsulta: document.getElementById('chk-consulta').checked, 
                bitEliminar: document.getElementById('chk-eliminar').checked, 
                bitDetalle: false 
            }, document.getElementById('permiso-id').value);
        });
    }
    
    return { render: renderView };
})();