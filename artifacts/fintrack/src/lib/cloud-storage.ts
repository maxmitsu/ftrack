import {
  ensureAppFile,
  initGoogleAuth,
  loadDriveData,
  loginWithGoogleDrive,
  logoutGoogleDrive,
  saveDriveData,
} from "./google-drive";

const FILE_ID_KEY = "fintrack_drive_file_id";
const STATE_KEY = "fintrack_state";

export async function connectGoogleDrive() {
  await initGoogleAuth();
  await loginWithGoogleDrive();

  const fileId = await ensureAppFile();
  localStorage.setItem(FILE_ID_KEY, fileId);
  return fileId;
}

export async function disconnectGoogleDrive() {
  await logoutGoogleDrive();
  localStorage.removeItem(FILE_ID_KEY);
}

export function getDriveFileId() {
  return localStorage.getItem(FILE_ID_KEY);
}

export function getLocalState() {
  return JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
}

export function setLocalState(data: unknown) {
  localStorage.setItem(STATE_KEY, JSON.stringify(data));
}

export async function pullCloudState() {
  const fileId = getDriveFileId();
  if (!fileId) throw new Error("No hay archivo vinculado");

  const data = await loadDriveData(fileId);
  setLocalState(data);
  return data;
}

export async function pushCloudState(data?: unknown) {
  const fileId = getDriveFileId();
  if (!fileId) throw new Error("No hay archivo vinculado");

  const payload = data ?? getLocalState();
  await saveDriveData(fileId, payload);
}
