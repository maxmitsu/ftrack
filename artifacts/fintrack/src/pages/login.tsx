import { useState } from "react";
import { Cloud, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  initGoogleDriveAuth,
  loginWithGoogleDrive,
  getGoogleDriveStatus,
} from "@workspace/api-client-react";

type LoginProps = {
  onLoginSuccess: () => void;
};

export default function Login({ onLoginSuccess }: LoginProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const resetLoginState = () => {
    setBusy(false);
    setError("");
    setAttempt((n) => n + 1);
  };

  const handleLogin = async () => {
    if (busy) return;

    try {
      setBusy(true);
      setError("");

      // Reinicializa el flujo en cada intento
      initGoogleDriveAuth();

      await Promise.race([
        loginWithGoogleDrive(),
        new Promise((_, reject) =>
          setTimeout(() => {
            reject(new Error("La ventana de inicio de sesión tardó demasiado. Ciérrala y vuelve a intentarlo."));
          }, 8000)
        ),
      ]);

      const status = getGoogleDriveStatus();

      if (status.connected) {
        onLoginSuccess();
        return;
      }

      setError("No se pudo iniciar sesión con Google.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Inicio de sesión cancelado o fallido."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Cloud className="w-7 h-7 text-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">FinTrack</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Inicia sesión con Google para acceder a tus datos guardados en Drive.
            </p>
          </div>

          <Button
            key={attempt}
            onClick={handleLogin}
            disabled={busy}
            className="w-full"
          >
            {busy ? "Conectando..." : "Iniciar sesión con Google"}
          </Button>

          {busy ? (
            <Button
              type="button"
              variant="outline"
              onClick={resetLoginState}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
