document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Decodificar JWT simple (Payload en Base64)
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

    // Establecer datos del usuario en la UI
    document.getElementById('user-name').textContent = userData.nombre || 'Usuario';
    
    // Si la ruta de imagen viene de BD dinámicamente, la usamos; si no, dejamos un avatar genérico basado en su nombre
    const avatarImg = document.getElementById('user-avatar');
    if (userData.ruta_imagen && userData.ruta_imagen.trim() !== "") {
        avatarImg.src = userData.ruta_imagen;
    } else {
        avatarImg.src = `https://ui-avatars.com/api/?name=${userData.nombre}&background=2563eb&color=fff`;
    }

    // Cargar Menú Dinámico
    async function loadMenu() {
        try {
            const response = await fetch('/api/v1/menu', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
                return;
            }

            const menus = await response.json();
            renderMenu(menus);
        } catch (error) {
            console.error('Error cargando el menú:', error);
        }
    }

    function renderMenu(menus) {
        const menuContainer = document.getElementById('dynamic-menu');
        menuContainer.innerHTML = '';

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
                    // Remover clase activa de todos
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

    function updateBreadcrumbs(menuName, moduleName) {
        const breadcrumbs = document.getElementById('breadcrumbs');
        breadcrumbs.innerHTML = `
            <span class="crumb">Inicio</span>
            <span class="separator">/</span>
            <span>${menuName}</span>
            <span class="separator">/</span>
            <span class="crumb">${moduleName}</span>
        `;
    }

    function loadModuleContent(moduleId, moduleName) {
        const container = document.getElementById('module-content');
        // Aquí conectaremos posteriormente la carga de las vistas estáticas (CRUDs)
        container.innerHTML = `
            <div class="data-card-centered">
                <h2>Cargando módulo: ${moduleName}...</h2>
            </div>
        `;
        
        // Simulación de fetch a la vista del módulo correspondiente
        setTimeout(() => {
            container.innerHTML = `
                <div class="data-card-centered">
                    <h2>Módulo: ${moduleName}</h2>
                    <p>El ID de este módulo en la BD es: ${moduleId}</p>
                    <p>Aquí se integrará la tabla con paginación de 5 filas y los botones de CRUD en formato vertical.</p>
                </div>
            `;
        }, 500);
    }

    // Evento Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = '/login.html';
    });

    // Iniciar
    loadMenu();
});