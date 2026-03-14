// static/js/permiso.js
const PermisoModule = (() => {
    let permisosData = [], filteredData = [], perfilesDisponibles = [], modulosDisponibles = [], currentPage = 1;
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
                        <p style="color: #64748b; font-size: 1rem; line-height: 1.5;">No tienes los privilegios necesarios para visualizar o modificar la matriz de permisos.</p>
                    </div>
                </div>`;
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-perm" class="btn-primary" style="background-color: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                <i class="fas fa-key"></i> Asignar Permisos
               </button>` 
            : '';

        // Estilos UX inyectados (Incluye el nuevo buscador)
        container.innerHTML = `
            <style>
                .ux-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; align-items: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; }
                .ux-modal-overlay.active { opacity: 1; visibility: visible; }
                .ux-modal-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 600px; transform: translateY(30px) scale(0.95); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden; }
                .ux-modal-overlay.active .ux-modal-card { transform: translateY(0) scale(1); }
                
                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: #ffffff; border-radius: 10px; padding: 16px 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 4px solid #3b82f6; }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: #ef4444; }
                
                .ux-table-row { transition: background-color 0.2s ease, transform 0.2s ease; }
                .ux-table-row:hover { background-color: #f8fafc; transform: scale(1.002); }
                
                .ux-input { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; color: #0f172a; transition: all 0.2s; background: #ffffff; }
                .ux-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
                .ux-input:disabled { background: #f1f5f9; cursor: not-allowed; opacity: 0.8; color: #64748b; border-color: #e2e8f0; }

                /* Estilos del Buscador Inteligente */
                .search-container { position: relative; width: 100%; max-width: 400px; margin-bottom: 20px; }
                .search-input { width: 100%; padding: 12px 16px 12px 42px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; color: #0f172a; transition: all 0.2s; background: #f8fafc; }
                .search-input:focus { background: #ffffff; outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.15); }
                .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 1rem; }

                /* Checkboxes convertidos en Tarjetas Interactivas */
                .perm-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s; background: #ffffff; }
                .perm-card:hover { border-color: #94a3b8; background: #f8fafc; }
                .perm-card:has(input:checked) { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 2px 4px rgba(59,130,246,0.1); }
                .perm-card input[type="checkbox"] { width: 18px; height: 18px; accent-color: #2563eb; cursor: pointer; }
                .perm-desc { display: flex; flex-direction: column; }
                .perm-title { font-weight: 600; color: #0f172a; font-size: 0.95rem; margin-bottom: 2px; }
                .perm-subtitle { font-size: 0.8rem; color: #64748b; }
            </style>

            <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
                    <div>
                        <h1 style="color: #0f172a; font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px;">Matriz de Permisos</h1>
                        <p style="color: #64748b; font-size: 1rem; margin: 0;">Control maestro de acceso por perfil y módulo.</p>
                    </div>
                    <div>${btnNuevoHTML}</div>
                </div>

                <div class="search-container">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" id="buscador-permisos" class="search-input" placeholder="Buscar por perfil o módulo..." autocomplete="off">
                </div>

                <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 16px 24px; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Perfil</th>
                                    <th style="padding: 16px 24px; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Módulo</th>
                                    <th style="padding: 16px 10px; text-align: center; color: #475569; font-size: 0.8rem;" title="Agregar"><i class="fas fa-plus-circle"></i> AGR</th>
                                    <th style="padding: 16px 10px; text-align: center; color: #475569; font-size: 0.8rem;" title="Editar"><i class="fas fa-edit"></i> EDI</th>
                                    <th style="padding: 16px 10px; text-align: center; color: #475569; font-size: 0.8rem;" title="Consultar"><i class="fas fa-eye"></i> CON</th>
                                    <th style="padding: 16px 10px; text-align: center; color: #475569; font-size: 0.8rem;" title="Eliminar"><i class="fas fa-trash-alt"></i> ELI</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 16px 24px; text-align: right; color: #475569; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-permisos-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls-perm" style="padding: 15px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 8px; background: #fdfdfd;"></div>
                </div>
            </div>

            <div id="modal-permiso" class="ux-modal-overlay">
                <div class="ux-modal-card">
                    <form id="form-permiso">
                        <div style="padding: 24px 30px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd;">
                            <h2 id="form-titulo" style="margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                                <div style="background: #eff6ff; color: #3b82f6; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-key"></i></div>
                                <span>Asignar Permisos</span>
                            </h2>
                            <button type="button" id="btn-close-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                        </div>
                        
                        <div style="padding: 30px; max-height: 70vh; overflow-y: auto;">
                            <input type="hidden" id="permiso-id" value="">
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Perfil de Usuario</label>
                                    <select id="sel-perfil" class="ux-input" required></select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">Módulo del Sistema</label>
                                    <select id="sel-modulo" class="ux-input" required></select>
                                </div>
                            </div>

                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                                <h3 style="margin: 0 0 15px 0; font-size: 1rem; color: #0f172a;">Privilegios a conceder</h3>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <label class="perm-card">
                                        <input type="checkbox" id="chk-consulta">
                                        <div class="perm-desc">
                                            <span class="perm-title"><i class="fas fa-eye" style="color: #6366f1; margin-right: 5px;"></i>Consultar</span>
                                            <span class="perm-subtitle">Ver registros (Sólo lectura)</span>
                                        </div>
                                    </label>
                                    
                                    <label class="perm-card">
                                        <input type="checkbox" id="chk-agregar">
                                        <div class="perm-desc">
                                            <span class="perm-title"><i class="fas fa-plus-circle" style="color: #10b981; margin-right: 5px;"></i>Agregar</span>
                                            <span class="perm-subtitle">Crear nueva información</span>
                                        </div>
                                    </label>
                                    
                                    <label class="perm-card">
                                        <input type="checkbox" id="chk-editar">
                                        <div class="perm-desc">
                                            <span class="perm-title"><i class="fas fa-edit" style="color: #f59e0b; margin-right: 5px;"></i>Editar</span>
                                            <span class="perm-subtitle">Modificar datos existentes</span>
                                        </div>
                                    </label>
                                    
                                    <label class="perm-card">
                                        <input type="checkbox" id="chk-eliminar">
                                        <div class="perm-desc">
                                            <span class="perm-title"><i class="fas fa-trash-alt" style="color: #ef4444; margin-right: 5px;"></i>Eliminar</span>
                                            <span class="perm-subtitle">Borrar de la base de datos</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div style="padding: 20px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                            <button type="button" id="btn-cancel-modal" style="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancelar</button>
                            <button type="submit" id="btn-save-perm" style="background: #10b981; border: none; color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">
                                <i class="fas fa-check"></i> <span>Guardar Privilegios</span>
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

        setupEventListeners(); cargarCatalogos(); fetchPermisos();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) { permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true }; return; }
        try { const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }); if (res.ok) permisos = await res.json(); } catch (e) { console.error("Error", e); }
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

    function openModal(isEdit = false, p = null) {
        document.getElementById('form-permiso').reset();
        document.getElementById('permiso-id').value = '';
        
        const selPerfil = document.getElementById('sel-perfil');
        const selModulo = document.getElementById('sel-modulo');
        
        selPerfil.disabled = false;
        selModulo.disabled = false;
        
        if (isEdit && p) {
            document.getElementById('form-titulo').innerHTML = `<div style="background: #fdf4ff; color: #d946ef; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-edit"></i></div><span>Editar Privilegios</span>`;
            document.getElementById('permiso-id').value = p.id;
            
            selPerfil.value = p.idPerfil;
            selModulo.value = p.idModulo;
            
            selPerfil.disabled = true;
            selModulo.disabled = true;
            
            document.getElementById('chk-agregar').checked = p.bitAgregar;
            document.getElementById('chk-editar').checked = p.bitEditar;
            document.getElementById('chk-consulta').checked = p.bitConsulta;
            document.getElementById('chk-eliminar').checked = p.bitEliminar;
        } else {
            document.getElementById('form-titulo').innerHTML = `<div style="background: #ecfdf5; color: #10b981; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-key"></i></div><span>Asignar Permisos</span>`;
        }
        
        document.getElementById('modal-permiso').classList.add('active');
    }

    function closeModal() {
        document.getElementById('modal-permiso').classList.remove('active');
    }

    async function cargarCatalogos() {
        try {
            const [rp, rm] = await Promise.all([ fetch('/api/v1/perfiles', { headers: { 'Authorization': `Bearer ${getToken()}` } }), fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } }) ]);
            if (rp.ok) { 
                perfilesDisponibles = await rp.json() || []; 
                const s = document.getElementById('sel-perfil'); 
                s.innerHTML = '<option value="">Seleccione un perfil...</option>'; 
                perfilesDisponibles.forEach(p => s.innerHTML += `<option value="${p.id}">${p.strNombrePerfil}</option>`); 
            }
            if (rm.ok) { 
                modulosDisponibles = await rm.json() || []; 
                const s = document.getElementById('sel-modulo'); 
                s.innerHTML = '<option value="">Seleccione un módulo...</option>'; 
                modulosDisponibles.forEach(m => s.innerHTML += `<option value="${m.id}">${m.strNombreModulo}</option>`); 
            }
        } catch (e) { console.error("Error", e); }
    }

    async function fetchPermisos() {
        try { 
            const res = await fetch('/api/v1/permisos', { headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                permisosData = await res.json() || []; 
                filteredData = [...permisosData]; // Inicializamos los datos filtrados con todos los datos
                currentPage = 1; 
                renderTable(); 
            } 
        } catch (e) { console.error("Error", e); }
    }

    async function savePermiso(data, id) {
        const btnSave = document.getElementById('btn-save-perm');
        const originalContent = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Guardando...</span>';
        btnSave.disabled = true;

        const url = id ? `/api/v1/permisos/${id}` : '/api/v1/permisos';
        try { 
            const res = await fetch(url, { method: id?'PUT':'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) }); 
            if (res.ok) { 
                closeModal();
                showToast('¡Guardado!', 'Configuración de permisos actualizada.', 'success'); 
                fetchPermisos(); 
                document.getElementById('buscador-permisos').value = ''; // Limpiar buscador tras guardar
            } else {
                showToast('Error', 'No se pudo guardar la configuración (Posible duplicado).', 'error');
            }
        } catch (e) { showToast("Error", "Fallo de conexión al servidor.", "error"); }
        
        btnSave.innerHTML = originalContent;
        btnSave.disabled = false;
    }

    async function deletePermiso(id) {
        if (!confirm('¿Estás seguro de que deseas revocar estos privilegios de forma permanente?')) return;
        try { 
            const res = await fetch(`/api/v1/permisos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }); 
            if (res.ok) { 
                showToast('Eliminado', 'Permisos revocados con éxito.', 'success'); 
                fetchPermisos(); 
                document.getElementById('buscador-permisos').value = ''; // Limpiar buscador tras borrar
            } else {
                showToast('Error', 'No se pudo revocar el permiso.', 'error');
            }
        } catch (e) { showToast("Error", "Fallo de conexión al servidor.", "error"); }
    }

    function getI(s) { 
        return s 
            ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 1.2rem;"></i>' 
            : '<i class="fas fa-minus" style="color: #cbd5e1; font-size: 1rem;"></i>'; 
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-permisos-body'); tbody.innerHTML = '';
        
        // La paginación ahora funciona sobre "filteredData" en lugar de "permisosData"
        const start = (currentPage - 1) * rowsPerPage; 
        const paginated = filteredData.slice(start, start + rowsPerPage);
        
        if (filteredData.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;"><div style="font-size: 2.5rem; margin-bottom: 15px; color: #cbd5e1;"><i class="fas fa-search"></i></div><span style="font-size: 1.1rem; font-weight: 500;">No se encontraron resultados</span><p style="margin-top: 5px; font-size: 0.9rem;">Prueba buscando con otro nombre de perfil o módulo.</p></td></tr>`; 
            document.getElementById('pagination-controls-perm').innerHTML = ''; // Ocultar controles de paginación
            return; 
        }
        
        paginated.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';

            tr.innerHTML = `
                <td style="padding: 18px 24px; border-bottom: 1px solid #f1f5f9;"><strong style="color: #0f172a; font-size: 0.95rem;"><i class="fas fa-id-badge" style="color: #94a3b8; margin-right: 8px;"></i>${p.perfilNombre}</strong></td>
                <td style="padding: 18px 24px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: 500;"><i class="fas fa-layer-group" style="color: #94a3b8; margin-right: 8px;"></i>${p.moduloNombre}</td>
                <td style="padding: 18px 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">${getI(p.bitAgregar)}</td>
                <td style="padding: 18px 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">${getI(p.bitEditar)}</td>
                <td style="padding: 18px 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">${getI(p.bitConsulta)}</td>
                <td style="padding: 18px 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">${getI(p.bitEliminar)}</td>`;
            
            if (permisos.bitEditar || permisos.bitEliminar) {
                const td = document.createElement('td');
                td.style.padding = '18px 24px';
                td.style.borderBottom = '1px solid #f1f5f9';
                td.style.textAlign = 'right';

                if (permisos.bitEditar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-pen"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: #3b82f6; font-size: 1.1rem; padding: 8px; cursor: pointer; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Editar Privilegios";
                    b.onclick = () => openModal(true, p); 
                    td.appendChild(b); 
                }
                if (permisos.bitEliminar) { 
                    const b = document.createElement('button'); 
                    b.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    b.style.cssText = 'background: transparent; border: none; color: #ef4444; font-size: 1.1rem; padding: 8px; cursor: pointer; margin-left: 10px; transition: transform 0.2s;';
                    b.onmouseover = () => b.style.transform = 'scale(1.2)';
                    b.onmouseout = () => b.style.transform = 'scale(1)';
                    b.title = "Revocar Permisos";
                    b.onclick = () => deletePermiso(p.id); 
                    td.appendChild(b); 
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-perm'); controls.innerHTML = '';
        const pageCount = Math.ceil(filteredData.length / rowsPerPage);
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
        const btn = document.getElementById('btn-nuevo-perm');
        if (btn) btn.addEventListener('click', () => openModal(false));
        
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
        
        document.getElementById('modal-permiso').addEventListener('click', (e) => {
            if(e.target.id === 'modal-permiso') closeModal();
        });
        
        document.getElementById('form-permiso').addEventListener('submit', (e) => {
            e.preventDefault();
            savePermiso({ 
                idPerfil: parseInt(document.getElementById('sel-perfil').value), 
                idModulo: parseInt(document.getElementById('sel-modulo').value), 
                bitAgregar: document.getElementById('chk-agregar').checked, 
                bitEditar: document.getElementById('chk-editar').checked, 
                bitConsulta: document.getElementById('chk-consulta').checked, 
                bitEliminar: document.getElementById('chk-eliminar').checked, 
                bitDetalle: false 
            }, document.getElementById('permiso-id').value);
        });

        // EVENTO DEL BUSCADOR INTELIGENTE
        const buscador = document.getElementById('buscador-permisos');
        if (buscador) {
            buscador.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                
                // Si borran el texto, regresamos todo a la normalidad
                if (query === '') {
                    filteredData = [...permisosData];
                } else {
                    // Filtramos buscando coincidencias en Perfil o en Módulo
                    filteredData = permisosData.filter(p => 
                        p.perfilNombre.toLowerCase().includes(query) || 
                        p.moduloNombre.toLowerCase().includes(query)
                    );
                }
                
                currentPage = 1; // Siempre regresamos a la página 1 al buscar
                renderTable();
            });
        }
    }
    
    return { render: renderView };
})();