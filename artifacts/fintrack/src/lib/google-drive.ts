const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const APP_FILE_NAME = "fintrack-data.json";
const APP_MIME = "application/json";
const APP_TAG_KEY = "fintrackApp";
const APP_TAG_VALUE = "true";

declare global {
  interface Window {
    google?: any;
  }
}

let accessToken: string | null = null;
let tokenClient: any = null;
let tokenExpiresAt: number | null = null;

function getClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Falta VITE_GOOGLE_CLIENT_ID");
  return clientId;
}

async function waitForGoogleIdentityServices(timeoutMs = 10000): Promise<void> {
  const start = Date.now();

  while (!window.google?.accounts?.oauth2) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Google Identity Services no cargó a tiempo");
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function initGoogleAuth() {
  await waitForGoogleIdentityServices();

  if (tokenClient) return;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: getClientId(),
    scope: DRIVE_SCOPE,
    callback: () => {},
  });
}

function setToken(resp: any) {
  accessToken = resp?.access_token ?? null;

  if (resp?.expires_in) {
    tokenExpiresAt = Date.now() + resp.expires_in * 1000;
  } else {
    tokenExpiresAt = null;
  }
}

export async function loginWithGoogleDrive(): Promise<void> {
  await initGoogleAuth();

  await new Promise<void>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp?.error) {
        reject(new Error(resp.error));
        return;
      }

      if (resp?.access_token) {
        setToken(resp);
        resolve();
      } else {
        reject(new Error("No se obtuvo access token"));
      }
    };

    tokenClient.requestAccessToken({
      prompt: "select_account",
    });
  });
}

export async function ensureValidAccessToken(): Promise<void> {
  await initGoogleAuth();

  const stillValid =
    accessToken &&
    tokenExpiresAt &&
    Date.now() < tokenExpiresAt - 60_000;

  if (stillValid) return;

  await new Promise<void>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp?.error) {
        reject(new Error(resp.error));
        return;
      }

      if (resp?.access_token) {
        setToken(resp);
        resolve();
      } else {
        reject(new Error("No se obtuvo access token"));
      }
    };

    tokenClient.requestAccessToken({
      prompt: "",
    });
  });
}

export async function logoutGoogleDrive() {
  const token = accessToken;
  accessToken = null;
  tokenExpiresAt = null;

  if (token && window.google?.accounts?.oauth2?.revoke) {
    await new Promise<void>((resolve) => {
      window.google.accounts.oauth2.revoke(token, () => resolve());
    });
  }
}

async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  await ensureValidAccessToken();

  const makeRequest = () =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await makeRequest();

  if (res.status === 401) {
    accessToken = null;
    tokenExpiresAt = null;
    await ensureValidAccessToken();
    res = await makeRequest();
  }

  return res;
}

export async function findAppFile(): Promise<string | null> {
  const q = encodeURIComponent(
    `appProperties has { key='${APP_TAG_KEY}' and value='${APP_TAG_VALUE}' } and trashed=false`
  );

  const res = await authFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,appProperties)`
  );

  if (!res.ok) {
    throw new Error("No se pudo buscar archivo en Drive");
  }

  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function createAppFile(initialData: unknown): Promise<string> {
  const metadata = {
    name: APP_FILE_NAME,
    mimeType: APP_MIME,
    appProperties: {
      [APP_TAG_KEY]: APP_TAG_VALUE,
    },
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

  const res = await authFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo crear archivo en Drive: ${text}`);
  }

  const data = await res.json();
  return data.id;
}

export async function loadDriveData(fileId: string) {
  const res = await authFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo leer archivo desde Drive: ${text}`);
  }

  return res.json();
}

export async function saveDriveData(fileId: string, data: unknown) {
  const payload = {
    ...((data as Record<string, unknown>) ?? {}),
    updatedAt: new Date().toISOString(),
  };

  const res = await authFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": APP_MIME,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo guardar archivo en Drive: ${text}`);
  }
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
