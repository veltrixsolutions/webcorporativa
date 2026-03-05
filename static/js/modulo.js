// static/js/modulo.js
const ModuloApp = (() => {
    let modulosData = [];
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
                    <p style="color: #7f1d1d;">No tienes privilegios para ver esta pantalla.</p>
                </div>`;
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-mod" class="btn-submit" style="background-color: #2563eb; width: auto; padding: 10px 20px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-plus"></i> Nuevo Módulo
               </button>` 
            : '';

        // Renderizado Principal
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 1000px; padding: 30px;">
                
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-cubes" style="color: #64748b; margin-right: 10px;"></i>Gestión de Módulos
                        </h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.95rem;">Administración de las secciones del sistema corporativo.</p>
                    </div>
                    <div id="contenedor-btn-nuevo">
                        ${btnNuevoHTML}
                    </div>
                </div>

                <div id="alert-modulo" class="alert hidden"></div>

                <form id="form-modulo" class="vertical-form" style="display: none; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                    <h2 id="form-titulo" style="color: #1e293b; font-size: 1.25rem; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Crear Nuevo Módulo</h2>
                    
                    <input type="hidden" id="modulo-id" value="">
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div class="form-group" style="max-width: 500px;">
                            <label>Nombre del Módulo</label>
                            <input type="text" id="nombre-modulo" required autocomplete="off" placeholder="Ej. Inventario, Reportes, etc.">
                        </div>
                    </div>
                    
                    <div class="form-actions" style="justify-content: flex-start; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 15px;">
                        <button type="submit" class="btn-submit" style="flex: none; width: 150px; background-color: #10b981;">
                            <i class="fas fa-save" style="margin-right: 5px;"></i> Guardar
                        </button>
                        <button type="button" id="btn-cancel-mod" class="btn-cancel" style="flex: none; width: 120px;">Cancelar</button>
                    </div>
                </form>

                <div id="tabla-contenedor" style="width: 100%;">
                    <div class="table-container" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <table style="min-width: 500px; width: 100%; border-collapse: collapse;">
                            <thead style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 12px 20px;">Nombre del Módulo</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 12px 20px; text-align: right;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-modulos-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls-mod" class="pagination"></div>
                </div>
            </div>`;

        setupEventListeners();
        fetchModulos();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    // --- MAGIA DEL BYPASS PARA ADMINS ---
    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) {
            permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true };
            return;
        }
        try {
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) permisos = await res.json();
        } catch (e) { console.error("Error de permisos"); }
    }

    function showMessage(msg, isError = false) {
        const alertBox = document.getElementById('alert-modulo');
        alertBox.innerHTML = isError ? `<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>${msg}` : `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>${msg}`; 
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'flex';
        setTimeout(() => alertBox.style.display = 'none', 4000);
    }

    async function fetchModulos() {
        try {
            const res = await fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                modulosData = await res.json() || [];
                currentPage = 1; 
                renderTable();
            }
        } catch (error) { console.error("Error al obtener módulos", error); }
    }

    async function saveModulo(data, id) {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/v1/modulos/${id}` : '/api/v1/modulos';
        try {
            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) });
            if (res.ok) { 
                showMessage('Módulo guardado exitosamente.'); 
                resetForm(); 
                fetchModulos(); 
            } else {
                showMessage('Error al guardar el módulo.', true);
            }
        } catch (error) { showMessage('Error de conexión al servidor.', true); }
    }

    async function deleteModulo(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este módulo? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`/api/v1/modulos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) { 
                showMessage('Módulo eliminado.'); 
                fetchModulos(); 
            } else {
                showMessage('No se puede eliminar un módulo que está en uso.', true);
            }
        } catch (error) { showMessage('Error al eliminar el módulo.', true); }
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-modulos-body');
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const paginated = modulosData.slice(start, start + rowsPerPage);

        if (paginated.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 30px; color: #64748b;">No hay módulos registrados en el sistema.</td></tr>'; 
            return;
        }
        
        paginated.forEach(m => {
            const tr = document.createElement('tr');
            tr.style.transition = "background-color 0.2s";
            tr.onmouseover = () => tr.style.backgroundColor = '#f8fafc';
            tr.onmouseout = () => tr.style.backgroundColor = 'transparent';

            // Adiós al ID, bienvenida a una vista limpia
            tr.innerHTML = `<td style="padding: 15px 20px;"><strong style="color: #0f172a; font-size: 0.95rem;"><i class="fas fa-layer-group" style="color: #94a3b8; margin-right: 8px;"></i>${m.strNombreModulo}</strong></td>`;
            
            if (permisos.bitEditar || permisos.bitEliminar) {
                const accTd = document.createElement('td');
                accTd.style.padding = '15px 20px';
                accTd.style.textAlign = 'right';

                if (permisos.bitEditar) {
                    const btn = document.createElement('button'); 
                    btn.innerHTML = '<i class="fas fa-edit"></i>'; 
                    btn.className = 'btn-edit'; 
                    btn.title = 'Editar Módulo';
                    btn.onclick = () => loadFormData(m); 
                    accTd.appendChild(btn);
                }
                if (permisos.bitEliminar) {
                    const btn = document.createElement('button'); 
                    btn.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    btn.className = 'btn-delete'; 
                    btn.title = 'Eliminar Módulo';
                    btn.onclick = () => deleteModulo(m.id); 
                    accTd.appendChild(btn);
                }
                tr.appendChild(accTd);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-mod'); controls.innerHTML = '';
        const pageCount = Math.ceil(modulosData.length / rowsPerPage);
        if(pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); 
            btn.textContent = i; 
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; 
            btn.onclick = () => { currentPage = i; renderTable(); }; 
            controls.appendChild(btn);
        }
    }

    function loadFormData(m) {
        document.getElementById('form-modulo').style.display = 'block'; 
        document.getElementById('tabla-contenedor').style.display = 'none';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if(btnContainer) btnContainer.style.display = 'none';
        
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-edit" style="color: #3b82f6; margin-right: 8px;"></i>Editar Módulo: ${m.strNombreModulo}`; 
        document.getElementById('modulo-id').value = m.id; 
        document.getElementById('nombre-modulo').value = m.strNombreModulo;
    }

    function resetForm() {
        document.getElementById('form-modulo').reset(); 
        document.getElementById('modulo-id').value = '';
        
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-plus" style="color: #10b981; margin-right: 8px;"></i>Crear Nuevo Módulo`;
        
        document.getElementById('form-modulo').style.display = 'none'; 
        document.getElementById('tabla-contenedor').style.display = 'block';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if(btnContainer) btnContainer.style.display = 'block';
    }

    function setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-mod');
        if (btnNuevo) btnNuevo.addEventListener('click', () => { 
            resetForm(); 
            document.getElementById('form-modulo').style.display = 'block'; 
            document.getElementById('tabla-contenedor').style.display = 'none'; 
            document.getElementById('contenedor-btn-nuevo').style.display = 'none'; 
        });
        
        document.getElementById('btn-cancel-mod').addEventListener('click', resetForm);
        
        document.getElementById('form-modulo').addEventListener('submit', (e) => { 
            e.preventDefault(); 
            saveModulo({ strNombreModulo: document.getElementById('nombre-modulo').value.trim() }, document.getElementById('modulo-id').value); 
        });
    }
    
    return { render: renderView };
})();