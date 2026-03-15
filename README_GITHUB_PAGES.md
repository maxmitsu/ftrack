# FinTrack para GitHub Pages + Google Drive

## Qué hace esta versión
- Usa GitHub Pages para publicar solo el frontend.
- Guarda los datos localmente en el navegador.
- Permite iniciar sesión con Google Drive y sincronizar un archivo `fintrack-data.json`.
- No necesita backend ni PostgreSQL para funcionar en producción.

## Antes de subir a GitHub
1. Crea un OAuth Client ID de tipo **Web application** en Google Cloud.
2. Activa la **Google Drive API**.
3. Agrega este origen autorizado:
   - `https://TU_USUARIO.github.io`
4. Guarda el Client ID en el repo:
   - `Settings > Secrets and variables > Actions > New repository secret`
   - Nombre: `VITE_GOOGLE_CLIENT_ID`

## Publicar
1. Sube todo el contenido del proyecto al repositorio.
2. Asegúrate de que el repo se llame como quieres publicarlo, por ejemplo `ftrack`.
3. En `Settings > Pages`, selecciona `GitHub Actions` como fuente.
4. Haz push a `main`.

## Uso
1. Abre tu sitio en GitHub Pages.
2. Ve a **Configuración**.
3. Pulsa **Iniciar sesión con Google**.
4. Pulsa **Guardar en Drive** para crear o actualizar el archivo en tu Drive.
5. Pulsa **Cargar desde Drive** para recuperar la última copia.

## Nota
No pude validar un build final aquí porque este entorno no puede descargar dependencias de npm. Esta entrega incluye los cambios de código y el workflow de GitHub Actions para que GitHub haga la compilación por ti.
