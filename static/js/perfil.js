// static/js/perfil.js

const PerfilModule = (() => {
    let perfilesData = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // Renderiza la estructura base del módulo dentro del contenedor principal
    function renderView(container) {
        container.innerHTML = `
            <div class="data-card-centered">
                <h1 style="margin-bottom: 25px; color: #1f2937; font-size: 1.8rem;">Gestión de Perfiles</h1>
                
                <div id="alert-message" class="alert hidden"></div>

                <form id="form-perfil" class="vertical-form">
                    <input type="hidden" id="perfil-id" value="">
                    
                    <div class="form-group">
                        <label for="nombre-perfil">Nombre del Perfil</label>
                        <input type="text" id="nombre-perfil" placeholder="Ej. Recursos Humanos" required autocomplete="off">
                    </div>
                    
                    <div class="form-group">
                        <label for="es-admin">Nivel de Acceso</label>
                        <select id="es-admin">
                            <option value="false">Usuario Estándar</option>
                            <option value="true">Administrador</option>
                        </select>
                    </div>

                    <div class="form-actions">
                        <button type="submit" id="btn-save" class="btn-submit">Guardar Perfil</button>
                        <button type="button" id="btn-cancel" class="btn-cancel hidden">Cancelar Edición</button>
                    </div>
                </form>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Perfil</th>
                                <th>Administrador</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-perfiles-body">
                            </tbody>
                    </table>
                    <div id="pagination-controls" class="pagination"></div>
                </div>
            </div>
        `;

        setupEventListeners();
        fetchPerfiles();
    }

    function getToken() {
        return localStorage.getItem('jwt_token');
    }

    function showMessage(msg, isError = false) {
        const alertBox = document.getElementById('alert-message');
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'block';
        alertBox.style.backgroundColor = isError ? '#fee2e2' : '#d1fae5';
        alertBox.style.color = isError ? '#b91c1c' : '#065f46';
        alertBox.style.padding = '15px';
        alertBox.style.borderRadius = '8px';
        alertBox.style.marginBottom = '20px';
        
        setTimeout(() => alertBox.style.display = 'none', 3000);
    }

    // --- Peticiones API (Fetch) ---

    async function fetchPerfiles() {
        try {
            const res = await fetch('/api/v1/perfiles', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Error al obtener datos');
            perfilesData = await res.json() || [];
            currentPage = 1;
            renderTable();
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    async function savePerfil(data, id) {
        const url = id ? `/api/v1/perfiles/${id}` : '/api/v1/perfiles';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al guardar');
            
            showMessage('Perfil guardado exitosamente');
            resetForm();
            fetchPerfiles();
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    async function deletePerfil(id) {
        if (!confirm('¿Estás seguro de eliminar este perfil?')) return;

        try {
            const res = await fetch(`/api/v1/perfiles/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al eliminar');
            
            showMessage('Perfil eliminado');
            fetchPerfiles();
        } catch (error) {
            showMessage(error.message, true);
        }
    }

    // --- Renderizado de DOM y Paginación ---

    function renderTable() {
        const tbody = document.getElementById('tabla-perfiles-body');
        tbody.innerHTML = '';

        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = perfilesData.slice(start, end);

        if (paginatedData.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.textContent = "No hay perfiles registrados.";
            td.style.textAlign = "center";
            tr.appendChild(td);
            tbody.appendChild(tr);
        }

        paginatedData.forEach(perfil => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = perfil.id;
            
            const tdNombre = document.createElement('td');
            tdNombre.textContent = perfil.strNombrePerfil;
            
            const tdAdmin = document.createElement('td');
            tdAdmin.textContent = perfil.bitAdministrador ? 'Sí' : 'No';
            
            const tdAcciones = document.createElement('td');
            
            const btnEdit = document.createElement('button');
            btnEdit.textContent = 'Editar';
            btnEdit.className = 'btn-edit';
            btnEdit.onclick = () => loadFormData(perfil);

            const btnDelete = document.createElement('button');
            btnDelete.textContent = 'Eliminar';
            btnDelete.className = 'btn-delete';
            btnDelete.onclick = () => deletePerfil(perfil.id);

            tdAcciones.appendChild(btnEdit);
            tdAcciones.appendChild(btnDelete);

            tr.appendChild(tdId);
            tr.appendChild(tdNombre);
            tr.appendChild(tdAdmin);
            tr.appendChild(tdAcciones);
            
            tbody.appendChild(tr);
        });

        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls');
        controls.innerHTML = '';
        
        const pageCount = Math.ceil(perfilesData.length / rowsPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => {
                currentPage = i;
                renderTable();
            };
            controls.appendChild(btn);
        }
    }

    // --- Control de Formulario ---

    function loadFormData(perfil) {
        document.getElementById('perfil-id').value = perfil.id;
        document.getElementById('nombre-perfil').value = perfil.strNombrePerfil;
        document.getElementById('es-admin').value = perfil.bitAdministrador.toString();
        
        document.getElementById('btn-save').textContent = 'Actualizar Perfil';
        document.getElementById('btn-cancel').classList.remove('hidden');
    }

    function resetForm() {
        document.getElementById('form-perfil').reset();
        document.getElementById('perfil-id').value = '';
        document.getElementById('btn-save').textContent = 'Guardar Perfil';
        document.getElementById('btn-cancel').classList.add('hidden');
    }

    function setupEventListeners() {
        const form = document.getElementById('form-perfil');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('perfil-id').value;
            const data = {
                strNombrePerfil: document.getElementById('nombre-perfil').value.trim(),
                bitAdministrador: document.getElementById('es-admin').value === 'true'
            };
            savePerfil(data, id);
        });

        document.getElementById('btn-cancel').addEventListener('click', resetForm);
    }

    return { render: renderView };
})();