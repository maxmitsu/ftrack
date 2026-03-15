const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const APP_FILE_NAME = "fintrack-data.json";
const APP_MIME = "application/json";

declare global {
  interface Window {
    google?: any;
  }
}

let accessToken: string | null = null;
let tokenClient: any = null;

export function initGoogleAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Falta VITE_GOOGLE_CLIENT_ID");
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services no cargó");
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: (resp: any) => {
      accessToken = resp?.access_token ?? null;
    },
  });
}

export async function loginWithGoogleDrive(): Promise<void> {
  if (!tokenClient) initGoogleAuth();

  await new Promise<void>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp?.access_token) {
        accessToken = resp.access_token;
        resolve();
      } else {
        reject(new Error("No se obtuvo access token"));
      }
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

function authHeaders(extra: Record<string, string> = {}) {
  if (!accessToken) throw new Error("No autenticado con Google");
  return {
    Authorization: `Bearer ${accessToken}`,
    ...extra,
  };
}

export async function findAppFile(): Promise<string | null> {
  const q = encodeURIComponent(`name='${APP_FILE_NAME}' and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("No se pudo buscar archivo en Drive");
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function createAppFile(initialData: unknown): Promise<string> {
  const metadata = {
    name: APP_FILE_NAME,
    mimeType: APP_MIME,
  };

  const boundary = "fintrack_boundary";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${APP_MIME}\r\n\r\n` +
    `${JSON.stringify(initialData)}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: authHeaders({
        "Content-Type": `multipart/related; boundary=${boundary}`,
      }),
      body,
    }
  );

  if (!res.ok) throw new Error("No se pudo crear archivo en Drive");
  const data = await res.json();
  return data.id;
}

export async function loadDriveData(fileId: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("No se pudo leer archivo desde Drive");
  return res.json();
}

export async function saveDriveData(fileId: string, data: unknown) {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": APP_MIME }),
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("No se pudo guardar archivo en Drive");
}

export async function ensureAppFile(): Promise<string> {
  const existing = await findAppFile();
  if (existing) return existing;

  return createAppFile({
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    recurring: [],
    categories: [],
    updatedAt: new Date().toISOString(),
  });
}
