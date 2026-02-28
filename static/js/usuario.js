// static/js/usuario.js

const UsuarioModule = (() => {
    let usuariosData = [];
    let perfilesDisponibles = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    function renderView(container) {
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 800px;">
                <h1 style="margin-bottom: 25px; color: #1f2937; font-size: 1.8rem;">Gestión de Usuarios</h1>
                
                <div id="alert-usuario" class="alert hidden"></div>

                <form id="form-usuario" class="vertical-form">
                    <input type="hidden" id="usuario-id" value="">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group">
                            <label for="nombre-usuario">Nombre de Usuario</label>
                            <input type="text" id="nombre-usuario" required autocomplete="off">
                        </div>
                        
                        <div class="form-group">
                            <label for="correo-usuario">Correo Electrónico</label>
                            <input type="email" id="correo-usuario" required autocomplete="off" style="width: 100%; padding: 15px; font-size: 1.1rem; border: 1px solid #d1d5db; border-radius: 8px;">
                        </div>

                        <div class="form-group">
                            <label for="perfil-usuario">Perfil Asignado</label>
                            <select id="perfil-usuario" required></select>
                        </div>
                        
                        <div class="form-group">
                            <label for="celular-usuario">Número Celular</label>
                            <input type="text" id="celular-usuario" autocomplete="off">
                        </div>

                        <div class="form-group">
                            <label for="pwd-usuario">Contraseña</label>
                            <input type="password" id="pwd-usuario" autocomplete="new-password" placeholder="Solo para nuevo o cambiar" style="width: 100%; padding: 15px; font-size: 1.1rem; border: 1px solid #d1d5db; border-radius: 8px;">
                        </div>

                        <div class="form-group">
                            <label for="estado-usuario">Estado</label>
                            <select id="estado-usuario">
                                <option value="1">Activo</option>
                                <option value="0">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top: 10px;">
                        <label for="ruta-imagen">URL de la Imagen de Perfil</label>
                        <input type="text" id="ruta-imagen" placeholder="https://ejemplo.com/imagen.jpg">
                    </div>
                    
                    <div id="preview-container" style="display:none; text-align: center; margin-bottom: 15px;">
                        <img id="img-preview" src="" alt="Previsualización" style="max-height: 120px; width: 100%; object-fit: contain; border-radius: 8px; background: #f9fafb;">
                    </div>

                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="submit" id="btn-save-usr" class="btn-submit">Guardar Usuario</button>
                        <button type="button" id="btn-cancel-usr" class="btn-cancel hidden">Cancelar</button>
                    </div>
                </form>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Avatar</th>
                                <th>Usuario</th>
                                <th>Perfil</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-usuarios-body"></tbody>
                    </table>
                    <div id="pagination-controls-usr" class="pagination"></div>
                </div>
            </div>
        `;

        setupEventListeners();
        cargarPerfilesEnSelect();
        fetchUsuarios();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    function showMessage(msg, isError = false) {
        const alertBox = document.getElementById('alert-usuario');
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3500);
    }

    // --- Cargar Catálogos Iniciales ---
    async function cargarPerfilesEnSelect() {
        try {
            const res = await fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                perfilesDisponibles = await res.json() || [];
                const select = document.getElementById('perfil-usuario');
                select.innerHTML = '<option value="">Seleccione un perfil...</option>';
                perfilesDisponibles.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.strNombrePerfil;
                    select.appendChild(opt);
                });
            }
        } catch (e) { console.error('Error cargando perfiles', e); }
    }

    // --- Peticiones API ---
    async function fetchUsuarios() {
        try {
            const res = await fetch('/api/v1/usuarios', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Error obteniendo usuarios');
            usuariosData = await res.json() || [];
            currentPage = 1;
            renderTable();
        } catch (e) { showMessage(e.message, true); }
    }

    async function saveUsuario(data, id) {
        const url = id ? `/api/v1/usuarios/${id}` : '/api/v1/usuarios';
        const method = id ? 'PUT' : 'POST';

        if (!id && !data.strPwd) {
            showMessage("La contraseña es obligatoria para un usuario nuevo.", true);
            return;
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al guardar');
            
            showMessage('Usuario guardado exitosamente');
            resetForm();
            fetchUsuarios();
        } catch (e) { showMessage(e.message, true); }
    }

    async function deleteUsuario(id) {
        if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
        try {
            const res = await fetch(`/api/v1/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Error al eliminar');
            showMessage('Usuario eliminado');
            fetchUsuarios();
        } catch (e) { showMessage(e.message, true); }
    }

    // --- DOM y Paginación ---
    function renderTable() {
        const tbody = document.getElementById('tabla-usuarios-body');
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginated = usuariosData.slice(start, end);

        if (paginated.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay usuarios.</td></tr>`;
            return;
        }

        paginated.forEach(u => {
            const tr = document.createElement('tr');
            
            // Avatar
            const imgTd = document.createElement('td');
            const img = document.createElement('img');
            img.src = u.strRutaImagen ? u.strRutaImagen : `https://ui-avatars.com/api/?name=${u.strNombreUsuario}&background=random`;
            img.style.width = '40px'; img.style.height = '40px'; 
            img.style.borderRadius = '50%'; img.style.objectFit = 'cover';
            imgTd.appendChild(img);

            const userTd = document.createElement('td');
            userTd.innerHTML = `<strong>${u.strNombreUsuario}</strong><br><small style="color:#6b7280">${u.strCorreo}</small>`;
            
            const perfilTd = document.createElement('td');
            perfilTd.textContent = u.perfilNombre;

            const estadoTd = document.createElement('td');
            const span = document.createElement('span');
            span.textContent = u.idEstadoUsuario === 1 ? 'Activo' : 'Inactivo';
            span.style.padding = '4px 8px'; span.style.borderRadius = '4px'; span.style.fontSize = '0.85rem';
            span.style.background = u.idEstadoUsuario === 1 ? '#d1fae5' : '#fee2e2';
            span.style.color = u.idEstadoUsuario === 1 ? '#065f46' : '#991b1b';
            estadoTd.appendChild(span);

            const accTd = document.createElement('td');
            const btnEdit = document.createElement('button');
            btnEdit.textContent = 'Editar'; btnEdit.className = 'btn-edit';
            btnEdit.onclick = () => loadFormData(u);
            
            const btnDel = document.createElement('button');
            btnDel.textContent = 'Eliminar'; btnDel.className = 'btn-delete';
            btnDel.onclick = () => deleteUsuario(u.id);

            accTd.append(btnEdit, btnDel);
            tr.append(imgTd, userTd, perfilTd, estadoTd, accTd);
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-usr');
        controls.innerHTML = '';
        const pageCount = Math.ceil(usuariosData.length / rowsPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => { currentPage = i; renderTable(); };
            controls.appendChild(btn);
        }
    }

    function loadFormData(u) {
        document.getElementById('usuario-id').value = u.id;
        document.getElementById('nombre-usuario').value = u.strNombreUsuario;
        document.getElementById('correo-usuario').value = u.strCorreo;
        document.getElementById('perfil-usuario').value = u.idPerfil;
        document.getElementById('celular-usuario').value = u.strNumeroCelular || '';
        document.getElementById('estado-usuario').value = u.idEstadoUsuario;
        document.getElementById('pwd-usuario').value = ''; // Se deja vacío intencionalmente
        
        const rutaInput = document.getElementById('ruta-imagen');
        rutaInput.value = u.strRutaImagen || '';
        triggerImagePreview(rutaInput.value);

        document.getElementById('btn-save-usr').textContent = 'Actualizar Usuario';
        document.getElementById('btn-cancel-usr').classList.remove('hidden');
    }

    function resetForm() {
        document.getElementById('form-usuario').reset();
        document.getElementById('usuario-id').value = '';
        document.getElementById('btn-save-usr').textContent = 'Guardar Usuario';
        document.getElementById('btn-cancel-usr').classList.add('hidden');
        document.getElementById('preview-container').style.display = 'none';
    }

    function triggerImagePreview(url) {
        const previewCont = document.getElementById('preview-container');
        const imgPrev = document.getElementById('img-preview');
        if (url && url.startsWith('http')) {
            imgPrev.src = url;
            previewCont.style.display = 'block';
        } else {
            previewCont.style.display = 'none';
        }
    }

    function setupEventListeners() {
        document.getElementById('form-usuario').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                strNombreUsuario: document.getElementById('nombre-usuario').value.trim(),
                strCorreo: document.getElementById('correo-usuario').value.trim(),
                idPerfil: parseInt(document.getElementById('perfil-usuario').value),
                strNumeroCelular: document.getElementById('celular-usuario').value.trim(),
                strPwd: document.getElementById('pwd-usuario').value,
                idEstadoUsuario: parseInt(document.getElementById('estado-usuario').value),
                strRutaImagen: document.getElementById('ruta-imagen').value.trim()
            };
            saveUsuario(data, document.getElementById('usuario-id').value);
        });

        document.getElementById('btn-cancel-usr').addEventListener('click', resetForm);
        
        document.getElementById('ruta-imagen').addEventListener('input', (e) => {
            triggerImagePreview(e.target.value);
        });
    }

    return { render: renderView };
})();