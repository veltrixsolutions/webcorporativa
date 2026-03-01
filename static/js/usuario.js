// static/js/usuario.js
const UsuarioModule = (() => {
    let usuariosData = [];
    let perfilesDisponibles = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `<div class="data-card-centered"><h1 style="color: #ef4444;"><i class="fas fa-ban"></i> Acceso Denegado</h1></div>`; return;
        }

        const btnNuevoHTML = permisos.bitAgregar ? `<div style="text-align: right; margin-bottom: 20px;"><button id="btn-nuevo-usuario" class="btn-submit" style="background-color: #34A853; width: auto; padding: 10px 20px;"><i class="fas fa-user-plus"></i> Nuevo Usuario</button></div>` : '';

        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 800px;">
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.8rem;">Directorio de Usuarios</h1>
                <div id="alert-usuario" class="alert hidden"></div>
                ${btnNuevoHTML}

                <form id="form-usuario" class="vertical-form" style="display: none; border-top: 2px solid #e5e7eb; padding-top: 25px;">
                    <h2 id="form-titulo">Nuevo Usuario</h2>
                    <input type="hidden" id="usuario-id" value="">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group"><label>Usuario</label><input type="text" id="nombre-usuario" required></div>
                        <div class="form-group"><label>Correo</label><input type="email" id="correo-usuario" required></div>
                        <div class="form-group"><label>Perfil</label><select id="perfil-usuario" required></select></div>
                        <div class="form-group"><label>Contraseña</label><input type="password" id="pwd-usuario"></div>
                        <div class="form-group"><label>Estado</label><select id="estado-usuario"><option value="1">Activo</option><option value="0">Inactivo</option></select></div>
                        <div class="form-group"><label>Avatar URL</label><input type="text" id="ruta-imagen"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="btn-submit">Guardar</button><button type="button" id="btn-cancel-usr" class="btn-cancel">Cancelar</button></div>
                </form>

                <div class="table-container" id="tabla-contenedor">
                    <table>
                        <thead><tr><th>Avatar</th><th>Usuario</th><th>Perfil</th><th>Estado</th>${permisos.bitEditar || permisos.bitEliminar ? '<th>Acciones</th>' : ''}</tr></thead>
                        <tbody id="tabla-usuarios-body"></tbody>
                    </table>
                    <div id="pagination-controls-usr" class="pagination"></div>
                </div>
            </div>`;

        setupEventListeners(); cargarPerfilesEnSelect(); fetchUsuarios();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) {}
    }

    function showMessage(msg, isError = false) {
        const a = document.getElementById('alert-usuario'); a.textContent = msg; a.className = `alert ${isError ? 'error' : 'success'}`; a.style.display = 'block'; setTimeout(() => a.style.display = 'none', 3000);
    }

    async function cargarPerfilesEnSelect() {
        try {
            const res = await fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) { perfilesDisponibles = await res.json() || []; const s = document.getElementById('perfil-usuario'); s.innerHTML = '<option value="">Seleccione...</option>'; perfilesDisponibles.forEach(p => { s.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`; }); }
        } catch (e) {}
    }

    async function fetchUsuarios() {
        try { const res = await fetch('/api/v1/usuarios', { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) usuariosData = await res.json() || []; currentPage = 1; renderTable(); } catch (e) {}
    }

    async function saveUsuario(data, id) {
        if (!id && !data.strPwd) { showMessage("La contraseña es obligatoria.", true); return; }
        const url = id ? `/api/v1/usuarios/${id}` : '/api/v1/usuarios';
        try { const res = await fetch(url, { method: id?'PUT':'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) }); if (res.ok) { showMessage('Guardado'); resetForm(); fetchUsuarios(); } } catch (e) {}
    }

    async function deleteUsuario(id) {
        if (!confirm('¿Eliminar?')) return;
        try { const res = await fetch(`/api/v1/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) { showMessage('Eliminado'); fetchUsuarios(); } } catch (e) {}
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-usuarios-body'); tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage; const paginated = usuariosData.slice(start, start + rowsPerPage);
        if (paginated.length === 0) { tbody.innerHTML = `<tr><td colspan="5">No hay datos.</td></tr>`; return; }
        paginated.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><img src="${u.strRutaImagen||`https://ui-avatars.com/api/?name=${u.strNombreUsuario}`}" style="width:40px; border-radius:50%;"></td><td><strong>${u.strNombreUsuario}</strong><br><small>${u.strCorreo}</small></td><td>${u.perfilNombre}</td><td><span style="padding: 4px; background: ${u.idEstadoUsuario===1 ? '#d1fae5' : '#fee2e2'}; color: ${u.idEstadoUsuario===1 ? '#065f46' : '#991b1b'};">${u.idEstadoUsuario===1?'Activo':'Inactivo'}</span></td>`;
            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                if (permisos.bitEditar) { const b = document.createElement('button'); b.innerHTML = '<i class="fas fa-edit"></i>'; b.className = 'btn-edit'; b.onclick = () => loadFormData(u); td.appendChild(b); }
                if (permisos.bitEliminar) { const b = document.createElement('button'); b.innerHTML = '<i class="fas fa-trash"></i>'; b.className = 'btn-delete'; b.onclick = () => deleteUsuario(u.id); td.appendChild(b); }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-usr'); controls.innerHTML = '';
        const pageCount = Math.ceil(usuariosData.length / rowsPerPage);
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; btn.onclick = () => { currentPage = i; renderTable(); }; controls.appendChild(btn);
        }
    }

    function loadFormData(u) {
        document.getElementById('form-usuario').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none';
        if (document.getElementById('btn-nuevo-usuario')) document.getElementById('btn-nuevo-usuario').parentElement.style.display = 'none';
        document.getElementById('usuario-id').value = u.id; document.getElementById('nombre-usuario').value = u.strNombreUsuario;
        document.getElementById('correo-usuario').value = u.strCorreo; document.getElementById('perfil-usuario').value = u.idPerfil;
        document.getElementById('estado-usuario').value = u.idEstadoUsuario; document.getElementById('ruta-imagen').value = u.strRutaImagen || '';
    }

    function resetForm() {
        document.getElementById('form-usuario').reset(); document.getElementById('usuario-id').value = '';
        document.getElementById('form-usuario').style.display = 'none'; document.getElementById('tabla-contenedor').style.display = 'block';
        if (document.getElementById('btn-nuevo-usuario')) document.getElementById('btn-nuevo-usuario').parentElement.style.display = 'block';
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-usuario');
        if (btn) btn.addEventListener('click', () => { resetForm(); document.getElementById('form-usuario').style.display = 'block'; document.getElementById('tabla-contenedor').style.display = 'none'; btn.parentElement.style.display = 'none'; });
        document.getElementById('btn-cancel-usr').addEventListener('click', resetForm);
        document.getElementById('form-usuario').addEventListener('submit', (e) => {
            e.preventDefault();
            saveUsuario({ strNombreUsuario: document.getElementById('nombre-usuario').value.trim(), strCorreo: document.getElementById('correo-usuario').value.trim(), idPerfil: parseInt(document.getElementById('perfil-usuario').value), strNumeroCelular: '', strPwd: document.getElementById('pwd-usuario').value, idEstadoUsuario: parseInt(document.getElementById('estado-usuario').value), strRutaImagen: document.getElementById('ruta-imagen').value.trim() }, document.getElementById('usuario-id').value);
        });
    }
    return { render: renderView };
})();