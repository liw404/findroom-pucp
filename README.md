# FindRoom

Plataforma web integral orientada a conectar a estudiantes de la Pontificia Universidad Católica del Perú (PUCP) con arrendadores verificados (SUNARP / RENIEC) en zonas aledañas al campus universitario (San Miguel, Pueblo Libre, Jesús María, Magdalena y Cercado de Lima).

El sistema mitiga la informalidad e inseguridad en los alquileres universitarios mediante la verificación registral de propietarios, protección de datos de contacto institucional y un flujo de comunicación condicionado a la aprobación de solicitudes formales.

---

## Demo en Producción

- **Aplicación Web:** [https://findroom-pucp.netlify.app/](https://findroom-pucp.netlify.app/)
- **Selector de Roles (`DemoRoleSwitcher`):** Permite explorar los flujos completos de la plataforma alternando perfiles de prueba preconfigurados con un solo clic:
  - **Estudiante PUCP:** Mateo Salazar (Facultad de Ciencias e Ingeniería)
  - **Arrendador Verificado:** Elena Vargas (Titular acreditado con inmuebles activos)

---

## Arquitectura y Stack Tecnológico

### Frontend
- **Core:** React 18, TypeScript, Vite.
- **Enrutamiento:** `react-router-dom` con protección de rutas según rol.
- **Diseño e Interfaz:** Tailwind CSS, `lucide-react` para iconografía técnica y `sonner` para retroalimentación asíncrona.
- **Patrón de Desacoplamiento (Adapter Pattern):**
  - `ServiceFactory`: Abstracción que conmuta de forma transparente entre consumo de API REST en entornos locales y persistencia reactiva en `localStorage` (`LocalMockService`) para el despliegue estático de demostración en producción.

### Backend y Persistencia
- **Servidor:** Node.js, Express y TypeScript.
- **Persistencia y ORM:** PostgreSQL gestionado a través de Prisma ORM.
- **Integridad y Modelado:** Relaciones de integridad referencial para usuarios, inmuebles, solicitudes de visita y evaluaciones cruzadas.
---

## Módulos y Funcionalidades

### 1. Portal del Estudiante
- **Búsqueda Omnibox y Filtros:** Filtrado en tiempo real por texto libre, distrito, rango de precios con slider numérico, amoblado y tipo de baño (privado o compartido).
- **Métricas de Proximidad:** Estimación de distancias en kilómetros y tiempos a pie hacia los accesos principales del campus PUCP.
- **Colección de Favoritos:** Guardado persistente de habitaciones con vector tipo marcador/bookmark estilo Instagram.
- **Privacidad de Contacto:** Ocultación del canal directo de WhatsApp del arrendador hasta que una solicitud sea formalmente aprobada.
- **Seguimiento de Solicitudes:** Monitor en tiempo real de estados (`Pendiente`, `Aceptada`, `Rechazada`) con control de reenvíos para mitigar spam.
- **Sistema de Reputación:** Calificación sujeta a la finalización de un contrato de arriendo, con validación de longitud obligatoria (30 a 300 caracteres) en valoraciones bajas (<= 2 estrellas).

### 2. Panel del Arrendador
- **Mis Propiedades:** Panel privado con toggle para alternar entre `Disponible` y `Alquilado`, editor completo y formulario para publicar nuevas habitaciones con subida y previsualización de fotografías.
- **Solicitudes Recibidas:** Vista dedicada para evaluar postulaciones de estudiantes en tiempo real y habilitar el contacto por WhatsApp al aceptar.
- **Historial de Inquilinos:** Espacio exclusivo e independiente para consultar contratos pasados y emitir calificaciones de convivencia al estudiante tras culminar el arriendo.
- **Ficha de Identidad del Postulante:** Modal centrado con difuminado translúcido (*frosted glass*) que expone nombre, facultad, tiempo registrado y promedio de estrellas, restringiendo datos sensibles (código PUCP y correo institucional).
- **Vista de Mercado:** Exploración del catálogo de habitaciones con botones de postulación deshabilitados para el rol propietario.

---

## Estructura del Proyecto

```text
FindRoom/
├── frontend/                 # Aplicación cliente SPA
│   ├── public/
│   │   └── _redirects        # Reglas de redirección SPA para Netlify
│   ├── src/
│   │   ├── components/       # Modales, selectores de rol y layouts
│   │   ├── hooks/            # useFavorites, useRequests (almacén reactivo)
│   │   ├── pages/            # Vistas de catálogo, detalle y tableros por rol
│   │   ├── services/         # ServiceFactory, adaptadores HTTP/Mock y seed data
│   │   └── types/            # Definiciones TypeScript de entidades
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # API RESTful
│   ├── prisma/               # Esquema relacional, migraciones y seed
│   ├── src/                  # Rutas, controladores y adaptadores de integración
│   └── package.json
├── docker-compose.yml        # Contenedor de PostgreSQL para desarrollo local
├── .gitignore                # Exclusiones de dependencias y archivos de desarrollo
└── README.md
```

---

## Instalación y Ejecución Local

### Prerrequisitos
- Node.js 18.x o superior
- npm
- Docker y Docker Compose (requerido para el entorno backend relacional)

### 1. Clonar el repositorio
```bash
git clone https://github.com/liw404/findroom-pucp.git
cd findroom-pucp
```

### 2. Ejecución del Frontend (Modo Demo Standalone)
Para explorar la aplicación en modo cliente estático con datos simulados y persistencia local reactiva:
```bash
cd frontend
npm install
npm run dev
```
La aplicación iniciará en `http://localhost:5173`.

### 3. Ejecución Full-Stack (Backend con PostgreSQL)
Para inicializar el entorno completo con base de datos relacional:
```bash
# 1. Levantar el contenedor de PostgreSQL (desde la raíz)
docker compose up -d

# 2. Inicializar el servidor backend
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev

# 3. Inicializar el cliente web (en otra terminal)
cd frontend
npm install
npm run dev
```

---

## Licencia

Proyecto distribuido bajo Licencia MIT con fines académicos.
