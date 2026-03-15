const PerfilModule = (() => {
    let perfilesData = [];
    let filteredData = []; // Arreglo para manejar las búsquedas
    let currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };
    
    // Variable para guardar el ID a eliminar temporalmente
    let perfilAEliminar = null;

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
                        <p style="color: #64748b; font-size: 1rem; line-height: 1.5;">No tienes los privilegios necesarios para visualizar o modificar los perfiles del sistema.</p>
                    </div>
                </div>`;
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-perfil" class="btn-primary" style="background-color: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                <i class="fas fa-plus"></i> Nuevo Perfil
               </button>` 
            : '';

        container.innerHTML = `
            <style>
                .ux-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; align-items: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; padding: 15px; }
                .ux-modal-overlay.active { opacity: 1; visibility: visible; }
                .ux-modal-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 600px; transform: translateY(30px) scale(0.95); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
                .ux-modal-overlay.active .ux-modal-card { transform: translateY(0) scale(1); }
                
                /* Estilos para Modal de Confirmación */
                .ux-confirm-card { max-width: 400px; text-align: center; padding: 30px 24px; border-radius: 20px; }
                .ux-confirm-icon { width: 70px; height: 70px; background: #fef2f2; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px; color: #ef4444; font-size: 2rem; }
                .ux-confirm-title { font-size: 1.4rem; color: #0f172a; font-weight: 700; margin-bottom: 10px; }
                .ux-confirm-text { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px; }
                .ux-confirm-actions { display: flex; gap: 12px; justify-content: center; }
                .ux-confirm-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.95rem; }
                .ux-confirm-cancel { background: #f1f5f9; color: #475569; }
                .ux-confirm-cancel:hover { background: #e2e8f0; }
                .ux-confirm-delete { background: #ef4444; color: white; box-shadow: 0 4px 6px rgba(239,68,68,0.2); }
                .ux-confirm-delete:hover { background: #dc2626; }

                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: #ffffff; border-radius: 10px; padding: 16px 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 4px solid #3b82f6; max-width: calc(100vw - 60px); }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: #ef4444; }
                
                .ux-table-row { transition: background-color 0.2s ease, transform 0.2s ease; }
                .ux-table-row:hover { background-color: #f8fafc; transform: scale(1.002); }
                
                .ux-input { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; color: #0f172a; transition: all 0.2s; background: #ffffff; }
                .ux-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
                .ux-input:disabled { background: #f1f5f9; cursor: not-allowed; opacity: 0.8; color: #64748b; }

                /* Buscador Ajustado */
                .search-container { position: relative; width: 100%; max-width: 500px; margin-bottom: 25px; }
                .search-container i { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.1rem; }
                .search-input { width: 100%; padding: 14px 16px 14px 45px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; background: #ffffff; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                .search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.15); }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 1.75rem; font-weight: 700;">
                            <i class="fas fa-id-card-alt" style="color: #64748b; margin-right: 10px;"></i>Perfiles de Acceso
                        </h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.95rem;">Administración de roles y niveles de jerarquía del sistema.</p>
                    </div>
                    <div id="contenedor-btn-nuevo">
                        ${btnNuevoHTML}
                    </div>
                </div>

                <div class="search-container">
                    <i class="fas fa-search"></i>
                    <input type="text" id="buscador-perfiles" class="search-input" placeholder="Buscar perfiles por nombre..." autocomplete="off">
                </div>

                <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 600px;">
                            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 16px 24px; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Nombre del Perfil</th>
                                    <th style="padding: 16px 24px; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Jerarquía / Rol</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 16px 24px; text-align: right; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-perfiles-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls" style="padding: 15px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 8px; background: #fdfdfd; flex-wrap: wrap;"></div>
                </div>
            </div>

            <div id="modal-perfil" class="ux-modal-overlay">
                <div class="ux-modal-card">
                    <form id="form-perfil" style="display: flex; flex-direction: column; height: 100%;">
                        <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd; flex-shrink: 0;">
                            <h2 id="form-titulo" style="margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                                <div style="background: #eff6ff; color: #3b82f6; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-id-badge"></i></div>
                                <span>Nuevo Perfil</span>
                            </h2>
                            <button type="button" id="btn-close-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                        </div>
                        
                        <div style="padding: 24px; overflow-y: auto; flex-grow: 1;">
                            <input type="hidden" id="perfil-id" value="">
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Nombre del Perfil <span style="color: #ef4444;">*</span></label>
                                    <input type="text" id="nombre-perfil" class="ux-input" required placeholder="Ej. Gerencia Regional">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Nivel de Acceso Global <span style="color: #ef4444;">*</span></label>
                                    <select id="es-admin" class="ux-input">
                                        <option value="false">Usuario Estándar</option>
                                        <option value="true">Super Administrador</option>
                                    </select>
                                    <p id="admin-warning" style="margin: 8px 0 0 0; font-size: 0.8rem; color: #d97706; display: none;">
                                        <i class="fas fa-info-circle"></i> Bloqueado por seguridad.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; flex-wrap: wrap; flex-shrink: 0;">
                            <button type="button" id="btn-cancel-modal" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancelar</button>
                            <button type="submit" id="btn-save-perfil" style="background: #10b981; border: none; color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">
                                <i class="fas fa-check"></i> <span>Guardar</span>
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
                    <h3 class="ux-confirm-title">¿Eliminar Perfil?</h3>
                    <p class="ux-confirm-text">Se afectarán los usuarios y permisos vinculados a él. Esta acción es irreversible.</p>
                    <div class="ux-confirm-actions">
                        <button type="button" id="btn-cancel-delete" class="ux-confirm-btn ux-confirm-cancel">Cancelar</button>
                        <button type="button" id="btn-confirm-delete" class="ux-confirm-btn ux-confirm-delete">Sí, eliminar</button>
                    </div>
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

        setupEventListeners(); fetchPerfiles();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) { console.error(e); }
    }

    // UX: Sistema de Notificaciones Toasts
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

    // UX: Lógica del Modal
    function openModal(isEdit = false, p = null) {
        document.getElementById('form-perfil').reset();
        document.getElementById('perfil-id').value = '';
        document.getElementById('es-admin').disabled = false;
        document.getElementById('admin-warning').style.display = 'none';
        
        if (isEdit && p) {
            document.getElementById('form-titulo').innerHTML = `<div style="background: #fdf4ff; color: #d946ef; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-edit"></i></div><span>Editar Perfil</span>`;
            document.getElementById('perfil-id').value = p.id;
            document.getElementById('nombre-perfil').value = p.strNombrePerfil;
            document.getElementById('es-admin').value = p.bitAdministrador.toString();
            
            // Protección vital UI para el Admin Principal
            if(p.id === 1) {
                document.getElementById('es-admin').disabled = true;
                document.getElementById('admin-warning').style.display = 'block';
            }
        } else {
            document.getElementById('form-titulo').innerHTML = `<div style="background: #ecfdf5; color: #10b981; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-plus"></i></div><span>Crear Perfil</span>`;
        }
        
        document.getElementById('modal-perfil').classList.add('active');
        setTimeout(() => document.getElementById('nombre-perfil').focus(), 100);
    }

    function closeModal() {
        document.getElementById('modal-perfil').classList.remove('active');
    }

    // Modal Confirmación Eliminación
    function openConfirmDeleteModal(id) {
        perfilAEliminar = id;
        document.getElementById('modal-confirm-delete').classList.add('active');
    }

    function closeConfirmDeleteModal() {
        perfilAEliminar = null;
        document.getElementById('modal-confirm-delete').classList.remove('active');
    }

    async function fetchPerfiles() {
        try { 
            const res = await fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                perfilesData = await res.json() || []; 
                filtrarPerfiles(); // Llama al filtro inicial
            } 
        } catch (e) { console.error(e); }
    }

    // --- LÓGICA DE BÚSQUEDA ---
    function filtrarPerfiles() {
        const searchTerm = document.getElementById('buscador-perfiles').value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredData = [...perfilesData]; 
        } else {
            filteredData = perfilesData.filter(p => p.strNombrePerfil.toLowerCase().includes(searchTerm));
        }

        currentPage = 1; 
        renderTable();
    }

    async function savePerfil(data, id) {
        const btnSave = document.getElementById('btn-save-perfil');
        const originalContent = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Procesando...</span>';
        btnSave.disabled = true;

        const method = id ? 'PUT' : 'POST'; 
        const url = id ? `/api/v1/perfiles/${id}` : '/api/v1/perfiles';
        
        try { 
            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) }); 
            if (res.ok) { 
                closeModal();
                showToast('¡Éxito!', id ? 'Perfil actualizado correctamente.' : 'Perfil creado exitosamente.', 'success'); 
                document.getElementById('buscador-perfiles').value = ''; // Limpiamos la búsqueda tras guardar
                fetchPerfiles(); 
            } else { 
                showToast("Error", "No se pudo guardar la información del perfil.", "error"); 
            }
        } catch (e) { showToast("Error", "Fallo de conexión al servidor.", "error"); }
        
        btnSave.innerHTML = originalContent;
        btnSave.disabled = false;
    }

    // Lógica modificada: Ahora ejecuta el delete real
    async function executeDeletePerfil() {
        if (!perfilAEliminar) return;

        const btnConfirm = document.getElementById('btn-confirm-delete');
        const originalContent = btnConfirm.innerHTML;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btnConfirm.disabled = true;

        try { 
            const res = await fetch(`/api/v1/perfiles/${perfilAEliminar}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                closeConfirmDeleteModal();
                showToast('Eliminado', 'El perfil ha sido removido del sistema.', 'success'); 
                fetchPerfiles(); 
            } else { 
                closeConfirmDeleteModal();
                showToast('Acción denegada', 'No se puede eliminar un perfil que está en uso.', 'error'); 
            }
        } catch (e) { 
            closeConfirmDeleteModal();
            showToast('Error', 'Fallo de conexión al servidor.', 'error'); 
        }

        btnConfirm.innerHTML = originalContent;
        btnConfirm.disabled = false;
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-perfiles-body'); 
        tbody.innerHTML = '';
        
        const start = (currentPage - 1) * rowsPerPage; 
        const paginated = filteredData.slice(start, start + rowsPerPage);
        
        // --- MANEJO DE ESTADOS VACÍOS ---
        if (filteredData.length === 0) { 
            const searchTerm = document.getElementById('buscador-perfiles').value;
            if (searchTerm) {
                tbody.innerHTML = `
                    <tr><td colspan="3" style="text-align:center; padding: 50px 20px; color: #64748b;">
                        <div style="font-size: 2.5rem; margin-bottom: 15px; color: #94a3b8;"><i class="fas fa-search-minus"></i></div>
                        <h3 style="color: #334155; margin-bottom: 5px;">No encontramos coincidencias</h3>
                        <p style="font-size: 0.95rem;">No hay perfiles con el nombre "<b>${searchTerm}</b>".</p>
                        <button id="btn-limpiar-busqueda-perfil" style="margin-top: 15px; background: transparent; border: 1px solid #cbd5e1; color: #3b82f6; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Limpiar Búsqueda</button>
                    </td></tr>`;
                
                setTimeout(() => {
                    const btnLimpiar = document.getElementById('btn-limpiar-busqueda-perfil');
                    if (btnLimpiar) {
                        btnLimpiar.addEventListener('click', () => {
                            document.getElementById('buscador-perfiles').value = '';
                            filtrarPerfiles();
                        });
                    }
                }, 0);
            } else {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 40px; color: #94a3b8;"><div style="font-size: 2rem; margin-bottom: 10px;"><i class="fas fa-users-slash"></i></div>No hay perfiles registrados en el sistema.</td></tr>`; 
            }
            renderPaginationControls();
            return; 
        }

        // --- RENDERIZADO DE FILAS ---
        paginated.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';

            // Badges visuales modernos
            const jerarquiaBadge = p.bitAdministrador 
                ? `<span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-shield-alt"></i>Super Admin</span>` 
                : `<span style="background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-user"></i>Estándar</span>`;

            tr.innerHTML = `
                <td style="padding: 18px 24px; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: #f8fafc; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #64748b; border: 1px solid #e2e8f0;">
                            <i class="fas fa-id-badge"></i>
                        </div>
                        <strong style="color: #0f172a; font-size: 0.95rem;">${p.strNombrePerfil}</strong>
                    </div>
                </td>
                <td style="padding: 18px 24px; border-bottom: 1px solid #f1f5f9;">${jerarquiaBadge}</td>`;

            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                td.style.padding = '18px 24px';
                td.style.borderBottom = '1px solid #f1f5f9';
                td.style.textAlign = 'right';

                // Botones limpios, solo icono
                if (permisos.bitEditar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-pen"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: #3b82f6; font-size: 1.1rem; padding: 8px; cursor: pointer; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Editar Perfil";
                    b.onclick = () => openModal(true, p); 
                    td.appendChild(b); 
                }
                
                // Evitamos eliminar al Admin Principal
                if (permisos.bitEliminar && p.id !== 1) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: #ef4444; font-size: 1.1rem; padding: 8px; cursor: pointer; margin-left: 10px; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Eliminar Perfil";
                    // Ahora llama al modal de confirmación en lugar del confirm nativo
                    b.onclick = () => openConfirmDeleteModal(p.id); 
                    td.appendChild(b); 
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls'); 
        controls.innerHTML = '';
        const pageCount = Math.ceil(filteredData.length / rowsPerPage);
        
        if(pageCount <= 1) return; 

        const createBtn = (text, pageNum, disabled = false, icon = null) => {
            const btn = document.createElement('button');
            const innerContent = icon ? `<i class="${icon}"></i>` : text;
            btn.innerHTML = innerContent;
            
            if (disabled) {
                btn.style.cssText = `background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; margin: 2px; cursor: not-allowed; opacity: 0.7;`;
                btn.disabled = true;
            } else {
                const isCurrent = pageNum === currentPage && text !== 'Inicio' && text !== 'Fin';
                btn.style.cssText = `background: ${isCurrent ? '#2563eb' : '#ffffff'}; color: ${isCurrent ? '#ffffff' : '#475569'}; border: 1px solid ${isCurrent ? '#2563eb' : '#e2e8f0'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; margin: 2px;`;
                if (!isCurrent) btn.onmouseover = () => btn.style.background = '#f1f5f9';
                if (!isCurrent) btn.onmouseout = () => btn.style.background = '#ffffff';
                btn.onclick = () => { currentPage = pageNum; renderTable(); };
            }
            return btn;
        };

        // Controles de Inicio y Fin
        controls.appendChild(createBtn('Inicio', 1, currentPage === 1, 'fas fa-angle-double-left'));

        for (let i = 1; i <= pageCount; i++) {
            controls.appendChild(createBtn(i, i));
        }

        controls.appendChild(createBtn('Fin', pageCount, currentPage === pageCount, 'fas fa-angle-double-right'));
    }

    function setupEventListeners() {
        const btn = document.getElementById('btn-nuevo-perfil');
        if (btn) btn.addEventListener('click', () => openModal(false));
        
        // Controles del modal
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
        
        // Cerrar al hacer clic afuera del modal
        document.getElementById('modal-perfil').addEventListener('click', (e) => {
            if(e.target.id === 'modal-perfil') closeModal();
        });
        
        document.getElementById('form-perfil').addEventListener('submit', (e) => { 
            e.preventDefault(); 
            savePerfil({ 
                strNombrePerfil: document.getElementById('nombre-perfil').value.trim(), 
                bitAdministrador: document.getElementById('es-admin').value === 'true' 
            }, document.getElementById('perfil-id').value); 
        });

        // Modal de Confirmación de Eliminación
        document.getElementById('btn-cancel-delete').addEventListener('click', closeConfirmDeleteModal);
        document.getElementById('btn-confirm-delete').addEventListener('click', executeDeletePerfil);

        document.getElementById('modal-confirm-delete').addEventListener('click', (e) => {
            if(e.target.id === 'modal-confirm-delete') closeConfirmDeleteModal();
        });

        // Eventos del buscador
        const inputBuscador = document.getElementById('buscador-perfiles');
        if (inputBuscador) {
            inputBuscador.addEventListener('keyup', filtrarPerfiles);
            inputBuscador.addEventListener('search', filtrarPerfiles); 
        }
    }
    
    return { render: renderView };
})();