// static/js/modulo.js

const ModuloApp = (() => {
    let modulosData = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    function renderView(container) {
        container.innerHTML = `
            <div class="data-card-centered" style="max-width: 600px;">
                <h1 style="margin-bottom: 25px; color: #1f2937; font-size: 1.8rem;">Gestión de Módulos</h1>
                
                <div id="alert-modulo" class="alert hidden"></div>

                <form id="form-modulo" class="vertical-form">
                    <input type="hidden" id="modulo-id" value="">
                    
                    <div class="form-group">
                        <label for="nombre-modulo">Nombre del Módulo</label>
                        <input type="text" id="nombre-modulo" placeholder="Ej. Principal 1.1" required autocomplete="off">
                    </div>

                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="submit" id="btn-save-mod" class="btn-submit">Guardar Módulo</button>
                        <button type="button" id="btn-cancel-mod" class="btn-cancel hidden">Cancelar</button>
                    </div>
                </form>

                <div class="table-container" style="margin-top: 30px;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Módulo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-modulos-body"></tbody>
                    </table>
                    <div id="pagination-controls-mod" class="pagination"></div>
                </div>
            </div>
        `;

        setupEventListeners();
        fetchModulos();
    }

    function getToken() { return localStorage.getItem('jwt_token'); }

    function showMessage(msg, isError = false) {
        const alertBox = document.getElementById('alert-modulo');
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'error' : 'success'}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3000);
    }

    async function fetchModulos() {
        try {
            const res = await fetch('/api/v1/modulos', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Error al obtener datos');
            modulosData = await res.json() || [];
            currentPage = 1;
            renderTable();
        } catch (error) { showMessage(error.message, true); }
    }

    async function saveModulo(data, id) {
        const url = id ? `/api/v1/modulos/${id}` : '/api/v1/modulos';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al guardar');
            
            showMessage('Módulo guardado exitosamente');
            resetForm();
            fetchModulos();
        } catch (error) { showMessage(error.message, true); }
    }

    async function deleteModulo(id) {
        if (!confirm('¿Estás seguro de eliminar este módulo?')) return;
        try {
            const res = await fetch(`/api/v1/modulos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al eliminar');
            showMessage('Módulo eliminado');
            fetchModulos();
        } catch (error) { showMessage(error.message, true); }
    }

    function renderTable() {
        const tbody = document.getElementById('tabla-modulos-body');
        tbody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginated = modulosData.slice(start, end);

        if (paginated.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay módulos registrados.</td></tr>';
            return;
        }

        paginated.forEach(m => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${m.id}</td>
                <td><strong>${m.strNombreModulo}</strong></td>
            `;
            
            const accTd = document.createElement('td');
            const btnEdit = document.createElement('button');
            btnEdit.textContent = 'Editar'; btnEdit.className = 'btn-edit';
            btnEdit.onclick = () => loadFormData(m);

            const btnDelete = document.createElement('button');
            btnDelete.textContent = 'Eliminar'; btnDelete.className = 'btn-delete';
            btnDelete.onclick = () => deleteModulo(m.id);

            accTd.append(btnEdit, btnDelete);
            tr.appendChild(accTd);
            tbody.appendChild(tr);
        });

        renderPaginationControls();
    }

    function renderPaginationControls() {
        const controls = document.getElementById('pagination-controls-mod');
        controls.innerHTML = '';
        const pageCount = Math.ceil(modulosData.length / rowsPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i; btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => { currentPage = i; renderTable(); };
            controls.appendChild(btn);
        }
    }

    function loadFormData(m) {
        document.getElementById('modulo-id').value = m.id;
        document.getElementById('nombre-modulo').value = m.strNombreModulo;
        document.getElementById('btn-save-mod').textContent = 'Actualizar Módulo';
        document.getElementById('btn-cancel-mod').classList.remove('hidden');
    }

    function resetForm() {
        document.getElementById('form-modulo').reset();
        document.getElementById('modulo-id').value = '';
        document.getElementById('btn-save-mod').textContent = 'Guardar Módulo';
        document.getElementById('btn-cancel-mod').classList.add('hidden');
    }

    function setupEventListeners() {
        document.getElementById('form-modulo').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = { strNombreModulo: document.getElementById('nombre-modulo').value.trim() };
            saveModulo(data, document.getElementById('modulo-id').value);
        });
        document.getElementById('btn-cancel-mod').addEventListener('click', resetForm);
    }

    return { render: renderView };
})();