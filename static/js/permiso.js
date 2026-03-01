// static/js/permiso.js
const PermisoModule = (() => {
    let permisosData = [], perfilesDisponibles = [], modulosDisponibles = [], currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `<div class="data-card-centered"><h1 style="color: #ef4444;"><i class="fas fa-ban"></i> Acceso Denegado</h1></div>`; return;
        }

        const btnNuevoHTML = permisos.bitAgregar ? `<div style="text-align: right; margin-bottom: 20px;"><button id="btn-nuevo-perm" class="btn-submit" style="background-color: #34A853; width: auto; padding: 10px 20px;"><i class="fas fa-lock"></i> Asignar Permisos</button></div>` : '';

        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 900px;">
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.8rem;">Matriz de Permisos</h1>
                <div id="alert-permiso" class="alert hidden"></div>
                ${btnNuevoHTML}

                <form id="form-permiso" class="vertical-form" style="display: none; border-top: 2px solid #e5e7eb; padding-top: 25px;">
                    <h2 id="form-titulo">Nueva Asignación</h2>
                    <input type="hidden" id="permiso-id" value="">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group"><label>Perfil</label><select id="sel-perfil" required></select></div>
                        <div class="form-group"><label>Módulo</label><select id="sel-modulo" required></select></div>
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label>Acciones Permitidas</label>
                        <div style="display: flex; gap: 20px; background: #f9fafb; padding: 15px;">
                            <label><input type="checkbox" id="chk-agregar"> Agregar</label>
                            <label><input type="checkbox" id="chk-editar"> Editar</label>
                            <label><input type="checkbox" id="chk-consulta"> Consultar</label>
                            <label><input type="checkbox" id="chk-eliminar"> Eliminar</label>
                        </div>
                    </div>
                    <div class="form-actions"><button type="submit" class="btn-submit">Guardar</button><button type="button" id="btn-cancel-perm" class="btn-cancel">Cancelar</button></div>
                </form>

                <div class="table-container" id="tabla-contenedor">
                    <table style="font-size: 0.95rem;">
                        <thead><tr><th>Perfil</th><th>Módulo</th><th>AGR</th><th>EDI</th><th>CON</th><th>ELI</th>${permisos.bitEditar || permisos.bitEliminar ? '<th>Acciones</th>' : ''}</tr></thead>
                        <tbody id="tabla-permisos-body"></tbody>
                    </table>
                    <div id="pagination-controls-perm" class="pagination"></div>
                </div>
            </div>`;

        setupEventListeners(); cargarCatalogos(); fetchPermisos();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) {}
    }

    function showMessage(msg, isError = false) {
        const a = document.getElementById('alert-permiso'); a.textContent = msg; a.className = `alert ${isError ? 'error' : 'success'}`; a.style.display = 'block'; setTimeout(() => a.style.display = 'none', 3000);
    }

    async function cargarCatalogos() {
        try {
            const [rp, rm] = await Promise.all([ fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }), fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } }) ]);
            if (rp.ok) { perfilesDisponibles = await rp.json() || []; const s = document.getElementById('sel-perfil'); s.innerHTML = '<option value="">Seleccione...</option>'; perfilesDisponibles.forEach(p => { s.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`; }); }
            if (rm.ok) { modulosDisponibles = await rm.json() || []; const s = document.getElementById('sel-modulo'); s.innerHTML = '<option value="">Seleccione...</option>'; modulosDisponibles.forEach(m => { s.innerHTML += `<option value="${m.id}">${m.strNombreModulo}</option>`; }); }
        } catch (e) {}
    }

    async function fetchPermisos() {
        try { const res = await fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisosData = await res.json() || []; currentPage = 1; renderTable(); } catch (e) {}
    }

    async function savePermiso(data, id) {
        const url = id ? `/api/v1/permisos/${id}` : '/api/v1/permisos';
        try { const res = await fetch(url, { method: id?'PUT':'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) }); if (res.ok) { showMessage('Guardado'); resetForm(); fetchPermisos(); } } catch (e) {}
    }

    async function deletePermiso(id) {
        if (!confirm('¿Eliminar?')) return;
        try { const res = await fetch(`/api/v1/permisos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) { showMessage('Eliminado'); fetchPermisos(); } } catch (e) {}
    }

    function getI(s) { return s ? '<span style="color:#10b981; font-weight:bold;">✔</span>' : '<span style="color:#ef4444; font-weight:bold;">✖</span>'; }

    function renderTable() {
        const tbody = document.getElementById('tabla-permisos-body'); tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage; const paginated = permisosData.slice(start, start + rowsPerPage);
        if (paginated.length === 0) { tbody.innerHTML = `<tr><td colspan="7">No hay datos.</td></tr>`; return; }
        paginated.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${p.perfilNombre}</strong></td><td>${p.moduloNombre}</td><td>${getI(p.bitAgregar)}</td><td>${getI(p.bitEditar)}</td><td>${getI(p.bitConsulta)}</td><td>${getI(p.bitEliminar)}</td>`;
            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                if (permisos.bitEditar) { const b = document.createElement('button'); b.innerHTML = '<i class="fas fa-edit"></i>'; b.className = 'btn-edit'; b.onclick = () => loadFormData(p); td.appendChild(b); }
                if (permisos.bitEliminar) { const b = document.createElement('button'); b.innerHTML = '<i class="fas fa-trash"></i>'; b.className = 'btn-delete'; b.onclick = () => deletePermiso(p.id); td.appendChild(b); }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-perm'); controls.innerHTML = '';
        const pageCount = Math.ceil(permisosData.length / rowsPerPage);
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; btn.onclick = () => { currentPage = i; renderTable(); }; controls.appendChild(btn);
        }
    }

    function loadFormData(p) {
        document.getElementById('form-permiso').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none';
        if (document.getElementById('btn-nuevo-perm')) document.getElementById('btn-nuevo-perm').parentElement.style.display = 'none';
        document.getElementById('permiso-id').value = p.id; document.getElementById('sel-perfil').value = p.idPerfil; document.getElementById('sel-modulo').value = p.idModulo;
        document.getElementById('sel-perfil').disabled = true; document.getElementById('sel-modulo').disabled = true;
        document.getElementById('chk-agregar').checked = p.bitAgregar; document.getElementById('chk-editar').checked = p.bitEditar; document.getElementById('chk-consulta').checked = p.bitConsulta; document.getElementById('chk-eliminar').checked = p.bitEliminar;
    }

    function resetForm() {
        document.getElementById('form-permiso').reset(); document.getElementById('permiso-id').value = '';
        document.getElementById('sel-perfil').disabled = false; document.getElementById('sel-modulo').disabled = false;
        document.getElementById('form-permiso').style.display = 'none'; document.getElementById('tabla-contenedor').style.display = 'block';
        if (document.getElementById('btn-nuevo-perm')) document.getElementById('btn-nuevo-perm').parentElement.style.display = 'block';
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-perm');
        if (btn) btn.addEventListener('click', () => { resetForm(); document.getElementById('form-permiso').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none'; btn.parentElement.style.display = 'none'; });
        document.getElementById('btn-cancel-perm').addEventListener('click', resetForm);
        document.getElementById('form-permiso').addEventListener('submit', (e) => {
            e.preventDefault();
            savePermiso({ idPerfil: parseInt(document.getElementById('sel-perfil').value), idModulo: parseInt(document.getElementById('sel-modulo').value), bitAgregar: document.getElementById('chk-agregar').checked, bitEditar: document.getElementById('chk-editar').checked, bitConsulta: document.getElementById('chk-consulta').checked, bitEliminar: document.getElementById('chk-eliminar').checked, bitDetalle: false }, document.getElementById('permiso-id').value);
        });
    }
    return { render: renderView };
})();