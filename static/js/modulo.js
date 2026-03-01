// static/js/modulo.js

const ModuloApp = (() => {
    let modulosData = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId) {
        await cargarPermisosSeguridad(moduleId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `<div class="data-card-centered"><h1 style="color: #ef4444;"><i class="fas fa-ban"></i> Acceso Denegado</h1><p>No tienes privilegios para ver esta pantalla.</p></div>`;
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar ? `
            <div style="text-align: right; margin-bottom: 20px;">
                <button id="btn-nuevo-mod" class="btn-submit" style="background-color: #34A853; width: auto; padding: 10px 20px;">
                    <i class="fas fa-plus"></i> Nuevo Módulo
                </button>
            </div>` : '';

        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 600px;">
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.8rem;">Gestión de Módulos</h1>
                <p style="margin-bottom: 20px;">Registra las pantallas del sistema corporativo.</p>
                
                <div id="alert-modulo" class="alert hidden"></div>
                ${btnNuevoHTML}

                <form id="form-modulo" class="vertical-form" style="display: none; border-top: 2px solid #e5e7eb; padding-top: 25px;">
                    <h2 id="form-titulo" style="margin-bottom: 20px; color: #374151;">Nuevo Módulo</h2>
                    <input type="hidden" id="modulo-id" value="">
                    
                    <div class="form-group">
                        <label for="nombre-modulo">Nombre del Módulo</label>
                        <input type="text" id="nombre-modulo" placeholder="Ej. Inventario" required autocomplete="off">
                    </div>

                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="submit" id="btn-save-mod" class="btn-submit">Guardar Módulo</button>
                        <button type="button" id="btn-cancel-mod" class="btn-cancel">Cancelar</button>
                    </div>
                </form>

                <div class="table-container" id="tabla-contenedor" style="margin-top: 30px;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Módulo</th>
                                ${permisos.bitEditar || permisos.bitEliminar ? '<th>Acciones</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="tabla-modulos-body"></tbody>
                    </table>
                    <div id="pagination-controls-mod" class="pagination"></div>
                </div>
            </div>
        `;

        setupEventListeners();
        fetchModulos();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId) {
        try {
            const base64Url = getToken().split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const userData = JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
            if (userData.perfil_id === 1) {
                permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true };
                return;
            }
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) permisos = await res.json();
        } catch (e) { console.error("Error al validar seguridad:", e); }
    }

    function showMessage(msg, isError = false) {
        const alertBox = document.getElementById('alert-modulo');
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3000);
    }

    async function fetchModulos() {
        try {
            const res = await fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Error al obtener datos');
            modulosData = await res.json() || [];
            currentPage = 1;
            renderTable();
        } catch (error) { showMessage(error.message, true); }
    }

    async function saveModulo(data, id) {
        const url = id ? `/api/v1/modulos/${id}` : '/api/v1/modulos';
        const method = id ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al guardar');
            
            showMessage('Módulo guardado exitosamente');
            resetForm();
            fetchModulos();
        } catch (error) { showMessage(error.message, true); }
    }

    async function deleteModulo(id) {
        if (!confirm('¿Estás seguro de eliminar este módulo?')) return;
        try {
            const res = await fetch(`/api/v1/modulos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al eliminar');
            showMessage('Módulo eliminado');
            fetchModulos();
        } catch (error) { showMessage(error.message, true); }
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-modulos-body');
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginated = modulosData.slice(start, end);

        if (paginated.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay módulos registrados.</td></tr>';
            return;
        }

        paginated.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${m.id}</td><td><strong>${m.strNombreModulo}</strong></td>`;
            
            if (permisos.bitEditar || permisos.bitEliminar) {
                const accTd = document.createElement('td');
                if (permisos.bitEditar) {
                    const btnEdit = document.createElement('button');
                    btnEdit.innerHTML = '<i class="fas fa-edit"></i>'; btnEdit.className = 'btn-edit';
                    btnEdit.onclick = () => loadFormData(m);
                    accTd.appendChild(btnEdit);
                }
                if (permisos.bitEliminar) {
                    const btnDelete = document.createElement('button');
                    btnDelete.innerHTML = '<i class="fas fa-trash"></i>'; btnDelete.className = 'btn-delete';
                    btnDelete.onclick = () => deleteModulo(m.id);
                    accTd.appendChild(btnDelete);
                }
                tr.appendChild(accTd);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-mod');
        controls.innerHTML = '';
        const pageCount = Math.ceil(modulosData.length / rowsPerPage);
        if (pageCount <= 1) return;
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => { currentPage = i; renderTable(); };
            controls.appendChild(btn);
        }
    }

    function loadFormData(m) {
        document.getElementById('form-modulo').style.display = 'block';
        document.getElementById('tabla-contenedor').style.display = 'none';
        if (document.getElementById('btn-nuevo-mod')) document.getElementById('btn-nuevo-mod').parentElement.style.display = 'none';

        document.getElementById('form-titulo').textContent = 'Editar Módulo';
        document.getElementById('modulo-id').value = m.id;
        document.getElementById('nombre-modulo').value = m.strNombreModulo;
        document.getElementById('btn-save-mod').textContent = 'Actualizar Módulo';
    }

    function resetForm() {
        document.getElementById('form-modulo').reset();
        document.getElementById('modulo-id').value = '';
        document.getElementById('form-modulo').style.display = 'none';
        document.getElementById('tabla-contenedor').style.display = 'block';
        if (document.getElementById('btn-nuevo-mod')) document.getElementById('btn-nuevo-mod').parentElement.style.display = 'block';
    }

    function setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-mod');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => {
                document.getElementById('form-modulo').reset();
                document.getElementById('modulo-id').value = '';
                document.getElementById('form-titulo').textContent = 'Nuevo Módulo';
                document.getElementById('form-modulo').style.display = 'block';
                document.getElementById('tabla-contenedor').style.display = 'none';
                btnNuevo.parentElement.style.display = 'none';
            });
        }

        document.getElementById('btn-cancel-mod').addEventListener('click', resetForm);

        document.getElementById('form-modulo').addEventListener('submit', (e) => {
            e.preventDefault();
            saveModulo({ strNombreModulo: document.getElementById('nombre-modulo').value.trim() }, document.getElementById('modulo-id').value);
        });
    }

    return { render: renderView };
})();