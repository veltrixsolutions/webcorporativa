// static/js/perfil.js
const PerfilModule = (() => {
    let perfilesData = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `<div class="data-card-centered"><h1 style="color: #ef4444;"><i class="fas fa-ban"></i> Acceso Denegado</h1></div>`; return;
        }

        const btnNuevoHTML = permisos.bitAgregar ? `<div style="text-align: right; margin-bottom: 20px;"><button id="btn-nuevo-perfil" class="btn-submit" style="background-color: #34A853; width: auto; padding: 10px 20px;"><i class="fas fa-plus"></i> Nuevo Perfil</button></div>` : '';

        container.innerHTML = `
            <div class="data-card-centered">
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.8rem;">Gestión de Perfiles</h1>
                <div id="alert-message" class="alert hidden"></div>
                ${btnNuevoHTML}

                <form id="form-perfil" class="vertical-form" style="display: none; border-top: 2px solid #e5e7eb; padding-top: 25px;">
                    <h2 id="form-titulo">Nuevo Perfil</h2>
                    <input type="hidden" id="perfil-id" value="">
                    <div class="form-group"><label>Nombre del Perfil</label><input type="text" id="nombre-perfil" required></div>
                    <div class="form-group"><label>Nivel de Acceso</label><select id="es-admin"><option value="false">Usuario Estándar</option><option value="true">Super Administrador</option></select></div>
                    <div class="form-actions"><button type="submit" class="btn-submit">Guardar</button><button type="button" id="btn-cancel" class="btn-cancel">Cancelar</button></div>
                </form>

                <div class="table-container" id="tabla-contenedor">
                    <table>
                        <thead><tr><th>ID</th><th>Nombre</th><th>Admin</th>${permisos.bitEditar || permisos.bitEliminar ? '<th>Acciones</th>' : ''}</tr></thead>
                        <tbody id="tabla-perfiles-body"></tbody>
                    </table>
                    <div id="pagination-controls" class="pagination"></div>
                </div>
            </div>`;

        setupEventListeners(); fetchPerfiles();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) {}
    }

    function showMessage(msg, isError = false) {
        const a = document.getElementById('alert-message'); a.textContent = msg; a.className = `alert ${isError ? 'error' : 'success'}`; a.style.display = 'block'; setTimeout(() => a.style.display = 'none', 3000);
    }

    async function fetchPerfiles() {
        try { const res = await fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) perfilesData = await res.json() || []; currentPage = 1; renderTable(); } catch (e) {}
    }

    async function savePerfil(data, id) {
        const method = id ? 'PUT' : 'POST'; const url = id ? `/api/v1/perfiles/${id}` : '/api/v1/perfiles';
        try { const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) }); if (res.ok) { showMessage('Guardado'); resetForm(); fetchPerfiles(); } } catch (e) {}
    }

    async function deletePerfil(id) {
        if (!confirm('¿Eliminar?')) return;
        try { const res = await fetch(`/api/v1/perfiles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) { showMessage('Eliminado'); fetchPerfiles(); } } catch (e) {}
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-perfiles-body'); tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage; const paginated = perfilesData.slice(start, start + rowsPerPage);
        if (paginated.length === 0) { tbody.innerHTML = `<tr><td colspan="4">No hay datos.</td></tr>`; return; }
        paginated.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.id}</td><td><strong>${p.strNombrePerfil}</strong></td><td><span style="padding: 4px; background: ${p.bitAdministrador ? '#d1fae5' : '#f3f4f6'}; color: ${p.bitAdministrador ? '#065f46' : '#4b5563'};">${p.bitAdministrador ? 'Sí' : 'No'}</span></td>`;
            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                if (permisos.bitEditar) { const b = document.createElement('button'); b.innerHTML = '<i class="fas fa-edit"></i>'; b.className = 'btn-edit'; b.onclick = () => loadFormData(p); td.appendChild(b); }
                if (permisos.bitEliminar) { const b = document.createElement('button'); b.innerHTML = '<i class="fas fa-trash"></i>'; b.className = 'btn-delete'; b.onclick = () => deletePerfil(p.id); td.appendChild(b); }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls'); controls.innerHTML = '';
        const pageCount = Math.ceil(perfilesData.length / rowsPerPage);
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; btn.onclick = () => { currentPage = i; renderTable(); }; controls.appendChild(btn);
        }
    }

    function loadFormData(p) {
        document.getElementById('form-perfil').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none';
        if (document.getElementById('btn-nuevo-perfil')) document.getElementById('btn-nuevo-perfil').parentElement.style.display = 'none';
        document.getElementById('perfil-id').value = p.id; document.getElementById('nombre-perfil').value = p.strNombrePerfil; document.getElementById('es-admin').value = p.bitAdministrador.toString();
    }

    function resetForm() {
        document.getElementById('form-perfil').reset(); document.getElementById('perfil-id').value = '';
        document.getElementById('form-perfil').style.display = 'none'; document.getElementById('tabla-contenedor').style.display = 'block';
        if (document.getElementById('btn-nuevo-perfil')) document.getElementById('btn-nuevo-perfil').parentElement.style.display = 'block';
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-perfil');
        if (btn) btn.addEventListener('click', () => { resetForm(); document.getElementById('form-perfil').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none'; btn.parentElement.style.display = 'none'; });
        document.getElementById('btn-cancel').addEventListener('click', resetForm);
        document.getElementById('form-perfil').addEventListener('submit', (e) => { e.preventDefault(); savePerfil({ strNombrePerfil: document.getElementById('nombre-perfil').value.trim(), bitAdministrador: document.getElementById('es-admin').value === 'true' }, document.getElementById('perfil-id').value); });
    }
    return { render: renderView };
})();