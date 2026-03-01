// static/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // 1. Decodificar JWT
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

    // 2. Activar Botón de Cerrar Sesión (Arriba para evitar fallos si la red cae)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = '/login.html'; 
        });
    }

    // 3. Establecer datos del usuario en la UI
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = userData.nombre || 'Usuario';
    
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg) {
        if (userData.ruta_imagen && userData.ruta_imagen.trim() !== "") {
            avatarImg.src = userData.ruta_imagen;
        } else {
            avatarImg.src = `https://ui-avatars.com/api/?name=${userData.nombre}&background=2563eb&color=fff`;
        }
    }

    // 4. Cargar Menú (A prueba de fallos 404)
    async function loadMenu() {
        let menus = [];
        
        try {
            const response = await fetch('/api/v1/menu', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
                return;
            }

            if (response.ok) {
                menus = await response.json();
            }
        } catch (error) {
            console.warn('El endpoint del menú aún no existe o falló. Intentando Bypass...');
        }

        // BYPASS DE SUPER ADMINISTRADOR (ID 1)
        // Entra aquí ya sea porque la tabla está vacía o porque el servidor dio error 404
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
    }

    // 5. Renderizar el Menú
    function renderMenu(menus) {
        const menuContainer = document.getElementById('dynamic-menu');
        if (!menuContainer) return;
        
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
        if (breadcrumbs) {
            breadcrumbs.innerHTML = `
                <span class="crumb">Inicio</span>
                <span class="separator">/</span>
                <span>${menuName}</span>
                <span class="separator">/</span>
                <span class="crumb">${moduleName}</span>
            `;
        }
    }

    // Enrutador de Módulos
    function loadModuleContent(moduleId, moduleName) {
        const container = document.getElementById('module-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="data-card-centered">
                <h2>Cargando módulo: ${moduleName}...</h2>
            </div>
        `;

        switch(moduleName) {
            case 'Perfil':
                if (typeof PerfilModule !== 'undefined') PerfilModule.render(container);
                else console.error("PerfilModule no está cargado. Revisa tu HTML.");
                break;
            case 'Usuario':
                if (typeof UsuarioModule !== 'undefined') UsuarioModule.render(container);
                else console.error("UsuarioModule no está cargado. Revisa tu HTML.");
                break;
            case 'Permisos-Perfil':
                if (typeof PermisoModule !== 'undefined') PermisoModule.render(container);
                else console.error("PermisoModule no está cargado. Revisa tu HTML.");
                break;
            case 'Módulo':
                if (typeof ModuloApp !== 'undefined') ModuloApp.render(container);
                else console.error("ModuloApp no está cargado. Revisa tu HTML.");
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

    // Iniciar
    loadMenu();
});