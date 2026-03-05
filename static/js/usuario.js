// static/js/usuario.js
const UsuarioModule = (() => {
    let usuariosData = [];
    let perfilesDisponibles = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        // Pantalla de Acceso Denegado Profesional
        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div class="data-card-centered" style="max-width: 600px; padding: 40px; text-align: center; background: #fef2f2; border: 1px solid #f87171; border-radius: 12px;">
                    <i class="fas fa-shield-alt" style="font-size: 3rem; color: #ef4444; margin-bottom: 15px;"></i>
                    <h1 style="color: #991b1b; font-size: 1.8rem;">Acceso Denegado</h1>
                    <p style="color: #7f1d1d;">No tienes los permisos necesarios para visualizar este módulo.</p>
                </div>`; 
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-usuario" class="btn-submit" style="background-color: #2563eb; width: auto; padding: 10px 20px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-user-plus"></i> Nuevo Usuario
               </button>` 
            : '';

        // Renderizado Principal
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 1000px; padding: 30px;">
                
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-users" style="color: #64748b; margin-right: 10px;"></i>Directorio de Usuarios
                        </h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.95rem;">Gestión de accesos y perfiles del sistema.</p>
                    </div>
                    <div id="contenedor-btn-nuevo">
                        ${btnNuevoHTML}
                    </div>
                </div>

                <div id="alert-usuario" class="alert hidden"></div>

                <form id="form-usuario" class="vertical-form" style="display: none; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                    <h2 id="form-titulo" style="color: #1e293b; font-size: 1.25rem; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Registrar Nuevo Usuario</h2>
                    <input type="hidden" id="usuario-id" value="">
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div class="form-group">
                            <label>Nombre de Usuario</label>
                            <input type="text" id="nombre-usuario" required placeholder="Ej. Kevin Martínez">
                        </div>
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" id="correo-usuario" required placeholder="correo@empresa.com">
                        </div>
                        <div class="form-group">
                            <label>Perfil de Acceso</label>
                            <select id="perfil-usuario" required></select>
                        </div>
                        <div class="form-group">
                            <label>Contraseña Provisional</label>
                            <input type="password" id="pwd-usuario" placeholder="Dejar en blanco para mantener actual">
                        </div>
                        <div class="form-group">
                            <label>Estado de Cuenta</label>
                            <select id="estado-usuario">
                                <option value="1">Activo - Permitir acceso</option>
                                <option value="0">Inactivo - Bloquear acceso</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>URL de Fotografía (Opcional)</label>
                            <input type="text" id="ruta-imagen" placeholder="https://ejemplo.com/foto.jpg">
                        </div>
                    </div>
                    
                    <div class="form-actions" style="justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                        <button type="button" id="btn-cancel-usr" class="btn-cancel" style="flex: none; width: 120px;">Cancelar</button>
                        <button type="submit" class="btn-submit" style="flex: none; width: 150px; background-color: #10b981;">
                            <i class="fas fa-save" style="margin-right: 5px;"></i> Guardar
                        </button>
                    </div>
                </form>

                <div id="tabla-contenedor" style="width: 100%;">
                    <div class="table-container" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <table style="min-width: 700px; width: 100%; border-collapse: collapse;">
                            <thead style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 12px 20px; width: 60px; text-align: center;">Avatar</th>
                                    <th style="padding: 12px 20px;">Información del Usuario</th>
                                    <th style="padding: 12px 20px;">Perfil Asignado</th>
                                    <th style="padding: 12px 20px;">Estado</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 12px 20px; text-align: right;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-usuarios-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls-usr" class="pagination"></div>
                </div>
            </div>`;

        setupEventListeners(); 
        cargarPerfilesEnSelect(); 
        fetchUsuarios();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { 
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) permisos = await res.json(); 
        } catch (e) { console.error("Error al cargar permisos:", e); }
    }

    function showMessage(msg, isError = false) {
        const a = document.getElementById('alert-usuario'); 
        a.innerHTML = isError ? `<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>${msg}` : `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>${msg}`; 
        a.className = `alert ${isError ? 'error' : 'success'}`; 
        a.style.display = 'flex'; 
        setTimeout(() => a.style.display = 'none', 4000);
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
        } catch (e) { console.error("Error cargando perfiles:", e); }
    }

    async function fetchUsuarios() {
        try { 
            const res = await fetch('/api/v1/usuarios', { headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) {
                usuariosData = await res.json() || []; 
                currentPage = 1; 
                renderTable(); 
            } 
        } catch (e) { console.error("Error obteniendo usuarios:", e); }
    }

    async function saveUsuario(data, id) {
        if (!id && !data.strPwd) { showMessage("La contraseña provisional es obligatoria para usuarios nuevos.", true); return; }
        const url = id ? `/api/v1/usuarios/${id}` : '/api/v1/usuarios';
        
        try { 
            const res = await fetch(url, { 
                method: id ? 'PUT' : 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, 
                body: JSON.stringify(data) 
            }); 
            if (res.ok) { 
                showMessage('Usuario guardado correctamente.'); 
                resetForm(); 
                fetchUsuarios(); 
            } else {
                const errData = await res.json();
                showMessage(errData.error || 'Error al guardar el usuario.', true);
            }
        } catch (e) { showMessage("Error de conexión al servidor.", true); }
    }

    async function deleteUsuario(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este usuario de forma permanente?')) return;
        try { 
            const res = await fetch(`/api/v1/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                showMessage('Usuario eliminado del sistema.'); 
                fetchUsuarios(); 
            } 
        } catch (e) { showMessage("Error al intentar eliminar.", true); }
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-usuarios-body'); 
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage; 
        const paginated = usuariosData.slice(start, start + rowsPerPage);
        
        if (paginated.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #64748b;">No hay usuarios registrados.</td></tr>`; 
            return; 
        }

        paginated.forEach(u => {
            const tr = document.createElement('tr');
            tr.style.transition = "background-color 0.2s";
            tr.onmouseover = () => tr.style.backgroundColor = '#f8fafc';
            tr.onmouseout = () => tr.style.backgroundColor = 'transparent';

            // Badge de Estado
            const estadoBadge = u.idEstadoUsuario === 1 
                ? `<span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 4px; vertical-align: middle;"></i>Activo</span>` 
                : `<span style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;"><i class="fas fa-circle" style="font-size: 0.5rem; margin-right: 4px; vertical-align: middle;"></i>Inactivo</span>`;

            // Avatar Placeholder (Maneja vacíos)
            const avatarUrl = u.strRutaImagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.strNombreUsuario)}&background=e2e8f0&color=475569&bold=true`;

            tr.innerHTML = `
                <td style="padding: 15px 20px; text-align: center;">
                    <img src="${avatarUrl}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 10px; border: 2px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                </td>
                <td style="padding: 15px 20px;">
                    <strong style="color: #0f172a; font-size: 0.95rem;">${u.strNombreUsuario}</strong><br>
                    <small style="color: #64748b; font-size: 0.85rem;"><i class="far fa-envelope" style="margin-right: 4px;"></i>${u.strCorreo}</small>
                </td>
                <td style="padding: 15px 20px; color: #475569; font-weight: 500;">
                    <i class="fas fa-id-badge" style="color: #94a3b8; margin-right: 6px;"></i>${u.perfilNombre}
                </td>
                <td style="padding: 15px 20px;">${estadoBadge}</td>`;

            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                td.style.padding = '15px 20px';
                td.style.textAlign = 'right';

                if (permisos.bitEditar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-edit"></i>'; 
                    b.className = 'btn-edit'; 
                    b.title = "Editar Usuario";
                    b.onclick = () => loadFormData(u); 
                    td.appendChild(b); 
                }
                if (permisos.bitEliminar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    b.className = 'btn-delete'; 
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
        const controls = document.getElementById('pagination-controls-usr'); 
        controls.innerHTML = '';
        const pageCount = Math.ceil(usuariosData.length / rowsPerPage);
        if(pageCount <= 1) return; // Ocultar si solo hay 1 página

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button'); 
            btn.textContent = i; 
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; 
            btn.onclick = () => { currentPage = i; renderTable(); }; 
            controls.appendChild(btn);
        }
    }

    function loadFormData(u) {
        document.getElementById('form-usuario').style.display = 'block'; 
        document.getElementById('tabla-contenedor').style.display = 'none';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if (btnContainer) btnContainer.style.display = 'none';
        
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-user-edit" style="color: #3b82f6; margin-right: 8px;"></i>Editar Usuario: ${u.strNombreUsuario}`;
        document.getElementById('usuario-id').value = u.id; 
        document.getElementById('nombre-usuario').value = u.strNombreUsuario;
        document.getElementById('correo-usuario').value = u.strCorreo; 
        document.getElementById('perfil-usuario').value = u.idPerfil;
        document.getElementById('estado-usuario').value = u.idEstadoUsuario; 
        document.getElementById('ruta-imagen').value = u.strRutaImagen || '';
        document.getElementById('pwd-usuario').value = ''; // Limpiar contraseña por seguridad
    }

    function resetForm() {
        document.getElementById('form-usuario').reset(); 
        document.getElementById('usuario-id').value = '';
        document.getElementById('form-titulo').innerHTML = `<i class="fas fa-user-plus" style="color: #10b981; margin-right: 8px;"></i>Registrar Nuevo Usuario`;
        document.getElementById('form-usuario').style.display = 'none'; 
        document.getElementById('tabla-contenedor').style.display = 'block';
        
        const btnContainer = document.getElementById('contenedor-btn-nuevo');
        if (btnContainer) btnContainer.style.display = 'block';
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-usuario');
        if (btn) {
            btn.addEventListener('click', () => { 
                resetForm(); 
                document.getElementById('form-usuario').style.display = 'block'; 
                document.getElementById('tabla-contenedor').style.display = 'none'; 
                document.getElementById('contenedor-btn-nuevo').style.display = 'none'; 
            });
        }
        
        document.getElementById('btn-cancel-usr').addEventListener('click', resetForm);
        
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