// static/js/permiso.js

const PermisoModule = (() => {
    let permisosData = [];
    let perfilesDisponibles = [];
    let modulosDisponibles = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    function renderView(container) {
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 900px;">
                <h1 style="margin-bottom: 25px; color: #1f2937; font-size: 1.8rem;">Asignación de Permisos por Perfil</h1>
                
                <div id="alert-permiso" class="alert hidden"></div>

                <form id="form-permiso" class="vertical-form">
                    <input type="hidden" id="permiso-id" value="">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group">
                            <label for="sel-perfil">Perfil</label>
                            <select id="sel-perfil" required></select>
                        </div>
                        
                        <div class="form-group">
                            <label for="sel-modulo">Módulo</label>
                            <select id="sel-modulo" required></select>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top: 15px;">
                        <label style="margin-bottom: 15px; display: block;">Acciones Permitidas</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 20px; background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 1.05rem; cursor: pointer;">
                                <input type="checkbox" id="chk-agregar" style="width: 20px; height: 20px;"> Agregar
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 1.05rem; cursor: pointer;">
                                <input type="checkbox" id="chk-editar" style="width: 20px; height: 20px;"> Editar
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 1.05rem; cursor: pointer;">
                                <input type="checkbox" id="chk-consulta" style="width: 20px; height: 20px;"> Consultar
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 1.05rem; cursor: pointer;">
                                <input type="checkbox" id="chk-eliminar" style="width: 20px; height: 20px;"> Eliminar
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 1.05rem; cursor: pointer;">
                                <input type="checkbox" id="chk-detalle" style="width: 20px; height: 20px;"> Detalle
                            </label>
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 25px;">
                        <button type="submit" id="btn-save-perm" class="btn-submit">Guardar Permisos</button>
                        <button type="button" id="btn-cancel-perm" class="btn-cancel hidden">Cancelar Edición</button>
                    </div>
                </form>

                <div class="table-container" style="margin-top: 30px;">
                    <table style="font-size: 0.95rem;">
                        <thead>
                            <tr>
                                <th>Perfil</th>
                                <th>Módulo</th>
                                <th style="text-align: center;">Agregar</th>
                                <th style="text-align: center;">Editar</th>
                                <th style="text-align: center;">Consulta</th>
                                <th style="text-align: center;">Eliminar</th>
                                <th style="text-align: center;">Detalle</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-permisos-body"></tbody>
                    </table>
                    <div id="pagination-controls-perm" class="pagination"></div>
                </div>
            </div>
        `;

        setupEventListeners();
        cargarCatalogos();
        fetchPermisos();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    function showMessage(msg, isError = false) {
        const alertBox = document.getElementById('alert-permiso');
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3500);
    }

    // --- Cargar Catálogos para los Selects ---
    async function cargarCatalogos() {
        try {
            const [resPerfiles, resModulos] = await Promise.all([
                fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
                fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } }) // Asumiendo que crearás este endpoint estático simple
            ]);

            if (resPerfiles.ok) {
                perfilesDisponibles = await resPerfiles.json() || [];
                const selPerfil = document.getElementById('sel-perfil');
                selPerfil.innerHTML = '<option value="">Seleccione...</option>';
                perfilesDisponibles.forEach(p => {
                    selPerfil.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`;
                });
            }

            if (resModulos.ok) {
                modulosDisponibles = await resModulos.json() || [];
                const selModulo = document.getElementById('sel-modulo');
                selModulo.innerHTML = '<option value="">Seleccione...</option>';
                modulosDisponibles.forEach(m => {
                    selModulo.innerHTML += `<option value="${m.id}">${m.strNombreModulo}</option>`;
                });
            }
        } catch (e) {
            console.error('Error cargando catálogos:', e);
        }
    }

    // --- Peticiones API Permisos ---
    async function fetchPermisos() {
        try {
            const res = await fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Error obteniendo permisos');
            permisosData = await res.json() || [];
            currentPage = 1;
            renderTable();
        } catch (e) { showMessage(e.message, true); }
    }

    async function savePermiso(data, id) {
        const url = id ? `/api/v1/permisos/${id}` : '/api/v1/permisos';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al guardar');
            
            showMessage('Permisos guardados exitosamente');
            resetForm();
            fetchPermisos();
        } catch (e) { showMessage(e.message, true); }
    }

    async function deletePermiso(id) {
        if (!confirm('¿Seguro que deseas eliminar esta regla de permisos?')) return;
        try {
            const res = await fetch(`/api/v1/permisos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Error al eliminar');
            showMessage('Permiso eliminado');
            fetchPermisos();
        } catch (e) { showMessage(e.message, true); }
    }

    // --- Renderizado y DOM ---
    function renderStatusIcon(status) {
        return status ? '<span style="color:#10b981; font-weight:bold;">✔</span>' : '<span style="color:#ef4444; font-weight:bold;">✖</span>';
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-permisos-body');
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginated = permisosData.slice(start, end);

        if (paginated.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No hay permisos configurados.</td></tr>`;
            return;
        }

        paginated.forEach(p => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td><strong>${p.perfilNombre}</strong></td>
                <td>${p.moduloNombre}</td>
                <td style="text-align: center;">${renderStatusIcon(p.bitAgregar)}</td>
                <td style="text-align: center;">${renderStatusIcon(p.bitEditar)}</td>
                <td style="text-align: center;">${renderStatusIcon(p.bitConsulta)}</td>
                <td style="text-align: center;">${renderStatusIcon(p.bitEliminar)}</td>
                <td style="text-align: center;">${renderStatusIcon(p.bitDetalle)}</td>
            `;

            const accTd = document.createElement('td');
            const btnEdit = document.createElement('button');
            btnEdit.textContent = 'Editar'; btnEdit.className = 'btn-edit';
            btnEdit.onclick = () => loadFormData(p);
            
            const btnDel = document.createElement('button');
            btnDel.textContent = 'Eliminar'; btnDel.className = 'btn-delete';
            btnDel.onclick = () => deletePermiso(p.id);

            accTd.append(btnEdit, btnDel);
            tr.appendChild(accTd);
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-perm');
        controls.innerHTML = '';
        const pageCount = Math.ceil(permisosData.length / rowsPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => { currentPage = i; renderTable(); };
            controls.appendChild(btn);
        }
    }

    function loadFormData(p) {
        document.getElementById('permiso-id').value = p.id;
        document.getElementById('sel-perfil').value = p.idPerfil;
        document.getElementById('sel-modulo').value = p.idModulo;
        
        // Al editar, deshabilitar selects para no romper la relación, solo editar las flags
        document.getElementById('sel-perfil').disabled = true;
        document.getElementById('sel-modulo').disabled = true;

        document.getElementById('chk-agregar').checked = p.bitAgregar;
        document.getElementById('chk-editar').checked = p.bitEditar;
        document.getElementById('chk-consulta').checked = p.bitConsulta;
        document.getElementById('chk-eliminar').checked = p.bitEliminar;
        document.getElementById('chk-detalle').checked = p.bitDetalle;

        document.getElementById('btn-save-perm').textContent = 'Actualizar Permisos';
        document.getElementById('btn-cancel-perm').classList.remove('hidden');
    }

    function resetForm() {
        document.getElementById('form-permiso').reset();
        document.getElementById('permiso-id').value = '';
        document.getElementById('sel-perfil').disabled = false;
        document.getElementById('sel-modulo').disabled = false;
        document.getElementById('btn-save-perm').textContent = 'Guardar Permisos';
        document.getElementById('btn-cancel-perm').classList.add('hidden');
    }

    function setupEventListeners() {
        document.getElementById('form-permiso').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                idPerfil: parseInt(document.getElementById('sel-perfil').value),
                idModulo: parseInt(document.getElementById('sel-modulo').value),
                bitAgregar: document.getElementById('chk-agregar').checked,
                bitEditar: document.getElementById('chk-editar').checked,
                bitConsulta: document.getElementById('chk-consulta').checked,
                bitEliminar: document.getElementById('chk-eliminar').checked,
                bitDetalle: document.getElementById('chk-detalle').checked
            };
            savePermiso(data, document.getElementById('permiso-id').value);
        });

        document.getElementById('btn-cancel-perm').addEventListener('click', resetForm);
    }

    return { render: renderView };
})();