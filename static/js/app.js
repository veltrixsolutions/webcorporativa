// static/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) { window.location.href = '/login.html'; return; }

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) { return null; }
    }

    const userData = parseJwt(token);
    if (!userData) {
        localStorage.removeItem('jwt_token');
        window.location.href = '/login.html';
        return;
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = '/login.html'; 
        });
    }

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

    async function loadMenu() {
        let menus = [];
        try {
            const response = await fetch('/api/v1/menu', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
                return;
            }
            if (response.ok) menus = await response.json();
        } catch (error) { console.warn('Bypass de red activo.'); }

        // BYPASS: Si no hay menú pero es Super Admin, inyectar el menú base
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
                
                item.addEventListener('click', () => {
                    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    updateBreadcrumbs(menuGroup.nombre_menu, modulo.nombre);
                    // Pasamos el Perfil ID al módulo para validación de seguridad
                    loadModuleContent(modulo.id, modulo.nombre, userData.perfil_id);
                });
                groupDiv.appendChild(item);
            });
            menuContainer.appendChild(groupDiv);
        });
    }

    function updateBreadcrumbs(menuName, moduleName) {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.innerHTML = `<span class="crumb">Inicio</span><span class="separator">/</span><span>${menuName}</span><span class="separator">/</span><span class="crumb">${moduleName}</span>`;
        }
    }

    // Aceptamos perfilId en los parámetros
    function loadModuleContent(moduleId, moduleName, perfilId) {
        const container = document.getElementById('module-content');
        if (!container) return;
        
        container.innerHTML = `<div class="data-card-centered"><h2>Cargando módulo: ${moduleName}...</h2></div>`;

        switch(moduleName) {
            case 'Perfil':
                if (typeof PerfilModule !== 'undefined') PerfilModule.render(container, moduleId, perfilId);
                break;
            case 'Usuario':
                if (typeof UsuarioModule !== 'undefined') UsuarioModule.render(container, moduleId, perfilId);
                break;
            case 'Permisos-Perfil':
                if (typeof PermisoModule !== 'undefined') PermisoModule.render(container, moduleId, perfilId);
                break;
            case 'Módulo':
                if (typeof ModuloApp !== 'undefined') ModuloApp.render(container, moduleId, perfilId);
                break;
            default:
                if (typeof ModuloEstatico !== 'undefined') {
                    ModuloEstatico.render(container, moduleId, moduleName, perfilId);
                }
                break;
        }
    }

    loadMenu();
});