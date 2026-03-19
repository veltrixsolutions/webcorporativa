const ModuloApp = (() => {
    let modulosData = [];
    let filteredData = []; 
    let currentPage = 1;
    const rowsPerPage = 5;
    let permisos = { bitAgregar: false, bitEditar: false, bitConsulta: false, bitEliminar: false, bitDetalle: false };
    
    // Variable para guardar el ID a eliminar temporalmente
    let moduloAEliminar = null;

    async function renderView(container, moduleId, perfilId) {
        await cargarPermisosSeguridad(moduleId, perfilId);

        if (!permisos.bitConsulta) {
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%; padding: 20px;">
                    <div style="max-width: 500px; padding: 50px 40px; text-align: center; background: var(--bg-card); border-radius: 20px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); width: 100%;">
                        <div style="width: 80px; height: 80px; background: var(--danger-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-lock" style="font-size: 2.5rem; color: var(--danger-text);"></i>
                        </div>
                        <h1 style="color: var(--text-primary); font-size: 1.8rem; margin-bottom: 10px; font-weight: 700;">Acceso Restringido</h1>
                        <p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.5;">No tienes los privilegios necesarios para visualizar o modificar la configuración de los módulos del sistema.</p>
                    </div>
                </div>`;
            return;
        }

        const btnNuevoHTML = permisos.bitAgregar 
            ? `<button id="btn-nuevo-mod" class="btn-primary" style="background-color: var(--brand-primary); color: var(--text-inverse); border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                <i class="fas fa-plus"></i> Nuevo Módulo
               </button>` 
            : '';

        container.innerHTML = `
            <style>
                .ux-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: center; align-items: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; padding: 15px; }
                .ux-modal-overlay.active { opacity: 1; visibility: visible; }
                .ux-modal-card { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 480px; transform: translateY(30px) scale(0.95); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: var(--shadow-md); border: 1px solid var(--border-color); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
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

                .ux-toast { position: fixed; bottom: 30px; right: 30px; background: var(--bg-card); border-radius: 10px; padding: 16px 24px; box-shadow: var(--shadow-md); display: flex; align-items: center; gap: 12px; z-index: 1100; transform: translateX(150%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-left: 4px solid var(--brand-primary); border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); max-width: calc(100vw - 30px); }
                .ux-toast.show { transform: translateX(0); }
                .ux-toast.success { border-left-color: #10b981; }
                .ux-toast.error { border-left-color: var(--danger-text); }
                
                .ux-table-row { transition: background-color 0.2s ease, transform 0.2s ease; border-bottom: 1px solid var(--border-color); }
                .ux-table-row:hover { background-color: var(--bg-hover); transform: scale(1.002); }
                
                .ux-input { width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; color: var(--text-primary); transition: all 0.2s; background: var(--input-bg); }
                .ux-input:focus { outline: none; border-color: var(--border-focus); background: var(--bg-card); box-shadow: var(--shadow-focus); }
                
                .search-container { position: relative; width: 100%; max-width: 500px; margin-bottom: 25px; }
                .search-container i { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1.1rem; }
                .search-input { width: 100%; padding: 14px 16px 14px 45px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 0.95rem; background: var(--bg-card); color: var(--text-primary); transition: all 0.2s; box-shadow: var(--shadow-sm); }
                .search-input:focus { outline: none; border-color: var(--border-focus); box-shadow: var(--shadow-focus); }

                /* --- ADAPTACIONES RESPONSIVAS --- */
                @media screen and (max-width: 768px) {
                    .ux-header-wrapper { flex-direction: column !important; align-items: stretch !important; gap: 20px !important; }
                    .ux-header-wrapper > div { width: 100%; }
                    #btn-nuevo-mod { width: 100%; }
                    .search-container { max-width: 100%; }
                    .ux-toast { right: 15px; bottom: 15px; left: 15px; }
                    .ux-modal-card { margin: auto; }
                    .ux-confirm-actions { flex-direction: column; }
                    .ux-confirm-btn { width: 100%; }
                    th, td { padding: 12px 16px !important; }
                }
            </style>

            <div style="max-width: 1100px; margin: 0 auto; padding: 20px;">
                <div class="ux-header-wrapper" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; gap: 15px;">
                    <div>
                        <h1 style="color: var(--text-primary); font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px;">
                            <i class="fas fa-cubes" style="color: var(--text-secondary); margin-right: 10px;"></i>Módulos
                        </h1>
                        <p style="color: var(--text-secondary); font-size: 1rem; margin: 0;">Administra los componentes estructurales del sistema.</p>
                    </div>
                    <div>${btnNuevoHTML}</div>
                </div>

                <div class="search-container">
                    <i class="fas fa-search"></i>
                    <input type="text" id="buscador-modulos" class="search-input" placeholder="Buscar módulos por nombre..." autocomplete="off">
                </div>

                <div style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 500px;">
                            <thead style="background: var(--table-header-bg); border-bottom: 1px solid var(--border-color);">
                                <tr>
                                    <th style="padding: 16px 24px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Estructura del Módulo</th>
                                    ${permisos.bitEditar || permisos.bitEliminar ? '<th style="padding: 16px 24px; text-align: right; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="tabla-modulos-body"></tbody>
                        </table>
                    </div>
                    <div id="pagination-controls-mod" style="padding: 15px 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: center; align-items: center; gap: 8px; background: var(--bg-card); flex-wrap: wrap;"></div>
                </div>
            </div>

            <div id="modal-modulo" class="ux-modal-overlay">
                <div class="ux-modal-card">
                    <form id="form-modulo" style="display: flex; flex-direction: column; height: 100%;">
                        <div style="padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); flex-shrink: 0;">
                            <h2 id="form-titulo" style="margin: 0; font-size: 1.25rem; color: var(--text-primary); font-weight: 700; display: flex; align-items: center; gap: 10px;">
                                <div style="background: var(--bg-active); color: var(--brand-primary); width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-layer-group"></i></div>
                                <span>Nuevo Módulo</span>
                            </h2>
                            <button type="button" id="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 1.2rem; cursor: pointer; transition: color 0.2s;"><i class="fas fa-times"></i></button>
                        </div>
                        
                        <div style="padding: 24px; overflow-y: auto; flex-grow: 1;">
                            <input type="hidden" id="modulo-id" value="">
                            <div>
                                <label style="display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 600;">Nombre del Módulo <span style="color: var(--danger-text);">*</span></label>
                                <input type="text" id="nombre-modulo" class="ux-input" required autocomplete="off" placeholder="Ej. Panel de Control, Reportes...">
                            </div>
                        </div>

                        <div style="padding: 16px 24px; background: var(--bg-card); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 12px; flex-wrap: wrap; flex-shrink: 0;">
                            <button type="button" id="btn-cancel-modal" style="background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; flex: 1; min-width: 120px;">Cancelar</button>
                            <button type="submit" id="btn-save-mod" style="background: #10b981; border: none; color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16,185,129,0.2); flex: 1; min-width: 120px;">
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
                    <h3 class="ux-confirm-title">¿Eliminar Módulo?</h3>
                    <p class="ux-confirm-text">Esta acción es irreversible. ¿Estás seguro de que deseas eliminar permanentemente este módulo del sistema?</p>
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

        setupEventListeners();
        fetchModulos();
    }

    function getToken() { return sessionStorage.getItem('jwt_token'); }

    async function cargarPermisosSeguridad(moduleId, perfilId) {
        if (perfilId === 1) {
            permisos = { bitAgregar: true, bitEditar: true, bitConsulta: true, bitEliminar: true, bitDetalle: true };
            return;
        }
        try {
            const res = await fetch(`/api/v1/mis-permisos/${moduleId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) permisos = await res.json();
        } catch (e) { console.error("Error de permisos"); }
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

    // Modal Formulario
    function openModal(isEdit = false, m = null) {
        document.getElementById('form-modulo').reset();
        document.getElementById('modulo-id').value = '';
        
        if (isEdit && m) {
            document.getElementById('form-titulo').innerHTML = `<div style="background: var(--bg-hover); color: var(--text-accent); width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-edit"></i></div><span>Editar Módulo</span>`;
            document.getElementById('modulo-id').value = m.id;
            document.getElementById('nombre-modulo').value = m.strNombreModulo;
        } else {
            document.getElementById('form-titulo').innerHTML = `<div style="background: rgba(16, 185, 129, 0.1); color: #10b981; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center;"><i class="fas fa-plus"></i></div><span>Crear Módulo</span>`;
        }
        
        document.getElementById('modal-modulo').classList.add('active');
        setTimeout(() => document.getElementById('nombre-modulo').focus(), 100);
    }

    function closeModal() {
        document.getElementById('modal-modulo').classList.remove('active');
    }

    // Modal Confirmación Eliminación
    function openConfirmDeleteModal(id) {
        moduloAEliminar = id; // Guardamos el ID temporalmente
        document.getElementById('modal-confirm-delete').classList.add('active');
    }

    function closeConfirmDeleteModal() {
        moduloAEliminar = null; // Limpiamos el ID
        document.getElementById('modal-confirm-delete').classList.remove('active');
    }

    async function fetchModulos() {
        try {
            const res = await fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) { 
                modulosData = await res.json() || []; 
                filtrarModulos(); 
            }
        } catch (error) { console.error(error); }
    }

    function filtrarModulos() {
        const searchTerm = document.getElementById('buscador-modulos').value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredData = [...modulosData]; 
        } else {
            filteredData = modulosData.filter(m => m.strNombreModulo.toLowerCase().includes(searchTerm));
        }

        currentPage = 1; 
        renderTable();
    }

    async function saveModulo(data, id) {
        const btnSave = document.getElementById('btn-save-mod');
        const originalContent = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Procesando...</span>';
        btnSave.disabled = true;

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/v1/modulos/${id}` : '/api/v1/modulos';
        
        try {
            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) });
            if (res.ok) { 
                closeModal();
                showToast('¡Éxito!', id ? 'Módulo actualizado correctamente.' : 'Módulo creado exitosamente.', 'success'); 
                document.getElementById('buscador-modulos').value = '';
                fetchModulos(); 
            } else {
                showToast('Error', 'No se pudo guardar la información.', 'error');
            }
        } catch (error) { showToast('Error', 'Fallo de conexión al servidor.', 'error'); }
        
        btnSave.innerHTML = originalContent;
        btnSave.disabled = false;
    }

    async function executeDeleteModulo() {
        if (!moduloAEliminar) return;

        const btnConfirm = document.getElementById('btn-confirm-delete');
        const originalContent = btnConfirm.innerHTML;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btnConfirm.disabled = true;

        try {
            const res = await fetch(`/api/v1/modulos/${moduloAEliminar}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) { 
                closeConfirmDeleteModal();
                showToast('Eliminado', 'El módulo ha sido borrado.', 'success'); 
                fetchModulos(); 
            } else {
                closeConfirmDeleteModal();
                showToast('Acción denegada', 'El módulo está en uso o protegido.', 'error');
            }
        } catch (error) { 
            closeConfirmDeleteModal();
            showToast('Error', 'Fallo de conexión al servidor.', 'error'); 
        }

        btnConfirm.innerHTML = originalContent;
        btnConfirm.disabled = false;
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-modulos-body');
        tbody.innerHTML = '';
        
        const start = (currentPage - 1) * rowsPerPage;
        const paginated = filteredData.slice(start, start + rowsPerPage);

        if (filteredData.length === 0) {
            const searchTerm = document.getElementById('buscador-modulos').value;
            if (searchTerm) {
                tbody.innerHTML = `
                    <tr><td colspan="2" style="text-align:center; padding: 50px 20px; color: var(--text-secondary);">
                        <div style="font-size: 2.5rem; margin-bottom: 15px; color: var(--text-secondary);"><i class="fas fa-search-minus"></i></div>
                        <h3 style="color: var(--text-primary); margin-bottom: 5px;">No encontramos lo que buscas</h3>
                        <p style="font-size: 0.95rem;">No hay módulos que coincidan con "<b>${searchTerm}</b>".</p>
                        <button id="btn-limpiar-busqueda" style="margin-top: 15px; background: transparent; border: 1px solid var(--border-color); color: var(--brand-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Limpiar Búsqueda</button>
                    </td></tr>`;
                
                setTimeout(() => {
                    const btnLimpiar = document.getElementById('btn-limpiar-busqueda');
                    if (btnLimpiar) {
                        btnLimpiar.addEventListener('click', () => {
                            document.getElementById('buscador-modulos').value = '';
                            filtrarModulos();
                        });
                    }
                }, 0);

            } else {
                tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 40px; color: var(--text-secondary);"><div style="font-size: 2rem; margin-bottom: 10px;"><i class="fas fa-folder-open"></i></div>No hay módulos registrados en el sistema. Crea el primero.</td></tr>'; 
            }
            renderPaginationControls();
            return;
        }
        
        paginated.forEach(m => {
            const tr = document.createElement('tr');
            tr.className = 'ux-table-row';

            tr.innerHTML = `
                <td style="padding: 18px 24px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: var(--bg-hover); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); border: 1px solid var(--border-color);">
                            <i class="fas fa-box"></i>
                        </div>
                        <span style="color: var(--text-primary); font-weight: 600; font-size: 0.95rem;">${m.strNombreModulo}</span>
                    </div>
                </td>`;
            
            if (permisos.bitEditar || permisos.bitEliminar) {
                const accTd = document.createElement('td');
                accTd.style.padding = '18px 24px';
                accTd.style.textAlign = 'right';

                if (permisos.bitEditar) {
                    const btn = document.createElement('button'); 
                    btn.innerHTML = '<i class="fas fa-pen"></i>'; 
                    btn.style.cssText = 'background: transparent; border: none; color: var(--brand-primary); font-size: 1.1rem; padding: 8px; cursor: pointer; transition: transform 0.2s;';
                    btn.onmouseover = () => btn.style.transform = 'scale(1.2)';
                    btn.onmouseout = () => btn.style.transform = 'scale(1)';
                    btn.title = 'Editar Módulo';
                    btn.onclick = () => openModal(true, m); 
                    accTd.appendChild(btn);
                }
                if (permisos.bitEliminar) {
                    const btn = document.createElement('button'); 
                    btn.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
                    btn.style.cssText = 'background: transparent; border: none; color: var(--danger-text); font-size: 1.1rem; padding: 8px; cursor: pointer; margin-left: 10px; transition: transform 0.2s;';
                    btn.onmouseover = () => btn.style.transform = 'scale(1.2)';
                    btn.onmouseout = () => btn.style.transform = 'scale(1)';
                    btn.title = 'Eliminar Módulo';
                    btn.onclick = () => openConfirmDeleteModal(m.id); 
                    accTd.appendChild(btn);
                }
                tr.appendChild(accTd);
            }
            tbody.appendChild(tr);
        });
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-mod'); 
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
        const btnNuevo = document.getElementById('btn-nuevo-mod');
        if (btnNuevo) btnNuevo.addEventListener('click', () => openModal(false));
        
        // Modal de Formulario
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
        
        document.getElementById('modal-modulo').addEventListener('click', (e) => {
            if(e.target.id === 'modal-modulo') closeModal();
        });
        
        document.getElementById('form-modulo').addEventListener('submit', (e) => { 
            e.preventDefault(); 
            saveModulo({ strNombreModulo: document.getElementById('nombre-modulo').value.trim() }, document.getElementById('modulo-id').value); 
        });

        // Modal de Confirmación de Eliminación
        document.getElementById('btn-cancel-delete').addEventListener('click', closeConfirmDeleteModal);
        document.getElementById('btn-confirm-delete').addEventListener('click', executeDeleteModulo);

        document.getElementById('modal-confirm-delete').addEventListener('click', (e) => {
            if(e.target.id === 'modal-confirm-delete') closeConfirmDeleteModal();
        });

        // Buscador
        const inputBuscador = document.getElementById('buscador-modulos');
        if (inputBuscador) {
            inputBuscador.addEventListener('keyup', filtrarModulos);
            inputBuscador.addEventListener('search', filtrarModulos); 
        }
    }
    
    return { render: renderView };
})();