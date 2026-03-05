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
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                        <div style="width: 80px; height: 80px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-lock" style="font-size: 2.5rem; color: #ef4444;"></i>
                        </div>
                        <h1 style="color: #0f172a; font-size: 1.8rem; margin-bottom: 10px; font-weight: 700;">Acceso Restringido</h1>
                        <p style="color: #64748b; font-size: 1rem; line-height: 1.5;">No tienes los privilegios necesarios para visualizar el directorio de usuarios.</p>
                    </div>
                </div>`;
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-usuario" class="btn-primary" style="background-color: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                <i class="fas fa-user-plus"></i> Nuevo Usuario
               </button>` 
            : '';

        // Renderizado Principal con Inyección de Estilos
        container.innerHTML = `
            <style>
                .ux-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; align-items: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; }
                .ux-modal-overlay.active { opacity: 1; visibility: visible; }
                .ux-modal-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 650px; transform: translateY(30px) scale(0.95); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden; }
                .ux-modal-overlay.active .ux-modal-card { transform: translateY(0) scale(1); }
                
                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: #ffffff; border-radius: 10px; padding: 16px 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 4px solid #3b82f6; }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: #ef4444; }
                
                .ux-table-row { transition: background-color 0.2s ease, transform 0.2s ease; }
                .ux-table-row:hover { background-color: #f8fafc; transform: scale(1.002); }
                
                .ux-input { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; color: #0f172a; transition: all 0.2s; background: #ffffff; }
                .ux-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px;">
                    <div>
                        <h1 style="color: #0f172a; font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px;">Directorio de Usuarios</h1>
                        <p style="color: #64748b; font-size: 1rem; margin: 0;">Administración de cuentas y accesos a la plataforma.</p>
                    </div>
                    <div>${btnNuevoHTML}</div>
                </div>

                <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 16px 20px; width: 70px; text-align: center; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Avatar</th>
                                    <th style="padding: 16px 20px; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Información</th>
                                    <th style="padding: 16px 20px; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Perfil Asignado</th>
                                    <th style="padding: 16px 20px; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Estado</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 16px 20px; text-align: right; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-usuarios-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls-usr" style="padding: 15px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 8px; background: #fdfdfd;"></div>
                </div>
            </div>

            <div id="modal-usuario" class="ux-modal-overlay">
                <div class="ux-modal-card">
                    <form id="form-usuario">
                        <div style="padding: 24px 30px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd;">
                            <h2 id="form-titulo" style="margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                                <div style="background: #eff6ff; color: #3b82f6; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-user"></i></div>
                                <span>Registrar Usuario</span>
                            </h2>
                            <button type="button" id="btn-close-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                        </div>
                        
                        <div style="padding: 30px; max-height: 70vh; overflow-y: auto;">
                            <input type="hidden" id="usuario-id" value="">
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Nombre Completo <span style="color: #ef4444;">*</span></label>
                                    <input type="text" id="nombre-usuario" class="ux-input" required placeholder="Ej. Kevin Martínez">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Correo Electrónico <span style="color: #ef4444;">*</span></label>
                                    <input type="email" id="correo-usuario" class="ux-input" required placeholder="correo@empresa.com">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Perfil de Acceso <span style="color: #ef4444;">*</span></label>
                                    <select id="perfil-usuario" class="ux-input" required></select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Estado de Cuenta <span style="color: #ef4444;">*</span></label>
                                    <select id="estado-usuario" class="ux-input">
                                        <option value="1">Activo (Permitir acceso)</option>
                                        <option value="0">Inactivo (Bloquear acceso)</option>
                                    </select>
                                </div>
                                
                                <div style="grid-column: 1 / -1; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px;">
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">
                                        <i class="fas fa-lock" style="color: #94a3b8; margin-right: 5px;"></i> Contraseña Provisional
                                    </label>
                                    <input type="password" id="pwd-usuario" class="ux-input" placeholder="Para editar, déjalo en blanco si no quieres cambiarla">
                                    <p style="margin: 8px 0 0 0; font-size: 0.8rem; color: #64748b;">Obligatorio al crear. Al usuario se le pedirá cambiarla en su primer login.</p>
                                </div>

                                <div style="grid-column: 1 / -1;">
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">URL de Fotografía (Opcional)</label>
                                    <input type="text" id="ruta-imagen" class="ux-input" placeholder="https://ejemplo.com/avatar.jpg">
                                </div>
                            </div>
                        </div>

                        <div style="padding: 20px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                            <button type="button" id="btn-cancel-modal" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancelar</button>
                            <button type="submit" id="btn-save-usr" style="background: #10b981; border: none; color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">
                                <i class="fas fa-check"></i> <span>Guardar Usuario</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="ux-toast" class="ux-toast">
                <div id="toast-icon" style="font-size: 1.2rem;"></div>
                <div style="display: flex; flex-direction: column;">
                    <span id="toast-title" style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">Notificación</span>
                    <span id="toast-msg" style="color: #64748b; font-size: 0.85rem;"></span>
                </div>
            </div>
        `;

        setupEventListeners(); cargarPerfilesEnSelect(); fetchUsuarios();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

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
            document.getElementById('toast-icon').innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
        }
        setTimeout(() => { toast.classList.remove('show'); }, 4000);
    }

    // Modal UX
    function openModal(isEdit = false, u = null) {
        document.getElementById('form-usuario').reset();
        document.getElementById('usuario-id').value = '';
        
        if (isEdit && u) {
            document.getElementById('form-titulo').innerHTML = `<div style="background: #fdf4ff; color: #d946ef; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-user-edit"></i></div><span>Editar Usuario</span>`;
            document.getElementById('usuario-id').value = u.id;
            document.getElementById('nombre-usuario').value = u.strNombreUsuario;
            document.getElementById('correo-usuario').value = u.strCorreo;
            document.getElementById('perfil-usuario').value = u.idPerfil;
            document.getElementById('estado-usuario').value = u.idEstadoUsuario;
            document.getElementById('ruta-imagen').value = u.strRutaImagen || '';
            document.getElementById('pwd-usuario').placeholder = "Déjalo en blanco para no modificarla";
        } else {
            document.getElementById('form-titulo').innerHTML = `<div style="background: #ecfdf5; color: #10b981; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-user-plus"></i></div><span>Registrar Usuario</span>`;
            document.getElementById('pwd-usuario').placeholder = "Requerida para usuarios nuevos";
        }
        
        document.getElementById('modal-usuario').classList.add('active');
        setTimeout(() => document.getElementById('nombre-usuario').focus(), 100);
    }

    function closeModal() {
        document.getElementById('modal-usuario').classList.remove('active');
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
            if (res.ok) { usuariosData = await res.json() || []; currentPage = 1; renderTable(); } 
        } catch (e) { console.error("Error obteniendo usuarios"); }
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
                showToast('¡Guardado!', 'Usuario procesado correctamente. Revisa la bandeja de salida.', 'success'); 
                fetchUsuarios(); 
            } else {
                const errData = await res.json();
                showToast('Error de Integridad', errData.error || 'No se pudo guardar.', 'error');
            }
        } catch (e) { showToast("Error", "Fallo de conexión al servidor.", "error"); }

        btnSave.innerHTML = originalContent;
        btnSave.disabled = false;
    }

    async function deleteUsuario(id) {
        if (!confirm('¿Eliminar permanentemente a este usuario? Esta acción revocará todos sus accesos.')) return;
        try { 
            const res = await fetch(`/api/v1/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                showToast('Eliminado', 'Usuario removido del sistema.', 'success'); 
                fetchUsuarios(); 
            } 
        } catch (e) { showToast("Error", "No se pudo eliminar el usuario.", "error"); }
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-usuarios-body'); tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage; const paginated = usuariosData.slice(start, start + rowsPerPage);
        
        if (paginated.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;"><div style="font-size: 2rem; margin-bottom: 10px;"><i class="fas fa-users-slash"></i></div>No hay usuarios registrados.</td></tr>`; 
            return; 
        }

        paginated.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';

            // Badges elegantes
            const estadoBadge = u.idEstadoUsuario === 1 
                ? `<span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-circle" style="font-size: 0.4rem;"></i>Activo</span>` 
                : `<span style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-circle" style="font-size: 0.4rem;"></i>Inactivo</span>`;

            // Avatar tipo "Squircle" (cuadrado redondeado)
            const avatarUrl = u.strRutaImagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.strNombreUsuario)}&background=e2e8f0&color=475569&bold=true&rounded=false`;

            tr.innerHTML = `
                <td style="padding: 15px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                    <img src="${avatarUrl}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                </td>
                <td style="padding: 15px 20px; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: flex; flex-direction: column;">
                        <strong style="color: #0f172a; font-size: 0.95rem; margin-bottom: 2px;">${u.strNombreUsuario}</strong>
                        <span style="color: #64748b; font-size: 0.85rem;"><i class="far fa-envelope" style="margin-right: 4px;"></i>${u.strCorreo}</span>
                    </div>
                </td>
                <td style="padding: 15px 20px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: 500;">
                    <i class="fas fa-id-badge" style="color: #94a3b8; margin-right: 6px;"></i>${u.perfilNombre}
                </td>
                <td style="padding: 15px 20px; border-bottom: 1px solid #f1f5f9;">${estadoBadge}</td>`;

            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                td.style.padding = '15px 20px';
                td.style.borderBottom = '1px solid #f1f5f9';
                td.style.textAlign = 'right';

                if (permisos.bitEditar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-pen"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: #3b82f6; font-size: 1.1rem; padding: 8px; cursor: pointer; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Editar Usuario";
                    b.onclick = () => openModal(true, u); 
                    td.appendChild(b); 
                }
                if (permisos.bitEliminar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: #ef4444; font-size: 1.1rem; padding: 8px; cursor: pointer; margin-left: 10px; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Eliminar Usuario";
                    b.onclick = () => deleteUsuario(u.id); 
                    td.appendChild(b); 
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-usr'); controls.innerHTML = '';
        const pageCount = Math.ceil(usuariosData.length / rowsPerPage);
        if(pageCount <= 1) return; 

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); 
            btn.textContent = i; 
            btn.style.cssText = `background: ${i === currentPage ? '#2563eb' : '#ffffff'}; color: ${i === currentPage ? '#ffffff' : '#475569'}; border: 1px solid ${i === currentPage ? '#2563eb' : '#e2e8f0'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s;`;
            if (i !== currentPage) btn.onmouseover = () => btn.style.background = '#f1f5f9';
            if (i !== currentPage) btn.onmouseout = () => btn.style.background = '#ffffff';
            btn.onclick = () => { currentPage = i; renderTable(); }; 
            controls.appendChild(btn);
        }
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
    }

    return { render: renderView };
})();