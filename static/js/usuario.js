const UsuarioModule = (() => {
    let usuariosData = [];
    let filteredData = []; 
    let perfilesDisponibles = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };
    
    let usuarioAEliminar = null;

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: var(--bg-card); border-radius: 20px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
                        <div style="width: 80px; height: 80px; background: var(--danger-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-lock" style="font-size: 2.5rem; color: var(--danger-text);"></i>
                        </div>
                        <h1 style="color: var(--text-primary); font-size: 1.8rem; margin-bottom: 10px; font-weight: 700;">Acceso Restringido</h1>
                        <p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.5;">No tienes los privilegios necesarios para visualizar el directorio de usuarios.</p>
                    </div>
                </div>`;
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-usuario" class="btn-primary" style="background-color: var(--brand-primary); color: var(--text-inverse); border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                <i class="fas fa-user-plus"></i> Nuevo Usuario
               </button>` 
            : '';

        // Renderizado Principal con Inyección de Estilos adaptados a THEMES
        container.innerHTML = `
            <style>
                .ux-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; align-items: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; padding: 15px;}
                .ux-modal-overlay.active { opacity: 1; visibility: visible; }
                .ux-modal-card { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 650px; transform: translateY(30px) scale(0.95); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: var(--shadow-md); border: 1px solid var(--border-color); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
                .ux-modal-overlay.active .ux-modal-card { transform: translateY(0) scale(1); }
                
                /* Estilos para Modal de Confirmación */
                .ux-confirm-card { max-width: 400px; text-align: center; padding: 30px 24px; border-radius: 20px; }
                .ux-confirm-icon { width: 70px; height: 70px; background: var(--danger-bg); border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px; color: var(--danger-text); font-size: 2rem; }
                .ux-confirm-title { font-size: 1.4rem; color: var(--text-primary); font-weight: 700; margin-bottom: 10px; }
                .ux-confirm-text { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px; }
                .ux-confirm-actions { display: flex; gap: 12px; justify-content: center; }
                .ux-confirm-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.95rem; }
                .ux-confirm-cancel { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-color); }
                .ux-confirm-cancel:hover { background: var(--border-color); }
                .ux-confirm-delete { background: var(--danger-hover-bg); color: var(--text-inverse); box-shadow: 0 4px 6px rgba(239,68,68,0.2); }
                .ux-confirm-delete:hover { filter: brightness(1.1); }

                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: var(--bg-card); border-radius: 10px; padding: 16px 24px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 4px solid var(--brand-primary); max-width: calc(100vw - 60px); }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: var(--danger-text); }
                
                .ux-table-row { transition: background-color 0.2s ease, transform 0.2s ease; border-bottom: 1px solid var(--border-color); }
                .ux-table-row:hover { background-color: var(--bg-hover); transform: scale(1.002); }
                
                .ux-input { width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; color: var(--text-primary); transition: all 0.2s; background: var(--input-bg); }
                .ux-input:focus { outline: none; border-color: var(--border-focus); box-shadow: var(--shadow-focus); }

                /* Buscador Ajustado */
                .search-container { position: relative; width: 100%; max-width: 500px; margin-bottom: 25px; }
                .search-container i { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1.1rem; }
                .search-input { width: 100%; padding: 14px 16px 14px 45px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 0.95rem; background: var(--bg-card); color: var(--text-primary); transition: all 0.2s; box-shadow: var(--shadow-sm); }
                .search-input:focus { outline: none; border-color: var(--border-focus); box-shadow: var(--shadow-focus); }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="margin: 0; color: var(--text-primary); font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-users" style="color: var(--text-secondary); margin-right: 10px;"></i>Directorio de Usuarios
                        </h1>
                        <p style="margin: 5px 0 0 0; color: var(--text-secondary); font-size: 0.95rem;">Administración de cuentas y accesos a la plataforma.</p>
                    </div>
                    <div id="contenedor-btn-nuevo">
                        ${btnNuevoHTML}
                    </div>
                </div>

                <div class="search-container">
                    <i class="fas fa-search"></i>
                    <input type="text" id="buscador-usuarios" class="search-input" placeholder="Buscar por nombre o correo electrónico..." autocomplete="off">
                </div>

                <div style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                            <thead style="background: var(--table-header-bg); border-bottom: 1px solid var(--border-color);">
                                <tr>
                                    <th style="padding: 16px 20px; width: 70px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Avatar</th>
                                    <th style="padding: 16px 20px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Información</th>
                                    <th style="padding: 16px 20px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Perfil Asignado</th>
                                    <th style="padding: 16px 20px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Estado</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 16px 20px; text-align: right; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-usuarios-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls-usr" style="padding: 15px 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: center; align-items: center; gap: 8px; background: var(--bg-card); flex-wrap: wrap;"></div>
                </div>
            </div>

            <div id="modal-usuario" class="ux-modal-overlay">
                <div class="ux-modal-card">
                    <form id="form-usuario" style="display: flex; flex-direction: column; height: 100%;">
                        <div style="padding: 24px 30px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); flex-shrink: 0;">
                            <h2 id="form-titulo" style="margin: 0; font-size: 1.25rem; color: var(--text-primary); font-weight: 700; display: flex; align-items: center; gap: 10px;">
                                <div style="background: var(--bg-active); color: var(--brand-primary); width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-user"></i></div>
                                <span>Registrar Usuario</span>
                            </h2>
                            <button type="button" id="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 1.2rem; cursor: pointer; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                        </div>
                        
                        <div style="padding: 30px; overflow-y: auto; flex-grow: 1;">
                            <input type="hidden" id="usuario-id" value="">
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 600;">Nombre Completo <span style="color: var(--danger-text);">*</span></label>
                                    <input type="text" id="nombre-usuario" class="ux-input" required placeholder="Ej. Kevin Martínez">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 600;">Correo Electrónico <span style="color: var(--danger-text);">*</span></label>
                                    <input type="email" id="correo-usuario" class="ux-input" required placeholder="correo@empresa.com">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 600;">Perfil de Acceso <span style="color: var(--danger-text);">*</span></label>
                                    <select id="perfil-usuario" class="ux-input" required></select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 600;">Estado de Cuenta <span style="color: var(--danger-text);">*</span></label>
                                    <select id="estado-usuario" class="ux-input">
                                        <option value="1">Activo (Permitir acceso)</option>
                                        <option value="0">Inactivo (Bloquear acceso)</option>
                                    </select>
                                </div>
                                
                                <div style="grid-column: 1 / -1; background: var(--bg-hover); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 10px;">
                                    <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 600;">
                                        <i class="fas fa-lock" style="color: var(--text-secondary); margin-right: 5px;"></i> Contraseña Provisional
                                    </label>
                                    <input type="password" id="pwd-usuario" class="ux-input" placeholder="Para editar, déjalo en blanco si no quieres cambiarla">
                                    <p style="margin: 8px 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">Obligatorio al crear. Al usuario se le pedirá cambiarla en su primer login.</p>
                                </div>

                                <div style="grid-column: 1 / -1;">
                                    <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 600;">URL de Fotografía (Opcional)</label>
                                    <input type="text" id="ruta-imagen" class="ux-input" placeholder="https://ejemplo.com/avatar.jpg">
                                </div>
                            </div>
                        </div>

                        <div style="padding: 20px 30px; background: var(--bg-card); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0; flex-wrap: wrap;">
                            <button type="button" id="btn-cancel-modal" style="background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancelar</button>
                            <button type="submit" id="btn-save-usr" style="background: #10b981; border: none; color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">
                                <i class="fas fa-check"></i> <span>Guardar Usuario</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="modal-confirm-delete" class="ux-modal-overlay">
                <div class="ux-modal-card ux-confirm-card">
                    <div class="ux-confirm-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="ux-confirm-title">¿Eliminar Usuario?</h3>
                    <p class="ux-confirm-text">Esta acción revocará todos sus accesos. ¿Estás seguro de que deseas eliminar permanentemente a este usuario?</p>
                    <div class="ux-confirm-actions">
                        <button type="button" id="btn-cancel-delete" class="ux-confirm-btn ux-confirm-cancel">Cancelar</button>
                        <button type="button" id="btn-confirm-delete" class="ux-confirm-btn ux-confirm-delete">Sí, eliminar</button>
                    </div>
                </div>
            </div>

            <div id="ux-toast" class="ux-toast">
                <div id="toast-icon" style="font-size: 1.2rem;"></div>
                <div style="display: flex; flex-direction: column;">
                    <span id="toast-title" style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">Notificación</span>
                    <span id="toast-msg" style="color: var(--text-secondary); font-size: 0.85rem;"></span>
                </div>
            </div>
        `;

        setupEventListeners(); cargarPerfilesEnSelect(); fetchUsuarios();
    }

    function getToken() { return sessionStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) { console.error("Error al cargar permisos"); }
    }

    function showToast(title, msg, type = 'success') {
        const toast = document.getElementById('ux-toast');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerText = msg;
        
        if(type === 'success') {
            toast.className = 'ux-toast show success';
            document.getElementById('toast-icon').innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
        } else {
            toast.className = 'ux-toast show error';
            document.getElementById('toast-icon').innerHTML = '<i class="fas fa-exclamation-circle" style="color: var(--danger-text);"></i>';
        }
        setTimeout(() => { toast.classList.remove('show'); }, 4000);
    }

    function openModal(isEdit = false, u = null) {
        document.getElementById('form-usuario').reset();
        document.getElementById('usuario-id').value = '';
        
        if (isEdit && u) {
            document.getElementById('form-titulo').innerHTML = `<div style="background: var(--bg-hover); color: var(--text-accent); width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-user-edit"></i></div><span>Editar Usuario</span>`;
            document.getElementById('usuario-id').value = u.id;
            document.getElementById('nombre-usuario').value = u.strNombreUsuario;
            document.getElementById('correo-usuario').value = u.strCorreo;
            document.getElementById('perfil-usuario').value = u.idPerfil;
            document.getElementById('estado-usuario').value = u.idEstadoUsuario;
            document.getElementById('ruta-imagen').value = u.strRutaImagen || '';
            document.getElementById('pwd-usuario').placeholder = "Déjalo en blanco para no modificarla";
        } else {
            document.getElementById('form-titulo').innerHTML = `<div style="background: rgba(16, 185, 129, 0.1); color: #10b981; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-user-plus"></i></div><span>Registrar Usuario</span>`;
            document.getElementById('pwd-usuario').placeholder = "Requerida para usuarios nuevos";
        }
        
        document.getElementById('modal-usuario').classList.add('active');
        setTimeout(() => document.getElementById('nombre-usuario').focus(), 100);
    }

    function closeModal() {
        document.getElementById('modal-usuario').classList.remove('active');
    }

    // Modal Confirmación Eliminación
    function openConfirmDeleteModal(id) {
        usuarioAEliminar = id; 
        document.getElementById('modal-confirm-delete').classList.add('active');
    }

    function closeConfirmDeleteModal() {
        usuarioAEliminar = null; 
        document.getElementById('modal-confirm-delete').classList.remove('active');
    }

    async function cargarPerfilesEnSelect() {
        try {
            const res = await fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) { 
                perfilesDisponibles = await res.json() || []; 
                const s = document.getElementById('perfil-usuario'); 
                s.innerHTML = '<option value="">Seleccione un perfil...</option>'; 
                perfilesDisponibles.forEach(p => { 
                    s.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`; 
                }); 
            }
        } catch (e) { console.error("Error cargando perfiles"); }
    }

    async function fetchUsuarios() {
        try { 
            const res = await fetch('/api/v1/usuarios', { headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                usuariosData = await res.json() || []; 
                filtrarUsuarios(); // Inicializa y renderiza
            } 
        } catch (e) { console.error("Error obteniendo usuarios"); }
    }

    function filtrarUsuarios() {
        const searchTerm = document.getElementById('buscador-usuarios').value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredData = [...usuariosData]; 
        } else {
            // Permite buscar por nombre o correo
            filteredData = usuariosData.filter(u => 
                u.strNombreUsuario.toLowerCase().includes(searchTerm) || 
                u.strCorreo.toLowerCase().includes(searchTerm)
            );
        }

        currentPage = 1; 
        renderTable();
    }

    async function saveUsuario(data, id) {
        if (!id && !data.strPwd) { showToast("Campo Obligatorio", "Debes asignar una contraseña al nuevo usuario.", "error"); return; }
        
        const btnSave = document.getElementById('btn-save-usr');
        const originalContent = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Enviando...</span>';
        btnSave.disabled = true;

        const url = id ? `/api/v1/usuarios/${id}` : '/api/v1/usuarios';
        
        try { 
            const res = await fetch(url, { 
                method: id ? 'PUT' : 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
                body: JSON.stringify(data) 
            }); 
            if (res.ok) { 
                closeModal();
                showToast('¡Guardado!', 'Usuario procesado correctamente.', 'success'); 
                document.getElementById('buscador-usuarios').value = ''; 
                fetchUsuarios(); 
            } else {
                const errData = await res.json();
                showToast('Error de Integridad', errData.error || 'No se pudo guardar.', 'error');
            }
        } catch (e) { showToast("Error", "Fallo de conexión al servidor.", "error"); }

        btnSave.innerHTML = originalContent;
        btnSave.disabled = false;
    }

    async function executeDeleteUsuario() {
        if (!usuarioAEliminar) return;

        const btnConfirm = document.getElementById('btn-confirm-delete');
        const originalContent = btnConfirm.innerHTML;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btnConfirm.disabled = true;

        try { 
            const res = await fetch(`/api/v1/usuarios/${usuarioAEliminar}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                closeConfirmDeleteModal();
                showToast('Eliminado', 'Usuario removido del sistema.', 'success'); 
                fetchUsuarios(); 
            } else {
                closeConfirmDeleteModal();
                showToast('Error', 'No se pudo eliminar el usuario.', 'error'); 
            }
        } catch (e) { 
            closeConfirmDeleteModal();
            showToast("Error", "Fallo de conexión al servidor.", "error"); 
        }

        btnConfirm.innerHTML = originalContent;
        btnConfirm.disabled = false;
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-usuarios-body'); 
        tbody.innerHTML = '';
        
        const start = (currentPage - 1) * rowsPerPage; 
        const paginated = filteredData.slice(start, start + rowsPerPage);
        
        if (filteredData.length === 0) { 
            const searchTerm = document.getElementById('buscador-usuarios').value;
            if (searchTerm) {
                tbody.innerHTML = `
                    <tr><td colspan="5" style="text-align:center; padding: 50px 20px; color: var(--text-secondary);">
                        <div style="font-size: 2.5rem; margin-bottom: 15px; color: var(--text-secondary);"><i class="fas fa-search-minus"></i></div>
                        <h3 style="color: var(--text-primary); margin-bottom: 5px;">No encontramos coincidencias</h3>
                        <p style="font-size: 0.95rem;">No hay usuarios con el nombre o correo "<b>${searchTerm}</b>".</p>
                        <button id="btn-limpiar-busqueda-usr" style="margin-top: 15px; background: transparent; border: 1px solid var(--border-color); color: var(--brand-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Limpiar Búsqueda</button>
                    </td></tr>`;
                
                setTimeout(() => {
                    const btnLimpiar = document.getElementById('btn-limpiar-busqueda-usr');
                    if (btnLimpiar) {
                        btnLimpiar.addEventListener('click', () => {
                            document.getElementById('buscador-usuarios').value = '';
                            filtrarUsuarios();
                        });
                    }
                }, 0);
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);"><div style="font-size: 2rem; margin-bottom: 10px;"><i class="fas fa-users-slash"></i></div>No hay usuarios registrados.</td></tr>`; 
            }
            renderPaginationControls();
            return; 
        }

        paginated.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';

            // Badges adaptados al tema
            const estadoBadge = u.idEstadoUsuario === 1 
                ? `<span style="background-color: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-circle" style="font-size: 0.4rem;"></i>Activo</span>` 
                : `<span style="background-color: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger-border); padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-circle" style="font-size: 0.4rem;"></i>Inactivo</span>`;

            // En modo oscuro, ui-avatars con fondo e2e8f0 desentona, puedes hacerlo transparente o dark
            const avatarUrl = u.strRutaImagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.strNombreUsuario)}&background=e2e8f0&color=475569&bold=true&rounded=false`;

            tr.innerHTML = `
                <td style="padding: 15px 20px; text-align: center; border-bottom: 1px solid var(--border-color);">
                    <img src="${avatarUrl}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 12px; border: 2px solid var(--border-color); box-shadow: var(--shadow-sm);">
                </td>
                <td style="padding: 15px 20px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; flex-direction: column;">
                        <strong style="color: var(--text-primary); font-size: 0.95rem; margin-bottom: 2px;">${u.strNombreUsuario}</strong>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;"><i class="far fa-envelope" style="margin-right: 4px;"></i>${u.strCorreo}</span>
                    </div>
                </td>
                <td style="padding: 15px 20px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 500;">
                    <i class="fas fa-id-badge" style="color: var(--text-secondary); margin-right: 6px;"></i>${u.perfilNombre}
                </td>
                <td style="padding: 15px 20px; border-bottom: 1px solid var(--border-color);">${estadoBadge}</td>`;

            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                td.style.padding = '15px 20px';
                td.style.borderBottom = '1px solid var(--border-color)';
                td.style.textAlign = 'right';

                if (permisos.bitEditar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-pen"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: var(--brand-primary); font-size: 1.1rem; padding: 8px; cursor: pointer; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Editar Usuario";
                    b.onclick = () => openModal(true, u); 
                    td.appendChild(b); 
                }
                if (permisos.bitEliminar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: var(--danger-text); font-size: 1.1rem; padding: 8px; cursor: pointer; margin-left: 10px; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Eliminar Usuario";
                    b.onclick = () => openConfirmDeleteModal(u.id); 
                    td.appendChild(b); 
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-usr'); 
        controls.innerHTML = '';
        const pageCount = Math.ceil(filteredData.length / rowsPerPage);
        
        if(pageCount <= 1) return; 

        const createBtn = (text, pageNum, disabled = false, icon = null) => {
            const btn = document.createElement('button');
            const innerContent = icon ? `<i class="${icon}"></i>` : text;
            btn.innerHTML = innerContent;
            
            if (disabled) {
                btn.style.cssText = `background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; margin: 2px; cursor: not-allowed; opacity: 0.5;`;
                btn.disabled = true;
            } else {
                const isCurrent = pageNum === currentPage && text !== 'Inicio' && text !== 'Fin';
                btn.style.cssText = `background: ${isCurrent ? 'var(--brand-primary)' : 'var(--bg-card)'}; color: ${isCurrent ? 'var(--text-inverse)' : 'var(--text-secondary)'}; border: 1px solid ${isCurrent ? 'var(--brand-primary)' : 'var(--border-color)'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; margin: 2px;`;
                if (!isCurrent) btn.onmouseover = () => btn.style.background = 'var(--bg-hover)';
                if (!isCurrent) btn.onmouseout = () => btn.style.background = 'var(--bg-card)';
                btn.onclick = () => { currentPage = pageNum; renderTable(); };
            }
            return btn;
        };

        controls.appendChild(createBtn('Inicio', 1, currentPage === 1, 'fas fa-angle-double-left'));

        for (let i = 1; i <= pageCount; i++) {
            controls.appendChild(createBtn(i, i));
        }

        controls.appendChild(createBtn('Fin', pageCount, currentPage === pageCount, 'fas fa-angle-double-right'));
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-usuario');
        if (btn) btn.addEventListener('click', () => openModal(false));
        
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
        
        document.getElementById('modal-usuario').addEventListener('click', (e) => {
            if(e.target.id === 'modal-usuario') closeModal();
        });
        
        document.getElementById('form-usuario').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = { 
                strNombreUsuario: document.getElementById('nombre-usuario').value.trim(), 
                strCorreo: document.getElementById('correo-usuario').value.trim(), 
                idPerfil: parseInt(document.getElementById('perfil-usuario').value), 
                strNumeroCelular: '', 
                strPwd: document.getElementById('pwd-usuario').value, 
                idEstadoUsuario: parseInt(document.getElementById('estado-usuario').value), 
                strRutaImagen: document.getElementById('ruta-imagen').value.trim() 
            };
            const id = document.getElementById('usuario-id').value;
            saveUsuario(data, id);
        });

        document.getElementById('btn-cancel-delete').addEventListener('click', closeConfirmDeleteModal);
        document.getElementById('btn-confirm-delete').addEventListener('click', executeDeleteUsuario);

        document.getElementById('modal-confirm-delete').addEventListener('click', (e) => {
            if(e.target.id === 'modal-confirm-delete') closeConfirmDeleteModal();
        });

        const inputBuscador = document.getElementById('buscador-usuarios');
        if (inputBuscador) {
            inputBuscador.addEventListener('keyup', filtrarUsuarios);
            inputBuscador.addEventListener('search', filtrarUsuarios); 
        }
    }

    return { render: renderView };
})();