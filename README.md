# 💊 CIMA Watch

**Monitor de Desabastecimientos de Medicamentos en España**

Aplicación web que consulta la API oficial de la AEMPS (CIMA) para visualizar medicamentos en situación de desabastecimiento. Pensada para servicios de farmacia hospitalaria.

## ✨ Características

- 🔍 **Buscador en tiempo real** — Filtra por nombre o Código Nacional (CN).
- 🏥 **Integración con Catálogo Hospitalario** — Sube tu inventario (Excel/CSV) para identificar fármacos afectados en tu centro.
- 🚦 **Alertas Prioritarias** — Identifica automáticamente desabastecimientos críticos sin alternativa terapéutica.
- 📧 **Informe Diario por Email** — Recibe cada mañana un email con los nuevos desabastecimientos, los que continúan y los restablecidos.
- ✅ **Gestión de medicamentos** — Marca medicamentos como "Gestionados" y añade notas de seguimiento.
- 📱 **Diseño Responsive** — Interfaz limpia con soporte dark mode.

## 🛠️ Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Frontend | React 19 + Vite |
| Estilos | CSS con Variables + Dark Mode |
| Iconos | Lucide React |
| Excel | SheetJS (xlsx) |
| Despliegue Web | Vercel (gratis) |
| Base de datos | Supabase (gratis) |
| Email diario | GitHub Actions + Nodemailer + Gmail |

---

## 🚀 Instalación Local (Desarrollo)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/CIMA-Watch.git
cd CIMA-Watch

# 2. Instalar dependencias
npm install

# 3. Ejecutar servidor de desarrollo
npm run dev

# 4. Construir para producción
npm run build
```

> La app funciona sin configurar las notificaciones por email. El panel de email simplemente no aparecerá hasta que configures Supabase.

---

## 🌐 Despliegue en Producción (Vercel)

### Paso 1: Subir a GitHub

Sube el código a un repositorio de GitHub (público o privado).

### Paso 2: Desplegar en Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com) (gratis).
2. Click en **"Import Project"** → selecciona tu repositorio.
3. Vercel detectará automáticamente que es un proyecto Vite.
4. Click en **Deploy**. El archivo `vercel.json` incluido configura el proxy a la API de CIMA.

> ⚠️ **GitHub Pages no funciona** para esta app porque no soporta el proxy API necesario para conectar con CIMA.

---

## 📧 Configuración de Alertas por Email (Opcional)

Esta funcionalidad envía un correo diario a las 8:00 AM (hora Madrid) con 3 secciones:
- 🆕 **Nuevos desabastecimientos** — tarjeta completa con CN, nombre, fechas, observaciones AEMPS y nivel de criticidad
- ⚠️ **Medicamentos que continúan** en desabastecimiento — misma información detallada
- ✅ **Medicamentos restablecidos** — solo nombre y código nacional

Solo informa de los medicamentos que coinciden con el catálogo del hospital.

### 🔒 Seguridad

La arquitectura está diseñada para que **los datos sensibles nunca se expongan al navegador**:
- Los emails y datos del catálogo se almacenan en Supabase y solo son accesibles mediante la `service_role key` (servidor).
- La `anon key` (visible en el frontend) **no tiene permisos** para leer ni escribir las tablas.
- Toda la comunicación con Supabase pasa por rutas API del servidor (Vercel serverless functions).
- Las credenciales de Gmail solo existen en GitHub Secrets, nunca en el código.

### Requisitos (todos gratuitos)

| Servicio | Tier gratuito |
|----------|--------------|
| [Supabase](https://supabase.com) | 500MB, 50K filas |
| Gmail | 500 emails/día |
| GitHub Actions | 2000 min/mes |

### Paso 1: Configurar Supabase

1. Regístrate en [supabase.com](https://supabase.com) (puedes usar tu cuenta de GitHub).
2. Crea un nuevo proyecto:
   - **Name**: `cima-watch`
   - **Region**: `West EU (Ireland)` (recomendado desde España)
3. Ve a **SQL Editor** → **New query** → pega el contenido de [`scripts/supabase-setup.sql`](scripts/supabase-setup.sql) → **Run**.
4. Supabase mostrará un aviso de "Query has destructive operation" — es normal, **confirma la ejecución**.
5. Ve a **Settings** → **API** y copia:
   - `Project URL`
   - `anon public key`
   - `service_role key` (click en "Reveal" para verla)

> ⚠️ La `service_role key` es secreta. No la compartas ni la pongas en el código frontend.

### Paso 2: Configurar Gmail

1. Accede a [myaccount.google.com](https://myaccount.google.com) → **Seguridad**.
2. Activa la **Verificación en dos pasos** (si no lo está).
3. Ve a **Contraseñas de aplicación** ([enlace directo](https://myaccount.google.com/apppasswords)).
4. Crea una nueva con nombre `CIMA Watch`.
5. Copia la contraseña de 16 caracteres.

### Paso 3: Configurar Secrets en GitHub

En tu repositorio → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Valor |
|--------|-------|
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key de Supabase |
| `GMAIL_USER` | Tu dirección de Gmail |
| `GMAIL_APP_PASSWORD` | Contraseña de app de Gmail |

### Paso 4: Configurar Variables en Vercel

En Vercel → tu proyecto → **Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Project URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon public key de Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key de Supabase |

Tras añadir las variables, haz un **Redeploy** del proyecto.

### Paso 5: Activar las alertas

1. Abre la web desplegada.
2. Sube tu catálogo de medicamentos (Excel/CSV).
3. Abre el panel **"Alertas por Email"**.
4. Añade las direcciones de correo de los destinatarios.
5. Click en **"Guardar y Activar Alertas"**.
6. Para probar: ve a GitHub → **Actions** → **Daily Shortage Email Report** → **Run workflow**.

---

## 📁 Estructura del Proyecto

```
CIMA-Watch/
├── api/
│   └── save-config.js          # Serverless function (Vercel)
├── .github/workflows/
│   └── daily-email.yml          # Cron diario (GitHub Actions)
├── scripts/
│   ├── check-shortages.js       # Script de comprobación y envío
│   ├── email-template.js        # Plantilla HTML del email
│   └── supabase-setup.sql       # SQL para crear tablas
├── src/
│   ├── components/
│   │   ├── CatalogUpload.jsx    # Subida de catálogo hospitalario
│   │   ├── EmailConfig.jsx      # Configuración de alertas por email
│   │   ├── ErrorBoundary.jsx    # Manejo de errores
│   │   ├── Filters.jsx          # Barra de búsqueda y filtros
│   │   ├── Header.jsx           # Cabecera
│   │   ├── ShortageCard.jsx     # Tarjeta de medicamento
│   │   └── ShortageList.jsx     # Lista de resultados
│   ├── lib/
│   │   └── supabase.js          # Cliente Supabase
│   ├── services/
│   │   └── cimaService.js       # Servicio API CIMA
│   ├── utils/
│   │   ├── dateUtils.js         # Formateo de fechas
│   │   └── shortageUtils.js     # Lógica de criticidad
│   ├── App.jsx                  # Componente principal
│   ├── index.css                # Estilos globales
│   └── main.jsx                 # Punto de entrada
├── vercel.json                  # Proxy API + routes
└── package.json
```

---

## 📄 Licencia

Este proyecto utiliza datos públicos de la [API de CIMA](https://cima.aemps.es) — AEMPS (Agencia Española de Medicamentos y Productos Sanitarios).
