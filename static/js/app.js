// static/js/app.js

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

    // Establecer datos del usuario en la UI (Sidebar)
    document.getElementById('user-name').textContent = userData.nombre || 'Usuario';
    
    // Extraer ruta de la imagen dinámicamente de la base de datos
    const avatarImg = document.getElementById('user-avatar');
    if (userData.ruta_imagen && userData.ruta_imagen.trim() !== "") {
        avatarImg.src = userData.ruta_imagen;
    } else {
        avatarImg.src = `https://ui-avatars.com/api/?name=${userData.nombre}&background=2563eb&color=fff`;
    }

    // Cargar Menú Dinámico desde el Backend
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

            let menus = await response.json();

            // BYPASS DE SUPER ADMINISTRADOR
            // Si el menú viene vacío, pero el usuario es el Super Admin (Perfil 1),
            // le inyectamos las herramientas del sistema por defecto.
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
        } catch (error) {
            console.error('Error cargando el menú:', error);
        }
    }

    // Renderizar el Menú en el DOM
    function renderMenu(menus) {
        const menuContainer = document.getElementById('dynamic-menu');
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
                    // Remover clase activa de todos los items
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
        breadcrumbs.innerHTML = `
            <span class="crumb">Inicio</span>
            <span class="separator">/</span>
            <span>${menuName}</span>
            <span class="separator">/</span>
            <span class="crumb">${moduleName}</span>
        `;
    }

    // Enrutador de Módulos: Carga el script correspondiente en el contenedor principal
    function loadModuleContent(moduleId, moduleName) {
        const container = document.getElementById('module-content');
        
        container.innerHTML = `
            <div class="data-card-centered">
                <h2>Cargando módulo: ${moduleName}...</h2>
            </div>
        `;

        switch(moduleName) {
            case 'Perfil':
                if (typeof PerfilModule !== 'undefined') PerfilModule.render(container);
                else console.error("PerfilModule no está cargado.");
                break;
            case 'Usuario':
                if (typeof UsuarioModule !== 'undefined') UsuarioModule.render(container);
                else console.error("UsuarioModule no está cargado.");
                break;
            case 'Permisos-Perfil':
                if (typeof PermisoModule !== 'undefined') PermisoModule.render(container);
                else console.error("PermisoModule no está cargado.");
                break;
            case 'Módulo':
                if (typeof ModuloApp !== 'undefined') ModuloApp.render(container);
                else console.error("ModuloApp no está cargado.");
                break;
            default:
                if (typeof ModuloEstatico !== 'undefined') {
                    ModuloEstatico.render(container, moduleId, moduleName);
                } else {
                    console.error("ModuloEstatico no está cargado.");
                }
                break;
        }
    }

    // Evento Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = '/login.html';
    });

    // Iniciar carga del menú al cargar el script
    loadMenu();
});