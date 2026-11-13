/**
 * EwuarSoft - Aplicación Front-End
 * Tienda y Licores La Farra
 * Control de Inventarios, Ventas y Autenticación MySQL
 */

const App = (() => {
  // Estado local de la aplicación
  const state = {
    currentUser: (() => {
      try {
        return JSON.parse(localStorage.getItem('ewuarsoft_user') || 'null');
      } catch (e) {
        return null;
      }
    })(),
    token: localStorage.getItem('ewuarsoft_token') || null,
    currentView: 'dashboard',
    products: [],
    categories: [],
    suppliers: [],
    movements: [],
    sales: [],
    users: [],
    cart: [],
    posFilterCategory: '',
    posSearchQuery: '',
    productsSearchQuery: '',
    productsFilterCategory: '',
    includeInactive: true
  };

  /* ================== FORMATOS Y UTILIDADES ================== */
  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /* ================== NOTIFICACIONES TOAST ================== */
  function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="btn-close" style="font-size: 14px;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  /* ================== MODALES ================== */
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  function closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  }

  /* ================== AUTENTICACIÓN (LOGIN & REGISTRO) ================== */
  function checkAuth() {
    const authOverlay = document.getElementById('auth-overlay');
    if (!state.currentUser) {
      authOverlay.classList.add('active');
      setAuthTab('login');
    } else {
      authOverlay.classList.remove('active');
      renderUserProfile();
    }
  }

  function renderUserProfile() {
    if (!state.currentUser) return;
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const initialsEl = document.getElementById('user-avatar-initials');

    if (nameEl) nameEl.textContent = state.currentUser.name;
    if (roleEl) roleEl.textContent = state.currentUser.role || 'VENDEDOR';
    if (initialsEl) {
      const parts = (state.currentUser.name || 'U').trim().split(' ');
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]) : parts[0].slice(0, 2);
      initialsEl.textContent = initials.toUpperCase();
    }
  }

  function setAuthTab(tab) {
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegBtn = document.getElementById('tab-register-btn');
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');

    hideAuthAlerts();

    if (tab === 'login') {
      tabLoginBtn.classList.add('active');
      tabRegBtn.classList.remove('active');
      formLogin.style.display = 'block';
      formReg.style.display = 'none';
      document.getElementById('login-email').focus();
    } else {
      tabLoginBtn.classList.remove('active');
      tabRegBtn.classList.add('active');
      formLogin.style.display = 'none';
      formReg.style.display = 'block';
      document.getElementById('reg-name').focus();
    }
  }

  function showAuthAlert(type, message, isNotFound = false, isDuplicate = false) {
    const alertEl = type === 'login' ? document.getElementById('login-alert') : document.getElementById('register-alert');
    const textEl = type === 'login' ? document.getElementById('login-alert-text') : document.getElementById('register-alert-text');
    const actionEl = type === 'login' ? document.getElementById('login-alert-action') : document.getElementById('register-alert-action');

    textEl.innerHTML = message;
    alertEl.className = 'auth-alert active ' + (isNotFound || isDuplicate ? 'auth-alert-warning' : 'auth-alert-danger');

    if (type === 'login' && isNotFound) {
      actionEl.style.display = 'block';
    } else if (type === 'register' && isDuplicate) {
      actionEl.style.display = 'block';
    } else {
      actionEl.style.display = 'none';
    }
  }

  function hideAuthAlerts() {
    const lAlert = document.getElementById('login-alert');
    const rAlert = document.getElementById('register-alert');
    if (lAlert) lAlert.classList.remove('active');
    if (rAlert) rAlert.classList.remove('active');
  }

  async function handleLogin(e) {
    e.preventDefault();
    hideAuthAlerts();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('btn-submit-login');

    if (!email || !password) {
      showAuthAlert('login', 'Por favor ingresa tanto tu correo electrónico como tu contraseña.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando credenciales...';

    try {
      const res = await API.login(email, password);
      if (res.success && res.data) {
        state.currentUser = res.data.user;
        state.token = res.data.token;
        localStorage.setItem('ewuarsoft_user', JSON.stringify(res.data.user));
        localStorage.setItem('ewuarsoft_token', res.data.token);

        showToast('¡Inicio de Sesión Exitoso!', `Bienvenido(a) de nuevo, ${res.data.user.name}.`, 'success');
        document.getElementById('auth-overlay').classList.remove('active');
        renderUserProfile();
        loadInitialData();
      }
    } catch (err) {
      // Manejo específico solicitado por el usuario:
      // 1. Si el usuario no existe (HTTP 404):
      if (err.status === 404) {
        showAuthAlert(
          'login',
          `<strong><i class="fa-solid fa-triangle-exclamation"></i> El usuario no existe.</strong><br>El correo <code>${email}</code> no está registrado en el sistema. Puedes crear tu cuenta de inmediato.`,
          true
        );
      }
      // 2. Si la contraseña es incorrecta (HTTP 401):
      else if (err.status === 401) {
        showAuthAlert(
          'login',
          '<strong><i class="fa-solid fa-circle-xmark"></i> Contraseña incorrecta.</strong><br>Por favor verifica tu contraseña e inténtalo nuevamente.'
        );
      }
      // 3. Usuario inactivo (HTTP 403):
      else if (err.status === 403) {
        showAuthAlert(
          'login',
          '<strong><i class="fa-solid fa-ban"></i> Cuenta inactiva.</strong><br>Tu usuario ha sido desactivado por el administrador.'
        );
      }
      // 4. Cualquier otro error:
      else {
        showAuthAlert('login', `<strong>Error:</strong> ${err.message}`);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión';
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    hideAuthAlerts();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const submitBtn = document.getElementById('btn-submit-register');

    if (password !== confirmPassword) {
      showAuthAlert('register', '<strong>Las contraseñas no coinciden.</strong> Por favor asegúrate de escribir la misma contraseña en ambos campos.');
      return;
    }

    if (password.length < 6) {
      showAuthAlert('register', '<strong>Contraseña muy corta.</strong> Debe contener como mínimo 6 caracteres.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando usuario en MySQL...';

    try {
      const res = await API.register({ name, email, password, role });
      if (res.success && res.data) {
        showToast('¡Registro Exitoso!', `Cuenta creada para ${name}. Iniciando sesión automáticamente...`, 'success');

        // Auto-login con las credenciales registradas
        try {
          const loginRes = await API.login(email, password);
          state.currentUser = loginRes.data.user;
          state.token = loginRes.data.token;
          localStorage.setItem('ewuarsoft_user', JSON.stringify(loginRes.data.user));
          localStorage.setItem('ewuarsoft_token', loginRes.data.token);

          document.getElementById('auth-overlay').classList.remove('active');
          renderUserProfile();
          loadInitialData();
        } catch (loginErr) {
          // Si por alguna razón falla el auto-login, cambiar a pestaña de login con email listo
          setAuthTab('login');
          document.getElementById('login-email').value = email;
          document.getElementById('login-password').value = password;
          showToast('Inicia Sesión', 'Ingresa con la contraseña recién creada.', 'info');
        }
      }
    } catch (err) {
      if (err.status === 409) {
        showAuthAlert(
          'register',
          `<strong><i class="fa-solid fa-triangle-exclamation"></i> Correo ya registrado.</strong><br>Ya existe una cuenta con el correo <code>${email}</code>. Inicia sesión en su lugar.`,
          false,
          true
        );
      } else {
        showAuthAlert('register', `<strong>Error en el registro:</strong> ${err.message}`);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear Mi Cuenta';
    }
  }

  function handleLogout() {
    if (!confirm('¿Deseas cerrar tu sesión actual en EwuarSoft?')) return;
    state.currentUser = null;
    state.token = null;
    localStorage.removeItem('ewuarsoft_user');
    localStorage.removeItem('ewuarsoft_token');

    showToast('Sesión Cerrada', 'Has salido del sistema correctamente.', 'info');
    document.getElementById('form-login').reset();
    document.getElementById('form-register').reset();
    hideAuthAlerts();
    document.getElementById('auth-overlay').classList.add('active');
    setAuthTab('login');
  }

  function prefillLogin(email, password) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
    hideAuthAlerts();
    document.getElementById('btn-submit-login').focus();
  }

  function evaluatePasswordStrength(password) {
    const fill = document.getElementById('pwd-strength-fill');
    const text = document.getElementById('pwd-strength-text');
    if (!fill || !text) return;

    if (!password) {
      fill.style.width = '0%';
      fill.style.backgroundColor = '#e2e8f0';
      text.textContent = 'Ingresa tu contraseña';
      text.style.color = 'var(--text-muted)';
      return;
    }

    let score = 0;
    if (password.length >= 6) score += 25;
    if (password.length >= 10) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;

    fill.style.width = `${score}%`;

    if (score <= 25) {
      fill.style.backgroundColor = 'var(--danger)';
      text.textContent = 'Débil (agrega números o símbolos)';
      text.style.color = 'var(--danger)';
    } else if (score <= 50) {
      fill.style.backgroundColor = 'var(--warning)';
      text.textContent = 'Aceptable';
      text.style.color = 'var(--warning)';
    } else if (score <= 75) {
      fill.style.backgroundColor = '#0ea5e9';
      text.textContent = 'Segura';
      text.style.color = '#0ea5e9';
    } else {
      fill.style.backgroundColor = 'var(--success)';
      text.textContent = 'Muy Segura (Excelente)';
      text.style.color = 'var(--success)';
    }
  }

  function checkPasswordMatch() {
    const pwd = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;
    const msg = document.getElementById('pwd-match-msg');
    if (!msg) return;

    if (!confirm) {
      msg.textContent = '';
      return;
    }

    if (pwd === confirm) {
      msg.textContent = '✔ Las contraseñas coinciden';
      msg.style.color = 'var(--success)';
    } else {
      msg.textContent = '✖ Las contraseñas no coinciden';
      msg.style.color = 'var(--danger)';
    }
  }

  /* ================== NAVEGACIÓN ================== */
  const viewTitles = {
    dashboard: 'Dashboard General & Métricas',
    pos: 'Punto de Venta (Caja Registradora)',
    products: 'Catálogo de Productos',
    inventory: 'Movimientos de Stock (Entradas y Salidas)',
    catalogs: 'Categorías y Proveedores',
    reports: 'Reportes y Auditoría',
    users: 'Usuarios Registrados (MySQL Auth)'
  };

  function navigateTo(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) targetSec.classList.add('active');

    const titleEl = document.getElementById('current-view-title');
    if (titleEl) titleEl.textContent = viewTitles[viewName] || 'EwuarSoft';

    // Disparar carga de datos correspondiente
    if (viewName === 'dashboard') loadDashboard();
    else if (viewName === 'pos') renderPosCatalog();
    else if (viewName === 'products') renderProductsTable();
    else if (viewName === 'inventory') loadInventoryView();
    else if (viewName === 'catalogs') loadCatalogsView();
    else if (viewName === 'reports') loadSalesReport();
    else if (viewName === 'users') loadUsersView();
  }

  /* ================== ESTADO DE CONEXIÓN MYSQL ================== */
  async function checkConnection() {
    const badge = document.getElementById('db-status-badge');
    const text = document.getElementById('db-status-text');
    try {
      const res = await API.checkHealth();
      if (res && res.success) {
        badge.classList.remove('disconnected');
        text.textContent = 'MySQL: Conectado (ewarsoft)';
      } else {
        badge.classList.add('disconnected');
        text.textContent = 'Error API';
      }
    } catch (e) {
      badge.classList.add('disconnected');
      text.textContent = 'MySQL: Desconectado';
    }
  }

  /* ================== CARGA PRINCIPAL DE DATOS ================== */
  async function loadInitialData() {
    if (!state.currentUser) return;
    try {
      const [catRes, supRes, prodRes] = await Promise.all([
        API.getCategories(),
        API.getSuppliers(),
        API.getProducts(true)
      ]);

      state.categories = catRes.data || [];
      state.suppliers = supRes.data || [];
      state.products = prodRes.data || [];

      updateSelectOptions();
      loadDashboard();
    } catch (err) {
      showToast('Error de conexión', err.message, 'danger');
    }
  }

  function updateSelectOptions() {
    // Categorías en formulario producto
    const prodCat = document.getElementById('prod-category');
    const filterCat = document.getElementById('products-category-filter');
    const posChips = document.getElementById('pos-category-chips');

    if (prodCat) {
      prodCat.innerHTML = '<option value="">-- Seleccionar categoría --</option>' +
        state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (filterCat) {
      filterCat.innerHTML = '<option value="">Todas las categorías</option>' +
        state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (posChips) {
      posChips.innerHTML = `
        <button class="chip ${state.posFilterCategory === '' ? 'active' : ''}" data-category="">Todas</button>
        ${state.categories.map(c => `
          <button class="chip ${state.posFilterCategory === String(c.id) ? 'active' : ''}" data-category="${c.id}">${c.name}</button>
        `).join('')}
      `;
      posChips.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          posChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.posFilterCategory = chip.dataset.category || '';
          renderPosCatalog();
        });
      });
    }

    // Proveedores en formulario producto
    const prodSup = document.getElementById('prod-supplier');
    if (prodSup) {
      prodSup.innerHTML = '<option value="">-- Ninguno / Opcional --</option>' +
        state.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    // Selectores en Movimientos de Stock
    const entrySelect = document.getElementById('entry-product-select');
    const exitSelect = document.getElementById('exit-product-select');

    const activeProducts = state.products.filter(p => p.active);
    const optionsHtml = '<option value="">-- Seleccionar producto --</option>' +
      activeProducts.map(p => `<option value="${p.id}" data-stock="${p.stock}" data-name="${p.name}">${p.sku} - ${p.name} (Stock actual: ${p.stock})</option>`).join('');

    if (entrySelect) entrySelect.innerHTML = optionsHtml;
    if (exitSelect) exitSelect.innerHTML = optionsHtml;
  }

  /* ================== DASHBOARD ================== */
  async function loadDashboard() {
    try {
      const [prodRes, lowStockRes, salesRes] = await Promise.all([
        API.getProducts(true),
        API.getLowStockReport(),
        API.getSalesReport()
      ]);

      state.products = prodRes.data || [];
      const lowStockProducts = lowStockRes.data || [];
      const sales = salesRes.data || [];

      // Métricas
      const activeCount = state.products.filter(p => p.active).length;
      document.getElementById('stat-total-products').textContent = state.products.length;
      document.getElementById('stat-active-products').textContent = `${activeCount} activos`;

      const totalSalesAmount = sales.reduce((sum, item) => sum + Number(item.subtotal), 0);
      const uniqueSalesCount = new Set(sales.map(s => s.sale_id)).size;
      document.getElementById('stat-total-sales-amount').textContent = formatMoney(totalSalesAmount);
      document.getElementById('stat-total-sales-count').textContent = `${uniqueSalesCount} ventas registradas`;

      document.getElementById('stat-low-stock-count').textContent = lowStockProducts.length;
      document.getElementById('stat-categories-count').textContent = `${state.categories.length} Cat.`;
      document.getElementById('stat-suppliers-count').textContent = `${state.suppliers.length} proveedores`;

      // Tabla Stock Bajo en Dashboard
      const lowStockBody = document.getElementById('dashboard-low-stock-body');
      if (lowStockProducts.length === 0) {
        lowStockBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--success); padding: 20px;">
              <i class="fa-solid fa-circle-check"></i> Todos los productos tienen stock suficiente.
            </td>
          </tr>
        `;
      } else {
        lowStockBody.innerHTML = lowStockProducts.map(p => `
          <tr>
            <td><code>${p.sku}</code></td>
            <td style="font-weight: 600;">${p.name}</td>
            <td>
              <span class="badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}">
                ${p.stock === 0 ? 'Agotado (0)' : p.stock + ' un.'}
              </span>
            </td>
            <td>${p.min_stock} un.</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="App.openStockEntryFor(${p.id})">
                <i class="fa-solid fa-plus-circle"></i> Surtir
              </button>
            </td>
          </tr>
        `).join('');
      }

      // Tabla Últimas Ventas en Dashboard
      const recentSalesBody = document.getElementById('dashboard-recent-sales-body');
      if (sales.length === 0) {
        recentSalesBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
              No se han registrado ventas hoy.
            </td>
          </tr>
        `;
      } else {
        const topSales = sales.slice(0, 5);
        recentSalesBody.innerHTML = topSales.map(s => `
          <tr>
            <td><strong>#${s.sale_id}</strong></td>
            <td>${formatDate(s.created_at)}</td>
            <td>${s.product}</td>
            <td><span class="badge badge-secondary">${s.quantity} un.</span></td>
            <td style="font-weight: 700; color: #047857;">${formatMoney(s.subtotal)}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast('Error cargando Dashboard', err.message, 'danger');
    }
  }

  /* ================== PUNTO DE VENTA (POS) ================== */
  function renderPosCatalog() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    const query = (state.posSearchQuery || '').toLowerCase().trim();
    const catFilter = state.posFilterCategory;

    const availableProducts = state.products.filter(p => {
      if (!p.active) return false;
      if (catFilter && String(p.category_id) !== String(catFilter)) return false;
      if (query) {
        const matchName = p.name.toLowerCase().includes(query);
        const matchSku = p.sku.toLowerCase().includes(query);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });

    if (availableProducts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 32px; margin-bottom: 8px;"></i>
          <p>No se encontraron productos activos que coincidan con la búsqueda.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = availableProducts.map(p => {
      const isOutOfStock = p.stock <= 0;
      let stockBadgeClass = 'badge-success';
      if (p.stock <= 0) stockBadgeClass = 'badge-danger';
      else if (p.stock <= p.min_stock) stockBadgeClass = 'badge-warning';

      return `
        <div class="pos-card ${isOutOfStock ? 'out-of-stock' : ''}" onclick="App.addToCart(${p.id})">
          <div>
            <div class="pos-card-header">
              <span class="pos-card-sku">${p.sku}</span>
              <span class="badge ${stockBadgeClass}">Stock: ${p.stock}</span>
            </div>
            <div class="pos-card-title">${p.name}</div>
            <div class="pos-card-category">${p.category || 'General'}</div>
          </div>
          <div class="pos-card-footer">
            <span class="pos-price">${formatMoney(p.sale_price)}</span>
            <button class="btn btn-sm ${isOutOfStock ? 'btn-outline' : 'btn-primary'}" ${isOutOfStock ? 'disabled' : ''}>
              <i class="fa-solid fa-cart-plus"></i> Agregar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function addToCart(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;
    if (prod.stock <= 0) {
      showToast('Sin existencias', `El producto "${prod.name}" no tiene stock disponible.`, 'warning');
      return;
    }

    const existing = state.cart.find(item => item.product_id === productId);
    if (existing) {
      if (existing.quantity >= prod.stock) {
        showToast('Límite de Stock', `No puedes agregar más de ${prod.stock} unidades de este producto.`, 'warning');
        return;
      }
      existing.quantity += 1;
      existing.subtotal = existing.quantity * existing.sale_price;
    } else {
      state.cart.push({
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        sale_price: Number(prod.sale_price),
        stock: prod.stock,
        quantity: 1,
        subtotal: Number(prod.sale_price)
      });
    }

    renderCart();
  }

  function updateCartQuantity(productId, delta) {
    const item = state.cart.find(i => i.product_id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.stock) {
      showToast('Límite de Stock', `Existencias máximas disponibles: ${item.stock}`, 'warning');
      return;
    }

    item.quantity = newQty;
    item.subtotal = item.quantity * item.sale_price;
    renderCart();
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(i => i.product_id !== productId);
    renderCart();
  }

  function clearCart() {
    state.cart = [];
    renderCart();
  }

  function renderCart() {
    const container = document.getElementById('cart-items-container');
    const itemsCountEl = document.getElementById('cart-items-count');
    const unitsCountEl = document.getElementById('cart-units-count');
    const totalEl = document.getElementById('cart-total-amount');
    const checkoutBtn = document.getElementById('btn-submit-sale');

    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <i class="fa-solid fa-basket-shopping"></i>
          <p>El carrito está vacío</p>
          <span style="font-size: 11px;">Haz clic en un producto para agregarlo</span>
        </div>
      `;
      itemsCountEl.textContent = '0';
      unitsCountEl.textContent = '0';
      totalEl.textContent = '$ 0';
      checkoutBtn.disabled = true;
      return;
    }

    const totalUnits = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const grandTotal = state.cart.reduce((sum, item) => sum + item.subtotal, 0);

    itemsCountEl.textContent = String(state.cart.length);
    unitsCountEl.textContent = String(totalUnits);
    totalEl.textContent = formatMoney(grandTotal);
    checkoutBtn.disabled = false;

    container.innerHTML = state.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatMoney(item.sale_price)} c/u</div>
        </div>
        <div class="cart-qty-ctrl">
          <button class="cart-qty-btn" onclick="App.updateCartQuantity(${item.product_id}, -1)">-</button>
          <span class="cart-qty-val">${item.quantity}</span>
          <button class="cart-qty-btn" onclick="App.updateCartQuantity(${item.product_id}, 1)">+</button>
        </div>
        <div class="cart-item-subtotal">${formatMoney(item.subtotal)}</div>
        <button class="btn btn-icon" style="color: var(--danger); background: none; border: none; cursor: pointer;" onclick="App.removeFromCart(${item.product_id})" title="Quitar">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');
  }

  async function processSale() {
    if (state.cart.length === 0) return;

    const checkoutBtn = document.getElementById('btn-submit-sale');
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

    try {
      const itemsPayload = state.cart.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity
      }));

      const res = await API.createSale(itemsPayload);
      if (res.success && res.data) {
        showToast('¡Venta Exitosa!', `Venta #${res.data.sale_id} guardada en MySQL por ${formatMoney(res.data.total)}`, 'success');
        
        // Mostrar Ticket de Venta
        renderReceipt(res.data);
        openModal('modal-receipt');

        // Limpiar carrito y recargar productos
        clearCart();
        const prodRes = await API.getProducts(true);
        state.products = prodRes.data || [];
        updateSelectOptions();
        renderPosCatalog();
      }
    } catch (err) {
      showToast('Error al procesar venta', err.message, 'danger');
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Procesar Venta</span>';
    }
  }

  function renderReceipt(saleData) {
    document.getElementById('receipt-date-time').textContent = `Fecha: ${new Date().toLocaleString('es-CO')}`;
    document.getElementById('receipt-sale-number').textContent = `FACTURA DE VENTA #${saleData.sale_id}`;
    document.getElementById('receipt-total-amount').textContent = formatMoney(saleData.total);

    const tbody = document.getElementById('receipt-items-tbody');
    tbody.innerHTML = (saleData.items || []).map(i => `
      <tr>
        <td>${i.name}</td>
        <td style="text-align: center;">${i.quantity}</td>
        <td style="text-align: right;">${formatMoney(i.subtotal)}</td>
      </tr>
    `).join('');
  }

  /* ================== PRODUCTOS ================== */
  function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    const query = (state.productsSearchQuery || '').toLowerCase().trim();
    const catFilter = state.productsFilterCategory;
    const includeInactive = state.includeInactive;

    const filtered = state.products.filter(p => {
      if (!includeInactive && !p.active) return false;
      if (catFilter && String(p.category_id) !== String(catFilter)) return false;
      if (query) {
        const matchName = (p.name || '').toLowerCase().includes(query);
        const matchSku = (p.sku || '').toLowerCase().includes(query);
        const matchCat = (p.category || '').toLowerCase().includes(query);
        const matchSup = (p.supplier || '').toLowerCase().includes(query);
        if (!matchName && !matchSku && !matchCat && !matchSup) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No hay productos registrados que coincidan con el filtro.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      let stockBadgeClass = 'badge-success';
      let stockLabel = `${p.stock} un.`;
      if (p.stock <= 0) {
        stockBadgeClass = 'badge-danger';
        stockLabel = 'Agotado (0)';
      } else if (p.stock <= p.min_stock) {
        stockBadgeClass = 'badge-warning';
        stockLabel = `Bajo (${p.stock})`;
      }

      return `
        <tr>
          <td>#${p.id}</td>
          <td><code>${p.sku}</code></td>
          <td>
            <div style="font-weight: 600;">${p.name}</div>
            ${p.description ? `<div style="font-size: 11px; color: var(--text-muted);">${p.description}</div>` : ''}
          </td>
          <td><span class="badge badge-secondary">${p.category || '-'}</span></td>
          <td><span style="font-size: 12px;">${p.supplier || 'N/A'}</span></td>
          <td>${formatMoney(p.purchase_price)}</td>
          <td style="font-weight: 700; color: #047857;">${formatMoney(p.sale_price)}</td>
          <td><span class="badge ${stockBadgeClass}">${stockLabel}</span></td>
          <td>
            <span class="badge ${p.active ? 'badge-success' : 'badge-danger'}">
              ${p.active ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" onclick="App.openStockEntryFor(${p.id})" title="Registrar Entrada de Stock">
              <i class="fa-solid fa-circle-plus" style="color: var(--success);"></i>
            </button>
            <button class="btn btn-outline btn-sm" onclick="App.openEditProduct(${p.id})" title="Editar Producto">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            ${p.active ? `
              <button class="btn btn-outline btn-sm" onclick="App.toggleProductStatus(${p.id}, false)" title="Desactivar">
                <i class="fa-solid fa-ban" style="color: var(--danger);"></i>
              </button>
            ` : `
              <button class="btn btn-outline btn-sm" onclick="App.toggleProductStatus(${p.id}, true)" title="Activar">
                <i class="fa-solid fa-check" style="color: var(--success);"></i>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  function openCreateProduct() {
    document.getElementById('form-product').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('modal-product-title').innerHTML = '<i class="fa-solid fa-box"></i> <span>Nuevo Producto</span>';
    document.getElementById('prod-active-container').style.display = 'none';
    openModal('modal-product');
  }

  function openEditProduct(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;

    document.getElementById('product-id').value = prod.id;
    document.getElementById('prod-sku').value = prod.sku;
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-desc').value = prod.description || '';
    document.getElementById('prod-category').value = prod.category_id;
    document.getElementById('prod-supplier').value = prod.supplier_id || '';
    document.getElementById('prod-purchase-price').value = prod.purchase_price;
    document.getElementById('prod-sale-price').value = prod.sale_price;
    document.getElementById('prod-min-stock').value = prod.min_stock;
    document.getElementById('prod-active').value = prod.active ? '1' : '0';
    document.getElementById('prod-active-container').style.display = 'block';

    document.getElementById('modal-product-title').innerHTML = `<i class="fa-solid fa-pen"></i> <span>Editar: ${prod.name}</span>`;
    openModal('modal-product');
  }

  async function saveProduct(event) {
    event.preventDefault();
    const id = document.getElementById('product-id').value;
    const sku = document.getElementById('prod-sku').value.trim();
    const name = document.getElementById('prod-name').value.trim();
    const description = document.getElementById('prod-desc').value.trim();
    const category_id = document.getElementById('prod-category').value;
    const supplier_id = document.getElementById('prod-supplier').value;
    const purchase_price = document.getElementById('prod-purchase-price').value;
    const sale_price = document.getElementById('prod-sale-price').value;
    const min_stock = document.getElementById('prod-min-stock').value;

    const payload = {
      sku,
      name,
      description: description || null,
      category_id: Number(category_id),
      supplier_id: supplier_id ? Number(supplier_id) : null,
      purchase_price: Number(purchase_price),
      sale_price: Number(sale_price),
      min_stock: Number(min_stock)
    };

    try {
      if (id) {
        // Actualizar
        const activeVal = document.getElementById('prod-active').value === '1';
        payload.active = activeVal;
        await API.updateProduct(id, payload);
        showToast('Producto Actualizado', `El producto "${name}" se actualizó correctamente en MySQL.`);
      } else {
        // Crear
        await API.createProduct(payload);
        showToast('Producto Creado', `El producto "${name}" se registró con éxito en MySQL.`);
      }

      closeModals();
      const prodRes = await API.getProducts(true);
      state.products = prodRes.data || [];
      updateSelectOptions();
      renderProductsTable();
      renderPosCatalog();
    } catch (err) {
      showToast('Error al guardar producto', err.message, 'danger');
    }
  }

  async function toggleProductStatus(productId, shouldActivate) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;

    const actionText = shouldActivate ? 'activar' : 'desactivar';
    if (!confirm(`¿Estás seguro de que deseas ${actionText} el producto "${prod.name}"?`)) {
      return;
    }

    try {
      if (shouldActivate) {
        await API.activateProduct(productId);
        showToast('Producto Activado', `"${prod.name}" ahora está activo.`);
      } else {
        await API.deactivateProduct(productId);
        showToast('Producto Desactivado', `"${prod.name}" ha sido dado de baja lógica.`);
      }

      const prodRes = await API.getProducts(true);
      state.products = prodRes.data || [];
      renderProductsTable();
      renderPosCatalog();
    } catch (err) {
      showToast('Error', err.message, 'danger');
    }
  }

  /* ================== MOVIMIENTOS DE STOCK ================== */
  function openStockEntryFor(productId) {
    navigateTo('inventory');
    const select = document.getElementById('entry-product-select');
    if (select) {
      select.value = productId;
      select.dispatchEvent(new Event('change'));
      document.getElementById('entry-quantity').focus();
    }
  }

  async function loadInventoryView() {
    updateSelectOptions();
    await loadMovementsHistory();
  }

  async function loadMovementsHistory() {
    const tbody = document.getElementById('movements-table-body');
    if (!tbody) return;

    try {
      const res = await API.getMovements(50);
      state.movements = res.data || [];

      if (state.movements.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
              No se han registrado movimientos de inventario todavía.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = state.movements.map(m => {
        let typeBadge = '<span class="badge badge-success"><i class="fa-solid fa-arrow-down"></i> ENTRADA</span>';
        if (m.movement_type === 'EXIT') {
          typeBadge = '<span class="badge badge-danger"><i class="fa-solid fa-arrow-up"></i> SALIDA</span>';
        } else if (m.movement_type === 'SALE') {
          typeBadge = '<span class="badge badge-primary"><i class="fa-solid fa-bag-shopping"></i> VENTA</span>';
        }

        return `
          <tr>
            <td>#${m.id}</td>
            <td>${formatDate(m.created_at)}</td>
            <td>${typeBadge}</td>
            <td><code>${m.sku}</code></td>
            <td style="font-weight: 600;">${m.product_name}</td>
            <td style="font-weight: 700;">${m.quantity} un.</td>
            <td style="color: var(--text-muted); font-size: 12px;">${m.note || '-'}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 16px;">${err.message}</td></tr>`;
    }
  }

  /* ================== CATÁLOGOS: CATEGORÍAS & PROVEEDORES ================== */
  async function loadCatalogsView() {
    renderCategoriesTable();
    renderSuppliersTable();
  }

  function renderCategoriesTable() {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    if (state.categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No hay categorías registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = state.categories.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td style="font-weight: 700; color: var(--primary);">${c.name}</td>
        <td style="color: var(--text-muted);">${c.description || '-'}</td>
        <td style="font-size: 11px;">${formatDate(c.created_at)}</td>
      </tr>
    `).join('');
  }

  function renderSuppliersTable() {
    const tbody = document.getElementById('suppliers-table-body');
    if (!tbody) return;

    if (state.suppliers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay proveedores registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = state.suppliers.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td style="font-weight: 700;">${s.name}</td>
        <td>${s.contact || '-'}</td>
        <td>${s.phone ? `<a href="tel:${s.phone}">${s.phone}</a>` : '-'}</td>
        <td>${s.email ? `<a href="mailto:${s.email}">${s.email}</a>` : '-'}</td>
      </tr>
    `).join('');
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    const name = document.getElementById('cat-name').value.trim();
    const description = document.getElementById('cat-desc').value.trim();

    try {
      await API.createCategory({ name, description: description || null });
      showToast('Categoría Creada', `Categoría "${name}" agregada con éxito.`);
      closeModals();
      const res = await API.getCategories();
      state.categories = res.data || [];
      updateSelectOptions();
      renderCategoriesTable();
    } catch (err) {
      showToast('Error creando categoría', err.message, 'danger');
    }
  }

  async function handleCreateSupplier(e) {
    e.preventDefault();
    const name = document.getElementById('sup-name').value.trim();
    const contact = document.getElementById('sup-contact').value.trim();
    const phone = document.getElementById('sup-phone').value.trim();
    const email = document.getElementById('sup-email').value.trim();

    try {
      await API.createSupplier({
        name,
        contact: contact || null,
        phone: phone || null,
        email: email || null
      });
      showToast('Proveedor Creado', `Proveedor "${name}" registrado con éxito.`);
      closeModals();
      const res = await API.getSuppliers();
      state.suppliers = res.data || [];
      updateSelectOptions();
      renderSuppliersTable();
    } catch (err) {
      showToast('Error creando proveedor', err.message, 'danger');
    }
  }

  /* ================== VISTA: USUARIOS (AUTH MYSQL) ================== */
  async function loadUsersView() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    try {
      const res = await API.getUsers();
      state.users = res.data || [];

      if (state.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px;">No hay usuarios registrados.</td></tr>';
        return;
      }

      tbody.innerHTML = state.users.map(u => {
        let roleBadge = '<span class="badge badge-primary">ADMIN</span>';
        if (u.role === 'CAJERO') roleBadge = '<span class="badge badge-success">CAJERO</span>';
        else if (u.role === 'VENDEDOR') roleBadge = '<span class="badge badge-secondary">VENDEDOR</span>';

        return `
          <tr>
            <td>#${u.id}</td>
            <td style="font-weight: 700;">${u.name}</td>
            <td><code>${u.email}</code></td>
            <td>${roleBadge}</td>
            <td>
              <span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">
                ${u.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>${u.last_login ? formatDate(u.last_login) : '<span style="color: var(--text-light);">Sin inicios de sesión</span>'}</td>
            <td style="font-size: 11px;">${formatDate(u.created_at)}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 16px;">${err.message}</td></tr>`;
    }
  }

  /* ================== REPORTES ================== */
  async function loadSalesReport() {
    const from = document.getElementById('report-sales-from').value || null;
    const to = document.getElementById('report-sales-to').value || null;
    const tbody = document.getElementById('report-sales-tbody');

    try {
      const res = await API.getSalesReport(from, to);
      state.sales = res.data || [];

      const totalAmount = state.sales.reduce((sum, item) => sum + Number(item.subtotal), 0);
      const totalUnits = state.sales.reduce((sum, item) => sum + Number(item.quantity), 0);

      document.getElementById('report-sales-total-amount').textContent = formatMoney(totalAmount);
      document.getElementById('report-sales-total-units').textContent = `${totalUnits} un.`;
      document.getElementById('report-sales-records-count').textContent = state.sales.length;

      if (state.sales.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
              No se encontraron ventas registradas en el periodo seleccionado.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = state.sales.map(s => `
        <tr>
          <td><strong>#${s.sale_id}</strong></td>
          <td>${formatDate(s.created_at)}</td>
          <td style="font-weight: 600;">${s.product}</td>
          <td><span class="badge badge-secondary">${s.quantity} un.</span></td>
          <td>${formatMoney(s.unit_price)}</td>
          <td style="font-weight: 700; color: #047857;">${formatMoney(s.subtotal)}</td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error cargando ventas', err.message, 'danger');
    }
  }

  async function loadInventoryReport() {
    const tbody = document.getElementById('report-inv-tbody');
    try {
      const [invRes, prodRes] = await Promise.all([
        API.getInventoryReport(),
        API.getProducts(false)
      ]);

      const items = invRes.data || [];
      const productsMap = new Map((prodRes.data || []).map(p => [p.id, p]));

      let totalCost = 0;
      let totalSaleValue = 0;

      tbody.innerHTML = items.map(item => {
        const fullProd = productsMap.get(item.id);
        const purchasePrice = fullProd ? Number(fullProd.purchase_price) : 0;
        const salePrice = Number(item.sale_price);
        const stock = Number(item.stock);

        const lineCost = purchasePrice * stock;
        const lineSale = salePrice * stock;
        totalCost += lineCost;
        totalSaleValue += lineSale;

        return `
          <tr>
            <td><code>${item.sku}</code></td>
            <td style="font-weight: 600;">${item.name}</td>
            <td><span class="badge badge-secondary">${item.category}</span></td>
            <td><span class="badge ${stock === 0 ? 'badge-danger' : 'badge-success'}">${stock} un.</span></td>
            <td>${item.min_stock} un.</td>
            <td>${formatMoney(salePrice)}</td>
            <td style="font-weight: 700; color: #047857;">${formatMoney(lineSale)}</td>
          </tr>
        `;
      }).join('');

      document.getElementById('report-inv-cost').textContent = formatMoney(totalCost);
      document.getElementById('report-inv-sale').textContent = formatMoney(totalSaleValue);
      document.getElementById('report-inv-profit').textContent = formatMoney(totalSaleValue - totalCost);
    } catch (err) {
      showToast('Error cargando inventario', err.message, 'danger');
    }
  }

  async function loadLowStockReport() {
    const thresholdVal = document.getElementById('report-lowstock-threshold').value;
    const tbody = document.getElementById('report-lowstock-tbody');

    try {
      const res = await API.getLowStockReport(thresholdVal || null);
      const items = res.data || [];

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--success); padding: 30px;">
              <i class="fa-solid fa-circle-check"></i> Todo el inventario se encuentra por encima del umbral requerido.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = items.map(p => {
        const deficit = Math.max(0, p.min_stock - p.stock);
        return `
          <tr>
            <td><code>${p.sku}</code></td>
            <td style="font-weight: 600;">${p.name}</td>
            <td><span class="badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}">${p.stock} un.</span></td>
            <td>${p.min_stock} un.</td>
            <td style="color: var(--danger); font-weight: 700;">+${deficit} un. requeridas</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="App.openStockEntryFor(${p.id})">
                <i class="fa-solid fa-plus-circle"></i> Surtir
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      showToast('Error cargando bajo stock', err.message, 'danger');
    }
  }

  /* Exportar a CSV */
  function exportSalesToCsv() {
    if (state.sales.length === 0) {
      showToast('Sin datos', 'No hay ventas en la tabla para exportar.', 'warning');
      return;
    }

    const headers = ['Venta_ID', 'Fecha_Hora', 'Producto', 'Cantidad', 'Precio_Unitario', 'Subtotal'];
    const rows = state.sales.map(s => [
      s.sale_id,
      `"${formatDate(s.created_at)}"`,
      `"${s.product.replace(/"/g, '""')}"`,
      s.quantity,
      s.unit_price,
      s.subtotal
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ventas_LaFarra_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* ================== EVENT LISTENERS ================== */
  function setupEventListeners() {
    // Autenticación: Tabs y Formularios
    document.getElementById('tab-login-btn').addEventListener('click', () => setAuthTab('login'));
    document.getElementById('tab-register-btn').addEventListener('click', () => setAuthTab('register'));
    document.getElementById('form-login').addEventListener('submit', handleLogin);
    document.getElementById('form-register').addEventListener('submit', handleRegister);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Enlaces de cambio en alertas de auth
    const btnGotoReg = document.getElementById('btn-goto-register');
    if (btnGotoReg) {
      btnGotoReg.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        setAuthTab('register');
        if (email) document.getElementById('reg-email').value = email;
      });
    }

    const btnGotoLogin = document.getElementById('btn-goto-login');
    if (btnGotoLogin) {
      btnGotoLogin.addEventListener('click', () => {
        const email = document.getElementById('reg-email').value;
        setAuthTab('login');
        if (email) document.getElementById('login-email').value = email;
      });
    }

    // Toggle Mostrar/Ocultar Contraseña
    function setupPwdToggle(btnId, inputId) {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (btn && input) {
        btn.addEventListener('click', () => {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.innerHTML = `<i class="fa-solid fa-${isPassword ? 'eye-slash' : 'eye'}"></i>`;
        });
      }
    }
    setupPwdToggle('btn-toggle-login-pwd', 'login-password');
    setupPwdToggle('btn-toggle-reg-pwd', 'reg-password');
    setupPwdToggle('btn-toggle-confirm-pwd', 'reg-confirm-password');

    // Medidor de fuerza y confirmación en tiempo real
    const regPwdInput = document.getElementById('reg-password');
    if (regPwdInput) {
      regPwdInput.addEventListener('input', (e) => {
        evaluatePasswordStrength(e.target.value);
        checkPasswordMatch();
      });
    }

    const regConfirmInput = document.getElementById('reg-confirm-password');
    if (regConfirmInput) {
      regConfirmInput.addEventListener('input', checkPasswordMatch);
    }

    document.getElementById('link-forgot-pwd').addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Recuperación de Contraseña', 'Por favor contacta al administrador del sistema en admin@lafarra.com para restablecer tu contraseña.', 'info');
    });

    const btnOpenRegFromView = document.getElementById('btn-open-register-from-view');
    if (btnOpenRegFromView) {
      btnOpenRegFromView.addEventListener('click', () => {
        document.getElementById('auth-overlay').classList.add('active');
        setAuthTab('register');
      });
    }

    // Navegación Sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) navigateTo(view);
      });
    });

    // Botones rápidos del Topbar
    document.getElementById('btn-topbar-sale').addEventListener('click', () => navigateTo('pos'));
    document.getElementById('btn-quick-entry').addEventListener('click', () => {
      navigateTo('inventory');
      document.getElementById('entry-quantity').focus();
    });
    document.getElementById('btn-quick-new-product').addEventListener('click', openCreateProduct);
    document.getElementById('btn-refresh-dashboard').addEventListener('click', loadDashboard);

    // POS
    document.getElementById('pos-search-input').addEventListener('input', (e) => {
      state.posSearchQuery = e.target.value;
      renderPosCatalog();
    });
    document.getElementById('btn-refresh-pos').addEventListener('click', async () => {
      const res = await API.getProducts(true);
      state.products = res.data || [];
      renderPosCatalog();
    });
    document.getElementById('btn-clear-cart').addEventListener('click', clearCart);
    document.getElementById('btn-submit-sale').addEventListener('click', processSale);

    // Productos
    document.getElementById('btn-open-create-product').addEventListener('click', openCreateProduct);
    document.getElementById('products-search-input').addEventListener('input', (e) => {
      state.productsSearchQuery = e.target.value;
      renderProductsTable();
    });
    document.getElementById('products-category-filter').addEventListener('change', (e) => {
      state.productsFilterCategory = e.target.value;
      renderProductsTable();
    });
    document.getElementById('products-include-inactive').addEventListener('change', (e) => {
      state.includeInactive = e.target.checked;
      renderProductsTable();
    });
    document.getElementById('btn-refresh-products').addEventListener('click', async () => {
      const res = await API.getProducts(true);
      state.products = res.data || [];
      renderProductsTable();
    });
    document.getElementById('form-product').addEventListener('submit', saveProduct);

    // Movimientos de Stock - Entradas
    const entrySelect = document.getElementById('entry-product-select');
    const entryQty = document.getElementById('entry-quantity');
    const entryProjected = document.getElementById('entry-projected-stock');

    function updateEntryPreview() {
      const opt = entrySelect.selectedOptions[0];
      const stock = opt ? Number(opt.dataset.stock || 0) : 0;
      const qty = Number(entryQty.value) || 0;
      if (!entrySelect.value) {
        entryProjected.value = '-';
      } else {
        entryProjected.value = `${stock} un. → ${stock + qty} un.`;
      }
    }
    entrySelect.addEventListener('change', updateEntryPreview);
    entryQty.addEventListener('input', updateEntryPreview);

    document.getElementById('form-stock-entry').addEventListener('submit', async (e) => {
      e.preventDefault();
      const prodId = entrySelect.value;
      const qty = entryQty.value;
      const note = document.getElementById('entry-note').value;

      try {
        await API.registerEntry(prodId, qty, note);
        showToast('Entrada Exitosa', `Se agregaron ${qty} unidades al inventario.`);
        document.getElementById('form-stock-entry').reset();
        entryProjected.value = '-';

        const prodRes = await API.getProducts(true);
        state.products = prodRes.data || [];
        updateSelectOptions();
        loadMovementsHistory();
      } catch (err) {
        showToast('Error en Entrada', err.message, 'danger');
      }
    });

    // Movimientos de Stock - Salidas
    const exitSelect = document.getElementById('exit-product-select');
    const exitQty = document.getElementById('exit-quantity');
    const exitProjected = document.getElementById('exit-projected-stock');

    function updateExitPreview() {
      const opt = exitSelect.selectedOptions[0];
      const stock = opt ? Number(opt.dataset.stock || 0) : 0;
      const qty = Number(exitQty.value) || 0;
      if (!exitSelect.value) {
        exitProjected.value = '-';
      } else {
        const remaining = stock - qty;
        exitProjected.value = `${stock} un. → ${remaining} un.`;
        if (remaining < 0) {
          exitProjected.style.color = 'var(--danger)';
        } else {
          exitProjected.style.color = 'var(--text-main)';
        }
      }
    }
    exitSelect.addEventListener('change', updateExitPreview);
    exitQty.addEventListener('input', updateExitPreview);

    document.getElementById('form-stock-exit').addEventListener('submit', async (e) => {
      e.preventDefault();
      const prodId = exitSelect.value;
      const qty = exitQty.value;
      const note = document.getElementById('exit-note').value;

      try {
        await API.registerExit(prodId, qty, note);
        showToast('Salida Registrada', `Se descontaron ${qty} unidades del inventario.`);
        document.getElementById('form-stock-exit').reset();
        exitProjected.value = '-';

        const prodRes = await API.getProducts(true);
        state.products = prodRes.data || [];
        updateSelectOptions();
        loadMovementsHistory();
      } catch (err) {
        showToast('Error en Salida', err.message, 'danger');
      }
    });

    document.getElementById('btn-refresh-movements').addEventListener('click', loadMovementsHistory);

    // Catálogos
    document.getElementById('btn-open-create-category').addEventListener('click', () => {
      document.getElementById('form-category').reset();
      openModal('modal-category');
    });
    document.getElementById('btn-open-create-supplier').addEventListener('click', () => {
      document.getElementById('form-supplier').reset();
      openModal('modal-supplier');
    });
    document.getElementById('form-category').addEventListener('submit', handleCreateCategory);
    document.getElementById('form-supplier').addEventListener('submit', handleCreateSupplier);

    // Reportes - Pestañas
    const btnRepSales = document.getElementById('btn-report-tab-sales');
    const btnRepInv = document.getElementById('btn-report-tab-inventory');
    const btnRepLow = document.getElementById('btn-report-tab-lowstock');

    const subSales = document.getElementById('report-sub-sales');
    const subInv = document.getElementById('report-sub-inventory');
    const subLow = document.getElementById('report-sub-lowstock');

    function setReportTab(tab) {
      btnRepSales.classList.toggle('active', tab === 'sales');
      btnRepInv.classList.toggle('active', tab === 'inv');
      btnRepLow.classList.toggle('active', tab === 'low');

      subSales.style.display = tab === 'sales' ? 'block' : 'none';
      subInv.style.display = tab === 'inv' ? 'block' : 'none';
      subLow.style.display = tab === 'low' ? 'block' : 'none';

      if (tab === 'sales') loadSalesReport();
      if (tab === 'inv') loadInventoryReport();
      if (tab === 'low') loadLowStockReport();
    }

    btnRepSales.addEventListener('click', () => setReportTab('sales'));
    btnRepInv.addEventListener('click', () => setReportTab('inv'));
    btnRepLow.addEventListener('click', () => setReportTab('low'));

    document.getElementById('btn-filter-sales').addEventListener('click', loadSalesReport);
    document.getElementById('btn-reset-sales-filter').addEventListener('click', () => {
      document.getElementById('report-sales-from').value = '';
      document.getElementById('report-sales-to').value = '';
      loadSalesReport();
    });
    document.getElementById('btn-export-sales-csv').addEventListener('click', exportSalesToCsv);
    document.getElementById('btn-filter-lowstock').addEventListener('click', loadLowStockReport);

    // Cerrar modales con Escape o haciendo clic afuera
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });
    document.querySelectorAll('.modal-backdrop').forEach(b => {
      b.addEventListener('click', (e) => {
        if (e.target === b) closeModals();
      });
    });
  }

  /* ================== INICIALIZACIÓN ================== */
  function init() {
    setupEventListeners();
    checkConnection();
    checkAuth();
    loadInitialData();

    // Verificación periódica de conexión cada 15s
    setInterval(checkConnection, 15000);
  }

  // API pública del objeto App
  return {
    init,
    navigateTo,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    openEditProduct,
    openStockEntryFor,
    toggleProductStatus,
    closeModals,
    prefillLogin
  };
})();

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', App.init);
