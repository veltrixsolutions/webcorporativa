// static/js/perfil.js

const PerfilModule = (() => {
    let perfilesData = [];
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
                <button id="btn-nuevo-perfil" class="btn-submit" style="background-color: #34A853; width: auto; padding: 10px 20px;">
                    <i class="fas fa-plus"></i> Nuevo Perfil
                </button>
            </div>` : '';

        container.innerHTML = `
            <div class="data-card-centered">
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.8rem;">Gestión de Perfiles</h1>
                <p style="margin-bottom: 20px;">Administra los roles y niveles de acceso del sistema corporativo.</p>
                
                <div id="alert-message" class="alert hidden"></div>
                ${btnNuevoHTML}

                <form id="form-perfil" class="vertical-form" style="display: none; border-top: 2px solid #e5e7eb; padding-top: 25px;">
                    <h2 id="form-titulo" style="margin-bottom: 20px; color: #374151;">Nuevo Perfil</h2>
                    <input type="hidden" id="perfil-id" value="">
                    
                    <div class="form-group">
                        <label for="nombre-perfil">Nombre del Perfil</label>
                        <input type="text" id="nombre-perfil" placeholder="Ej. Recursos Humanos" required autocomplete="off">
                    </div>
                    
                    <div class="form-group">
                        <label for="es-admin">Nivel de Acceso</label>
                        <select id="es-admin">
                            <option value="false">Usuario Estándar</option>
                            <option value="true">Super Administrador</option>
                        </select>
                    </div>

                    <div class="form-actions">
                        <button type="submit" id="btn-save" class="btn-submit">Guardar Perfil</button>
                        <button type="button" id="btn-cancel" class="btn-cancel">Cancelar</button>
                    </div>
                </form>

                <div class="table-container" id="tabla-contenedor">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Perfil</th>
                                <th>Administrador</th>
                                ${permisos.bitEditar || permisos.bitEliminar ? '<th>Acciones</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="tabla-perfiles-body"></tbody>
                    </table>
                    <div id="pagination-controls" class="pagination"></div>
                </div>
            </div>
        `;

        setupEventListeners();
        fetchPerfiles();
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
        const alertBox = document.getElementById('alert-message');
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3000);
    }

    async function fetchPerfiles() {
        try {
            const res = await fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Error al obtener datos');
            perfilesData = await res.json() || [];
            currentPage = 1;
            renderTable();
        } catch (error) { showMessage(error.message, true); }
    }

    async function savePerfil(data, id) {
        const url = id ? `/api/v1/perfiles/${id}` : '/api/v1/perfiles';
        const method = id ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al guardar');
            
            showMessage('Perfil guardado exitosamente');
            resetForm();
            fetchPerfiles();
        } catch (error) { showMessage(error.message, true); }
    }

    async function deletePerfil(id) {
        if (!confirm('¿Estás seguro de eliminar este perfil?')) return;
        try {
            const res = await fetch(`/api/v1/perfiles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al eliminar');
            showMessage('Perfil eliminado');
            fetchPerfiles();
        } catch (error) { showMessage(error.message, true); }
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-perfiles-body');
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = perfilesData.slice(start, end);

        if (paginatedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No hay perfiles registrados.</td></tr>`;
            return;
        }

        paginatedData.forEach(perfil => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${perfil.id}</td>
                <td><strong>${perfil.strNombrePerfil}</strong></td>
                <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; background: ${perfil.bitAdministrador ? '#d1fae5' : '#f3f4f6'}; color: ${perfil.bitAdministrador ? '#065f46' : '#4b5563'};">${perfil.bitAdministrador ? 'Sí' : 'No'}</span></td>
            `;

            if (permisos.bitEditar || permisos.bitEliminar) {
                const tdAcciones = document.createElement('td');
                if (permisos.bitEditar) {
                    const btnEdit = document.createElement('button');
                    btnEdit.innerHTML = '<i class="fas fa-edit"></i>'; btnEdit.className = 'btn-edit';
                    btnEdit.onclick = () => loadFormData(perfil);
                    tdAcciones.appendChild(btnEdit);
                }
                if (permisos.bitEliminar) {
                    const btnDelete = document.createElement('button');
                    btnDelete.innerHTML = '<i class="fas fa-trash"></i>'; btnDelete.className = 'btn-delete';
                    btnDelete.onclick = () => deletePerfil(perfil.id);
                    tdAcciones.appendChild(btnDelete);
                }
                tr.appendChild(tdAcciones);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls');
        controls.innerHTML = '';
        const pageCount = Math.ceil(perfilesData.length / rowsPerPage);
        if (pageCount <= 1) return;
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => { currentPage = i; renderTable(); };
            controls.appendChild(btn);
        }
    }

    function loadFormData(perfil) {
        document.getElementById('form-perfil').style.display = 'block';
        document.getElementById('tabla-contenedor').style.display = 'none';
        if (document.getElementById('btn-nuevo-perfil')) document.getElementById('btn-nuevo-perfil').parentElement.style.display = 'none';

        document.getElementById('form-titulo').textContent = 'Editar Perfil';
        document.getElementById('perfil-id').value = perfil.id;
        document.getElementById('nombre-perfil').value = perfil.strNombrePerfil;
        document.getElementById('es-admin').value = perfil.bitAdministrador.toString();
        document.getElementById('btn-save').textContent = 'Actualizar Perfil';
    }

    function resetForm() {
        document.getElementById('form-perfil').reset();
        document.getElementById('perfil-id').value = '';
        document.getElementById('form-perfil').style.display = 'none';
        document.getElementById('tabla-contenedor').style.display = 'block';
        if (document.getElementById('btn-nuevo-perfil')) document.getElementById('btn-nuevo-perfil').parentElement.style.display = 'block';
    }

    function setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-perfil');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => {
                document.getElementById('form-perfil').reset();
                document.getElementById('perfil-id').value = '';
                document.getElementById('form-titulo').textContent = 'Nuevo Perfil';
                document.getElementById('form-perfil').style.display = 'block';
                document.getElementById('tabla-contenedor').style.display = 'none';
                btnNuevo.parentElement.style.display = 'none';
            });
        }

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