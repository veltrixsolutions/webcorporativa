// static/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // 1. Decodificar JWT
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    const userData = parseJwt(token);
    if (!userData) {
        localStorage.removeItem('jwt_token');
        window.location.href = '/login.html';
        return;
    }

    // 2. Activar Botón de Cerrar Sesión (Arriba para evitar fallos si la red cae)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = '/login.html'; 
        });
    }

    // 3. Establecer datos del usuario en la UI
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = userData.nombre || 'Usuario';
    
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg) {
        if (userData.ruta_imagen && userData.ruta_imagen.trim() !== "") {
            avatarImg.src = userData.ruta_imagen;
        } else {
            avatarImg.src = `https://ui-avatars.com/api/?name=${userData.nombre}&background=2563eb&color=fff`;
        }
    }

    // 4. Cargar Menú (A prueba de fallos 404)
    async function loadMenu() {
        let menus = [];
        
        try {
            const response = await fetch('/api/v1/menu', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
                return;
            }

            if (response.ok) {
                menus = await response.json();
            }
        } catch (error) {
            console.warn('El endpoint del menú aún no existe o falló. Intentando Bypass...');
        }

        // BYPASS DE SUPER ADMINISTRADOR (ID 1)
        // Entra aquí ya sea porque la tabla está vacía o porque el servidor dio error 404
        if ((!menus || menus.length === 0) && userData.perfil_id === 1) {
            menus = [{
                nombre_menu: "Configuración Inicial",
                modulos: [
                    { id: 1, nombre: "Módulo" },
                    { id: 2, nombre: "Perfil" },
                    { id: 3, nombre: "Usuario" },
                    { id: 4, nombre: "Permisos-Perfil" }
                ]
            }];
        }

        renderMenu(menus);
    }

    // 5. Renderizar el Menú
    function renderMenu(menus) {
        const menuContainer = document.getElementById('dynamic-menu');
        if (!menuContainer) return;
        
        menuContainer.innerHTML = '';

        if (!menus || menus.length === 0) {
            menuContainer.innerHTML = '<p style="padding: 20px; color: #6b7280; text-align: center; font-size: 0.9rem;">No tienes módulos asignados.</p>';
            return;
        }

        menus.forEach(menuGroup => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'menu-group';
            
            const title = document.createElement('div');
            title.className = 'menu-title';
            title.textContent = menuGroup.nombre_menu;
            groupDiv.appendChild(title);

            menuGroup.modulos.forEach(modulo => {
                const item = document.createElement('a');
                item.className = 'menu-item';
                item.textContent = modulo.nombre;
                item.dataset.id = modulo.id;
                item.dataset.menu = menuGroup.nombre_menu;
                
                item.addEventListener('click', () => {
                    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    
                    updateBreadcrumbs(menuGroup.nombre_menu, modulo.nombre);
                    loadModuleContent(modulo.id, modulo.nombre);
                });

                groupDiv.appendChild(item);
            });

            menuContainer.appendChild(groupDiv);
        });
    }

    // Actualizar Breadcrumbs
    function updateBreadcrumbs(menuName, moduleName) {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.innerHTML = `
                <span class="crumb">Inicio</span>
                <span class="separator">/</span>
                <span>${menuName}</span>
                <span class="separator">/</span>
                <span class="crumb">${moduleName}</span>
            `;
        }
    }

    // Enrutador de Módulos
    function loadModuleContent(moduleId, moduleName) {
        const container = document.getElementById('module-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="data-card-centered">
                <h2>Cargando módulo: ${moduleName}...</h2>
            </div>
        `;

// static/js/usuario.js

const UsuarioModule = (() => {
    let usuariosData = [];
    let perfilesDisponibles = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    
    // Objeto para almacenar los permisos del usuario logueado en este módulo
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId) {
        // 1. Obtener los permisos exactos desde el backend antes de dibujar la pantalla
        await cargarPermisosSeguridad(moduleId);

        // 2. Validación estricta: Si no tiene permiso de consulta, se bloquea la vista
        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div class="data-card-centered">
                    <h1 style="color: #ef4444;"><i class="fas fa-ban"></i> Acceso Denegado</h1>
                    <p>No tienes los privilegios necesarios para visualizar este módulo.</p>
                </div>
            `;
            return;
        }

        // 3. Renderizar botones condicionalmente
        const btnNuevoHTML = permisos.bitAgregar ? `
            <div style="text-align: right; margin-bottom: 20px;">
                <button id="btn-nuevo-usuario" class="btn-submit" style="background-color: #34A853; width: auto; padding: 10px 20px;">
                    <i class="fas fa-user-plus"></i> Nuevo Usuario
                </button>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 800px;">
                <h1 style="margin-bottom: 10px; color: #1f2937; font-size: 1.8rem;">Directorio de Usuarios</h1>
                <p style="margin-bottom: 20px;">Gestiona el acceso de los empleados y asigna sus perfiles.</p>
                
                <div id="alert-usuario" class="alert hidden"></div>

                ${btnNuevoHTML}

                <form id="form-usuario" class="vertical-form" style="display: none; border-top: 2px solid #e5e7eb; padding-top: 25px;">
                    <h2 id="form-titulo" style="margin-bottom: 20px; color: #374151;">Nuevo Usuario</h2>
                    <input type="hidden" id="usuario-id" value="">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group">
                            <label for="nombre-usuario">Nombre de Usuario</label>
                            <input type="text" id="nombre-usuario" required autocomplete="off">
                        </div>
                        
                        <div class="form-group">
                            <label for="correo-usuario">Correo Electrónico</label>
                            <input type="email" id="correo-usuario" required autocomplete="off">
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
                            <input type="password" id="pwd-usuario" autocomplete="new-password" placeholder="Solo para nuevo o cambiar">
                        </div>

                        <div class="form-group">
                            <label for="estado-usuario">Estado</label>
                            <select id="estado-usuario">
                                <option value="1">Activo</option>
                                <option value="0">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top: 15px;">
                        <label for="ruta-imagen">URL de la Imagen de Perfil</label>
                        <input type="text" id="ruta-imagen" placeholder="https://ejemplo.com/imagen.jpg">
                    </div>

                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="submit" id="btn-save-usr" class="btn-submit">Guardar Usuario</button>
                        <button type="button" id="btn-cancel-usr" class="btn-cancel">Cancelar</button>
                    </div>
                </form>

                <div class="table-container" id="tabla-contenedor">
                    <table>
                        <thead>
                            <tr>
                                <th>Avatar</th>
                                <th>Usuario</th>
                                <th>Perfil</th>
                                <th>Estado</th>
                                ${permisos.bitEditar || permisos.bitEliminar ? '<th>Acciones</th>' : ''}
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

    // --- CARGAR PERMISOS DEL USUARIO LOGUEADO ---
    async function cargarPermisosSeguridad(moduleId) {
        try {
            // Decodificamos el token para ver si es Super Admin (Bypass total)
            const base64Url = getToken().split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const userData = JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
            
            if (userData.perfil_id === 1) {
                permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true };
                return;
            }

            // Si es un usuario normal, le preguntamos al backend sus permisos
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                permisos = await res.json();
            }
        } catch (e) { console.error("Error al validar seguridad:", e); }
    }

    function showMessage(msg, isError = false) {
        const alertBox = document.getElementById('alert-usuario');
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3500);
    }

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

    function renderTable() {
        const tbody = document.getElementById('tabla-usuarios-body');
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginated = usuariosData.slice(start, end);

        if (paginated.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay usuarios registrados.</td></tr>`;
            return;
        }

        paginated.forEach(u => {
            const tr = document.createElement('tr');
            
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

            tr.append(imgTd, userTd, perfilTd, estadoTd);

            // Renderizado Dinámico de Botones de Acción
            if (permisos.bitEditar || permisos.bitEliminar) {
                const accTd = document.createElement('td');
                
                if (permisos.bitEditar) {
                    const btnEdit = document.createElement('button');
                    btnEdit.innerHTML = '<i class="fas fa-edit"></i>'; 
                    btnEdit.className = 'btn-edit';
                    btnEdit.title = 'Editar';
                    btnEdit.onclick = () => loadFormData(u);
                    accTd.appendChild(btnEdit);
                }
                
                if (permisos.bitEliminar) {
                    const btnDel = document.createElement('button');
                    btnDel.innerHTML = '<i class="fas fa-trash"></i>'; 
                    btnDel.className = 'btn-delete';
                    btnDel.title = 'Eliminar';
                    btnDel.onclick = () => deleteUsuario(u.id);
                    accTd.appendChild(btnDel);
                }
                tr.appendChild(accTd);
            }

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
        document.getElementById('form-usuario').style.display = 'block';
        document.getElementById('tabla-contenedor').style.display = 'none';
        
        if (document.getElementById('btn-nuevo-usuario')) {
            document.getElementById('btn-nuevo-usuario').parentElement.style.display = 'none';
        }

        document.getElementById('form-titulo').textContent = 'Editar Usuario';
        document.getElementById('usuario-id').value = u.id;
        document.getElementById('nombre-usuario').value = u.strNombreUsuario;
        document.getElementById('correo-usuario').value = u.strCorreo;
        document.getElementById('perfil-usuario').value = u.idPerfil;
        document.getElementById('celular-usuario').value = u.strNumeroCelular || '';
        document.getElementById('estado-usuario').value = u.idEstadoUsuario;
        document.getElementById('pwd-usuario').value = ''; 
        document.getElementById('ruta-imagen').value = u.strRutaImagen || '';
        
        document.getElementById('btn-save-usr').textContent = 'Actualizar Usuario';
    }

    function resetForm() {
        document.getElementById('form-usuario').reset();
        document.getElementById('usuario-id').value = '';
        document.getElementById('form-usuario').style.display = 'none';
        document.getElementById('tabla-contenedor').style.display = 'block';
        
        if (document.getElementById('btn-nuevo-usuario')) {
            document.getElementById('btn-nuevo-usuario').parentElement.style.display = 'block';
        }
    }

    function setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-usuario');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => {
                document.getElementById('form-usuario').reset();
                document.getElementById('usuario-id').value = '';
                document.getElementById('form-titulo').textContent = 'Nuevo Usuario';
                document.getElementById('btn-save-usr').textContent = 'Guardar Usuario';
                
                document.getElementById('form-usuario').style.display = 'block';
                document.getElementById('tabla-contenedor').style.display = 'none';
                btnNuevo.parentElement.style.display = 'none';
            });
        }

        document.getElementById('btn-cancel-usr').addEventListener('click', resetForm);

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
    }

    return { render: renderView };
})();
    }

    // Iniciar
    loadMenu();
});