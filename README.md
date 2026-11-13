# EwuarSoft - Tienda y Licores La Farra
## GA7-220501096-AA4-EV03: Desarrollo del Front-End del Sistema de Información
**Aprendiz:** Edwar Montoya  
**Programa:** Tecnólogo en Análisis y Desarrollo de Software (ADSO) - SENA

---

## 1. Descripción del Proyecto

Aplicación web integral para la gestión comercial, control de inventarios, punto de venta (POS), control de usuarios y reportería de **Tienda y Licores La Farra**.

El sistema integra un **Front-End moderno, responsivo y completamente interactivo** conectado en tiempo real mediante una API REST en **Node.js/Express** con la base de datos relacional **MySQL**.

---

## 2. Características del Front-End Desarrollado

### 🔐 Módulo de Autenticación Completo (Registro e Inicio de Sesión)
- **Inicio de Sesión:**
  - Validación de campos obligatorios en tiempo real.
  - **Aviso específico cuando el usuario no existe:** Muestra una alerta dedicada: `"El usuario no existe. Verifica el correo electrónico o crea una cuenta nueva."` con botón de un solo clic para ir al formulario de registro con el correo ya pre-cargado.
  - **Aviso específico cuando la contraseña es errónea:** Muestra: `"Contraseña incorrecta. Por favor verifica tus credenciales e intenta de nuevo."`.
  - Botón interactivo para **Mostrar / Ocultar la contraseña (👁️)**.
  - Casilla de *"Recordar mi sesión"*.
  - Enlace de recuperación de contraseña con instrucciones de soporte.
  - **Accesos Rápidos Demo (1 Clic):** Botones para probar al instante como Administrador (`admin@lafarra.com` / `admin123`), Cajero (`cajero@lafarra.com` / `cajero123`) o Usuario (`edwar@lafarra.com` / `password123`).
- **Registro de Usuarios:**
  - Campos: Nombre completo, correo electrónico, selección de rol (*Administrador* o *Vendedor/Cajero*), contraseña y confirmación de contraseña.
  - **Medidor visual de fortaleza de contraseña** en tiempo real (*Débil, Aceptable, Segura, Muy Segura*).
  - **Comprobador instantáneo de coincidencia de contraseñas** con indicadores visuales verde/rojo.
  - **Control de duplicados:** Aviso inmediato si el correo ya fue registrado previamente en MySQL.
  - Al registrarse, el sistema inicia sesión de forma automática y accede al panel principal.
- **Gestión de Sesión:**
  - Perfil del usuario visible en la barra superior con avatar, iniciales, nombre y rol.
  - Botón de **Cerrar Sesión** con confirmación.
  - Vista de administración de usuarios para auditar las cuentas registradas en MySQL.

---

### 📊 Dashboard General & Métricas en Vivo
- Indicador de estado de conexión con la base de datos MySQL en tiempo real.
- 4 tarjetas estadísticas: Total de productos, total ventas acumuladas ($ COP), productos con alerta de bajo stock y total de categorías/proveedores.
- Listado de alertas inmediatas de inventario crítico con botón de reabastecimiento rápido.
- Historial de últimas ventas realizadas.

---

### 🛒 Punto de Venta (POS - Caja Registradora)
- Catálogo interactivo con tarjetas de producto, indicando SKU, categoría, precio de venta en pesos colombianos y existencias en stock.
- Buscador rápido por nombre o código SKU y filtros por categoría (chips interactivos).
- Carrito de venta en tiempo real: control de cantidades (+ / -) con validación automática que **no permite superar el stock real en bodega**.
- Procesamiento de venta con actualización atómica en MySQL (descuento de existencias y registro contable).
- Generación instantánea de **Ticket / Recibo de Venta Térmico** listo para imprimir (`window.print()`).

---

### 📦 Catálogo & Gestión de Productos
- Tabla dinámica con búsqueda instantánea, filtro por categoría y selector de activos/inactivos.
- Formulario modal para **Registrar Nuevo Producto** con selects vinculados a las categorías y proveedores de MySQL.
- Formulario modal para **Editar Producto** (precios, stock mínimo, descripción, SKU).
- Botón para dar de baja lógica (**Desactivar**) o volver a **Activar** un producto.

---

### 📥 Movimientos de Stock (Entradas y Salidas)
- Formulario de **Entrada de Mercancía (Compra a Proveedor)** con previsualización en vivo del stock proyectado.
- Formulario de **Salida Manual (Avería / Ajuste)** con validación estricta para evitar stock negativo.
- Tabla de historial de movimientos (`inventory_movements`) detallando tipo (ENTRADA, SALIDA, VENTA), fecha, cantidad y notas de auditoría.

---

### 🏷️ Gestión de Catálogos (Categorías y Proveedores)
- Listado y creación de nuevas categorías.
- Listado y creación de nuevos proveedores (con validación de teléfono y correo electrónico).
- Sincronización automática con los formularios de productos.

---

### 📈 Módulo de Reportes & Auditoría
- **Reporte de Ventas por Fechas:** Filtro por rango (`Desde` / `Hasta`), total recaudado, unidades vendidas y botón para **Exportar a CSV**.
- **Reporte de Inventario Valorizado:** Cálculo de inversión total (costo), valor total estimado de venta y ganancia potencial proyectada.
- **Reporte de Bajo Stock:** Filtro por umbral configurable para emitir órdenes de compra oportunas.

---

## 3. Cuentas de Acceso Configuradas

| Rol | Correo Electrónico | Contraseña | Permisos |
|---|---|---|---|
| **Administrador** | `admin@lafarra.com` | `admin123` | Acceso total al sistema, reportes, usuarios y catálogo |
| **Cajero** | `cajero@lafarra.com` | `cajero123` | Punto de Venta, inventarios y movimientos |
| **Edwar Montoya** | `edwar@lafarra.com` | `password123` | Administrador general |

*(También puedes registrar cualquier cuenta nueva desde el formulario de registro)*.

---

## 4. Instrucciones para Ejecutar el Proyecto

### Paso 1: Iniciar el Servidor Backend
Abre una terminal en la carpeta del backend:

```bash
cd "Edwar_Montoya_ GA7-220501096_AA5_EV03"
npm run dev
```

El servidor estará escuchando en:
```text
http://localhost:3000
```

### Paso 2: Abrir la Aplicación Front-End
Abre tu navegador e ingresa a:
```text
http://localhost:3000
```
*(O abre el archivo `frontend/index.html` con Live Server o directamente en el navegador)*.
