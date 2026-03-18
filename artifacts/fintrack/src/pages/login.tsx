import { useState } from "react";
import { Cloud } from "lucide-react";
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

  const handleLogin = async () => {
    if (busy) return;

    try {
      setBusy(true);
      setError("");

      initGoogleDriveAuth();
      await loginWithGoogleDrive();

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

          <Button onClick={handleLogin} disabled={busy} className="w-full">
            {busy ? "Conectando..." : "Iniciar sesión con Google"}
          </Button>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
