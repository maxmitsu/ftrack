# FinTrack en GitHub Pages + Google Drive

Este repo ya quedó adaptado para:

- publicar el frontend en **GitHub Pages**
- usar **Google Drive appDataFolder** como almacenamiento de datos
- evitar backend y PostgreSQL en producción

## Cómo funciona

- La app corre 100% en el navegador.
- Los datos se guardan primero en `localStorage`.
- Cuando conectas Google Drive desde **Configuración**, la app crea o actualiza `fintrack-data.json` en tu carpeta privada `appDataFolder` de Drive.
- GitHub Pages sirve solo el frontend estático.

## 1. Crear el OAuth Client ID de Google

En Google Cloud:

1. Crea o selecciona un proyecto.
2. Habilita **Google Drive API**.
3. Crea credenciales tipo **OAuth Client ID** para aplicación web.
4. Añade como **Authorized JavaScript origin**:
   - `https://TU_USUARIO.github.io`
   - y si pruebas local, `http://localhost:4173`
5. Guarda el Client ID.

## 2. Guardar el secret en GitHub

En GitHub:

- Ve a **Settings > Secrets and variables > Actions**
- Crea un secret llamado `VITE_GOOGLE_CLIENT_ID`
- Pega el Client ID de Google

## 3. Activar GitHub Pages

En GitHub:

- Ve a **Settings > Pages**
- En **Build and deployment**, selecciona **GitHub Actions**

El workflow ya existe en `.github/workflows/deploy-pages.yml`.

## 4. Publicar

```bash
git add .
git commit -m "Adapt GitHub Pages + Google Drive"
git push origin main
```

Cuando termine el workflow, la app quedará publicada en:

```text
https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/
```

## 5. Desarrollo local

```bash
pnpm install
cp artifacts/fintrack/.env.example artifacts/fintrack/.env
# edita VITE_GOOGLE_CLIENT_ID dentro de artifacts/fintrack/.env
pnpm --filter @workspace/fintrack dev
```

## Limitaciones

- Google Drive sync requiere que el usuario autorice la app en el navegador.
- Sin `VITE_GOOGLE_CLIENT_ID`, la app sigue funcionando localmente con `localStorage`.
- Esto reemplaza el backend Express para el despliegue en GitHub Pages.
