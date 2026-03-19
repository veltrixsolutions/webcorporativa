// static/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. LÓGICA DEL TEMA 
    // ==========================================
    const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
    if (toggleSwitch) {
        const currentTheme = localStorage.getItem('veltrix_theme') || 'light';

        if (currentTheme === 'dark') {
            toggleSwitch.checked = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }

        toggleSwitch.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('veltrix_theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('veltrix_theme', 'light');
            }
        });
    }

    // ==========================================
    // 2. AUTENTICACIÓN (Ahora usa sessionStorage)
    // ==========================================
    const token = sessionStorage.getItem('jwt_token'); 
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
        sessionStorage.removeItem('jwt_token'); 
        window.location.href = '/login.html';
        return;
    }

    // ==========================================
    // 3. UI DEL USUARIO (HEADER Y SIDEBAR)
    // ==========================================
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('jwt_token'); 
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
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nombre)}&background=2563eb&color=fff`;
        }
    }
// ==========================================
    // 4. LÓGICA DEL MENÚ RESPONSIVO (MÓVILES)
    // ==========================================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar'); // <-- NUEVO
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMobileMenu() {
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    }

    // Cierra el menú automáticamente si se hace clic en un enlace en versión móvil
    function closeMenuOnMobile() {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            toggleMobileMenu();
        }
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    if (overlay) overlay.addEventListener('click', toggleMobileMenu); // Cerrar al tocar la sombra lateral
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', toggleMobileMenu); // <-- Cerrar con la X de arriba

    // ==========================================
    // 5. CARGA DINÁMICA DEL MENÚ
    // ==========================================
    async function loadMenu() {
        let menus = [];
        try {
            const response = await fetch('/api/v1/menu', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
                return;
            }
            if (response.ok) menus = await response.json();
        } catch (error) { console.warn('Bypass de red activo.'); }

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
            menuContainer.innerHTML = '<p style="padding: 20px; color: var(--text-secondary); text-align: center; font-size: 0.9rem;">No tienes módulos asignados.</p>';
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
                    loadModuleContent(modulo.id, modulo.nombre, userData.perfil_id);
                    
                    // UX: Cerramos el menú en móviles después de seleccionar un módulo
                    closeMenuOnMobile();
                });
                groupDiv.appendChild(item);
            });
            menuContainer.appendChild(groupDiv);
        });
    }

    function goHome() {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.innerHTML = `<span class="crumb clickable" id="crumb-inicio">Inicio</span>`;
            document.getElementById('crumb-inicio').addEventListener('click', goHome);
        }

        const container = document.getElementById('module-content');
        if (container) {
            container.innerHTML = `
                <div class="data-card-centered">
                    <h1>Bienvenido al Sistema</h1>
                    <p>Selecciona un módulo en el menú lateral para comenzar a gestionar los datos corporativos.</p>
                </div>
            `;
        }

        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        
        // UX: Cerramos el menú en móviles si el usuario hace clic en "Inicio"
        closeMenuOnMobile();
    }

    function updateBreadcrumbs(menuName, moduleName) {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.innerHTML = `
                <span class="crumb clickable" id="crumb-inicio" title="Volver al inicio">Inicio</span>
                <span class="separator">/</span>
                <span style="color: var(--text-secondary);">${menuName}</span>
                <span class="separator">/</span>
                <span class="crumb" style="color: var(--brand-primary);">${moduleName}</span>
            `;
            document.getElementById('crumb-inicio').addEventListener('click', goHome);
        }
    }

    const initialInicioCrumb = document.querySelector('#breadcrumbs .crumb');
    if (initialInicioCrumb) {
        initialInicioCrumb.classList.add('clickable');
        initialInicioCrumb.id = 'crumb-inicio';
        initialInicioCrumb.title = "Volver al inicio";
        initialInicioCrumb.addEventListener('click', goHome);
    }

    function loadModuleContent(moduleId, moduleName, perfilId) {
        const container = document.getElementById('module-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="data-card-centered" style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
                <h2 style="color: var(--text-primary); font-weight: 600;"><i class="fas fa-spinner fa-spin" style="margin-right: 10px; color: var(--brand-primary);"></i>Cargando módulo: ${moduleName}...</h2>
            </div>
        `;

        setTimeout(() => {
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
        }, 150); 
    }

    loadMenu();
});