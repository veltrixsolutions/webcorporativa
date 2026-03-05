// static/js/perfil.js
const PerfilModule = (() => {
    let perfilesData = [];
    let currentPage = 1;
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
            ? `<button id="btn-nuevo-perfil" class="btn-submit" style="background-color: #2563eb; width: auto; padding: 10px 20px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-plus"></i> Nuevo Perfil
               </button>` 
            : '';

        // Renderizado Principal
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 1000px; padding: 30px;">
                
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-id-card-alt" style="color: #64748b; margin-right: 10px;"></i>Gestión de Perfiles
                        </h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.95rem;">Administración de roles y jerarquías del sistema.</p>
                    </div>
                    <div id="contenedor-btn-nuevo">
                        ${btnNuevoHTML}
                    </div>
                </div>

                <div id="alert-message" class="alert hidden"></div>

                <form id="form-perfil" class="vertical-form" style="display: none; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                    <h2 id="form-titulo" style="color: #1e293b; font-size: 1.25rem; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Crear Nuevo Perfil</h2>
                    
                    <input type="hidden" id="perfil-id" value="">
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div class="form-group">
                            <label>Nombre del Perfil</label>
                            <input type="text" id="nombre-perfil" required placeholder="Ej. Gerencia Regional">
                        </div>
                        <div class="form-group">
                            <label>Nivel de Acceso Global</label>
                            <select id="es-admin">
                                <option value="false">Usuario Estándar</option>
                                <option value="true">Super Administrador (Acceso Total)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions" style="justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 15px;">
                        <button type="button" id="btn-cancel" class="btn-cancel" style="flex: none; width: 120px;">Cancelar</button>
                        <button type="submit" class="btn-submit" style="flex: none; width: 150px; background-color: #10b981;">
                            <i class="fas fa-save" style="margin-right: 5px;"></i> Guardar
                        </button>
                    </div>
                </form>

                <div id="tabla-contenedor" style="width: 100%;">
                    <div class="table-container" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <table style="min-width: 600px; width: 100%; border-collapse: collapse;">
                            <thead style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 12px 20px;">Nombre del Perfil</th>
                                    <th style="padding: 12px 20px;">Jerarquía</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 12px 20px; text-align: right;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-perfiles-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls" class="pagination"></div>
                </div>
            </div>`;

        setupEventListeners(); fetchPerfiles();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) { console.error(e); }
    }

    function showMessage(msg, isError = false) {
        const a = document.getElementById('alert-message'); 
        a.innerHTML = isError ? `<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>${msg}` : `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>${msg}`; 
        a.className = `alert ${isError ? 'error' : 'success'}`; 
        a.style.display = 'flex'; 
        setTimeout(() => a.style.display = 'none', 4000);
    }

    async function fetchPerfiles() {
        try { const res = await fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) { perfilesData = await res.json() || []; currentPage = 1; renderTable(); } } catch (e) { console.error(e); }
    }

    async function savePerfil(data, id) {
        const method = id ? 'PUT' : 'POST'; 
        const url = id ? `/api/v1/perfiles/${id}` : '/api/v1/perfiles';
        try { 
            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) }); 
            if (res.ok) { showMessage('Perfil guardado exitosamente.'); resetForm(); fetchPerfiles(); } 
            else { showMessage("Error al guardar el perfil.", true); }
        } catch (e) { showMessage("Error de conexión al servidor.", true); }
    }

    async function deletePerfil(id) {
        if (!confirm('¿Estás seguro de eliminar este perfil? Se afectarán los usuarios y permisos vinculados a él.')) return;
        try { 
            const res = await fetch(`/api/v1/perfiles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { showMessage('Perfil eliminado.'); fetchPerfiles(); }
            else { showMessage("No se puede eliminar un perfil en uso.", true); }
        } catch (e) { showMessage("Error al eliminar.", true); }
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-perfiles-body'); tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage; const paginated = perfilesData.slice(start, start + rowsPerPage);
        
        if (paginated.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 30px; color: #64748b;">No hay perfiles registrados.</td></tr>`; 
            return; 
        }

        paginated.forEach(p => {
            const tr = document.createElement('tr');
            tr.style.transition = "background-color 0.2s";
            tr.onmouseover = () => tr.style.backgroundColor = '#f8fafc';
            tr.onmouseout = () => tr.style.backgroundColor = 'transparent';

            // Badge visual para diferenciar jerarquías
            const jerarquiaBadge = p.bitAdministrador 
                ? `<span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-shield-alt" style="margin-right: 6px;"></i>Super Admin</span>` 
                : `<span style="background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-user" style="margin-right: 6px;"></i>Estándar</span>`;

            // ¡Adiós columna de ID!
            tr.innerHTML = `
                <td style="padding: 15px 20px;"><strong style="color: #0f172a; font-size: 0.95rem;">${p.strNombrePerfil}</strong></td>
                <td style="padding: 15px 20px;">${jerarquiaBadge}</td>`;

            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                td.style.padding = '15px 20px';
                td.style.textAlign = 'right';

                if (permisos.bitEditar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-edit"></i>'; 
                    b.className = 'btn-edit'; 
                    b.title = "Editar Perfil";
                    b.onclick = () => loadFormData(p); 
                    td.appendChild(b); 
                }
                // Si el perfil es el Admin principal (id = 1), evitamos que se pueda eliminar por accidente
                if (permisos.bitEliminar && p.id !== 1) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    b.className = 'btn-delete'; 
                    b.title = "Eliminar Perfil";
                    b.onclick = () => deletePerfil(p.id); 
                    td.appendChild(b); 
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls'); controls.innerHTML = '';
        const pageCount = Math.ceil(perfilesData.length / rowsPerPage);
        if(pageCount <= 1) return; 

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; btn.onclick = () => { currentPage = i; renderTable(); }; controls.appendChild(btn);
        }
    }

    function loadFormData(p) {
        document.getElementById('form-perfil').style.display = 'block'; 
        document.getElementById('tabla-contenedor').style.display = 'none';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if (btnContainer) btnContainer.style.display = 'none';
        
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-edit" style="color: #3b82f6; margin-right: 8px;"></i>Editar Perfil: ${p.strNombrePerfil}`;
        
        document.getElementById('perfil-id').value = p.id; 
        document.getElementById('nombre-perfil').value = p.strNombrePerfil; 
        document.getElementById('es-admin').value = p.bitAdministrador.toString();
        
        // Evitar quitar el rol de admin al perfil ID 1 por seguridad
        if(p.id === 1) {
            document.getElementById('es-admin').disabled = true;
            document.getElementById('es-admin').title = "No se puede quitar el rol de Super Administrador al perfil principal.";
        } else {
            document.getElementById('es-admin').disabled = false;
            document.getElementById('es-admin').title = "";
        }
    }

    function resetForm() {
        document.getElementById('form-perfil').reset(); 
        document.getElementById('perfil-id').value = '';
        document.getElementById('es-admin').disabled = false;
        
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-plus" style="color: #10b981; margin-right: 8px;"></i>Crear Nuevo Perfil`;
        
        document.getElementById('form-perfil').style.display = 'none'; 
        document.getElementById('tabla-contenedor').style.display = 'block';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if (btnContainer) btnContainer.style.display = 'block';
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-perfil');
        if (btn) btn.addEventListener('click', () => { resetForm(); document.getElementById('form-perfil').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none'; document.getElementById('contenedor-btn-nuevo').style.display = 'none'; });
        
        document.getElementById('btn-cancel').addEventListener('click', resetForm);
        
        document.getElementById('form-perfil').addEventListener('submit', (e) => { 
            e.preventDefault(); 
            savePerfil({ 
                strNombrePerfil: document.getElementById('nombre-perfil').value.trim(), 
                bitAdministrador: document.getElementById('es-admin').value === 'true' 
            }, document.getElementById('perfil-id').value); 
        });
    }
    
    return { render: renderView };
})();