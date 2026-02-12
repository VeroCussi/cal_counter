# Macros & Peso - PWA

Una aplicación web progresiva (PWA) para trackear macros nutricionales y peso corporal, con funcionalidad offline-first.

## Características

- ✅ Autenticación con email/password y PIN opcional
- ✅ Registro diario de comidas (desayuno, comida, cena, snacks)
- ✅ Cálculo automático de macros (calorías, proteína, carbohidratos, grasa)
- ✅ Registro de peso diario con gráficos
- ✅ Funcionamiento offline-first con IndexedDB
- ✅ Sincronización automática con MongoDB Atlas cuando hay conexión
- ✅ Búsqueda de alimentos desde Open Food Facts y USDA FoodData Central
- ✅ Alimentos favoritos personalizados
- ✅ Objetivos personalizables por usuario

## Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: MongoDB Atlas (Mongoose)
- **Offline**: IndexedDB (Dexie)
- **Gráficos**: Recharts
- **PWA**: next-pwa
- **Validación**: Zod

## Requisitos Previos

- Node.js 18+ y npm
- MongoDB Atlas (cuenta gratuita disponible)
- (Opcional) USDA API Key para búsqueda avanzada de alimentos

## Instalación

1. Clona el repositorio:
```bash
git clone <repo-url>
cd cal_counter
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.local.example .env.local
```

Edita `.env.local` y configura:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cal_counter?retryWrites=true&w=majority
JWT_SECRET=tu-secret-jwt-super-seguro
USDA_API_KEY=tu-usda-api-key-opcional
NODE_ENV=development
```

4. (Opcional) Crea iconos PWA:
   - Crea `public/icon-192.png` (192x192px)
   - Crea `public/icon-512.png` (512x512px)
   - O usa un generador online como [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)

5. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Uso

### Registro y Login

1. Ve a `/register` para crear una cuenta
2. Proporciona email, contraseña, nombre y PIN (4-6 dígitos)
3. El PIN se usa para bloqueo rápido de la app

### Trackear Comidas

1. En la página "Hoy" (`/today`), selecciona una fecha
2. Haz clic en "+ Añadir alimento" en cualquier comida (desayuno, comida, cena, snacks)
3. Busca un alimento en tus favoritos o busca online
4. Ingresa la cantidad en gramos
5. La app calcula automáticamente los macros

### Gestionar Alimentos

1. Ve a "Alimentos" (`/foods`)
2. Crea alimentos personalizados con macros por 100g
3. Busca alimentos online desde Open Food Facts o USDA
4. Guarda alimentos encontrados en tus favoritos

### Registrar Peso

1. Ve a "Peso" (`/weight`)
2. Ingresa tu peso del día
3. Visualiza el gráfico de evolución

### Funcionamiento Offline

- La app funciona completamente offline
- Todas las operaciones se guardan localmente en IndexedDB
- Cuando vuelves a tener conexión, se sincroniza automáticamente
- Puedes forzar sincronización con el botón "Sincronizar"

## Estructura del Proyecto

```
cal_counter/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── today/             # Página principal (comidas del día)
│   ├── foods/             # Gestión de alimentos
│   ├── weight/            # Registro de peso
│   └── settings/          # Ajustes
├── components/            # Componentes React
├── lib/                   # Utilidades y servicios
│   ├── db.ts             # Conexión MongoDB
│   ├── auth.ts           # Autenticación JWT
│   ├── validations.ts    # Schemas Zod
│   └── sync/             # Servicio de sincronización
├── models/               # Modelos Mongoose
├── hooks/                # React hooks personalizados
└── types/                # TypeScript types
```

## Sincronización Offline

La app usa un patrón "outbox" para sincronización:

1. **Escritura local primero**: Todas las operaciones se guardan en IndexedDB
2. **Outbox**: Si falla la API o está offline, se crea un item en la cola de sincronización
3. **Sync automático**: Al volver online, se procesan los items pendientes
4. **Resolución de conflictos**: Last-write-wins usando timestamps `updatedAt`

## API Externa

### Open Food Facts
- Búsqueda por texto: `/api/external/off/search?q=...`
- Búsqueda por código de barras: `/api/external/off/barcode/:ean`

### USDA FoodData Central
- Búsqueda: `/api/external/usda/search?q=...`
- Obtener alimento: `/api/external/usda/food/:fdcId`

## 🚀 Deployment

### Deployment en Vercel

Esta aplicación está optimizada para deployment en Vercel. Para instrucciones detalladas, consulta [DEPLOYMENT.md](./DEPLOYMENT.md).

**Resumen rápido:**

1. **Configura MongoDB Atlas:**
   - Crea un cluster gratuito
   - Configura Network Access (permite 0.0.0.0/0 o IPs de Vercel)
   - Obtén la connection string

2. **Despliega en Vercel:**
   - Conecta tu repositorio
   - Configura variables de entorno:
     - `MONGODB_URI` - Connection string de MongoDB
     - `JWT_SECRET` - Secret de al menos 32 caracteres
     - `NODE_ENV=production`
     - `USDA_API_KEY` (opcional)
     - `OFF_CONTACT_EMAIL` (opcional)
   - Haz clic en Deploy

3. **Verifica:**
   - Visita `/api/health` para verificar el estado
   - Prueba registro y login

Para más detalles, consulta la [guía completa de deployment](./DEPLOYMENT.md).

## Desarrollo

### Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm start` - Servidor de producción
- `npm run lint` - Linter
- `npm test` - Ejecutar tests

### Próximas Mejoras (Post-MVP)

- [ ] Escáner de código de barras con cámara
- [ ] Recetas (combinar múltiples foods)
- [ ] Reconocimiento de fotos de alimentos
- [ ] Historial de búsquedas
- [ ] Estadísticas avanzadas (promedios semanales, tendencias)
- [ ] Export a CSV/PDF
- [ ] Modo oscuro
- [ ] Multi-idioma

## Notas

- El PIN es un segundo factor local, no reemplaza al login
- Los alimentos se normalizan al guardar desde APIs externas
- La app está optimizada para mobile-first
- El service worker se registra automáticamente en producción
- El middleware usa runtime Node.js (no Edge) debido a dependencias de jsonwebtoken

## Solución de Problemas

### Error de conexión a MongoDB
- Verifica que `MONGODB_URI` esté correctamente configurado
- Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas

### Warnings de Edge Runtime
- Son normales y no afectan la funcionalidad
- El middleware usa Node.js runtime para compatibilidad con jsonwebtoken

### Service Worker no se registra
- Solo se registra en producción (`npm run build && npm start`)
- En desarrollo, el PWA está deshabilitado por defecto

## Licencia

MIT
