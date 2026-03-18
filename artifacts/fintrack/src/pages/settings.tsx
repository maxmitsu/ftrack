import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
  getListAccountsQueryKey,
  getListBudgetsQueryKey,
  getListGoalsQueryKey,
  getListRecurringQueryKey,
  getListTransactionsQueryKey,
  initGoogleDriveAuth,
  loginWithGoogleDrive,
  syncStateFromGoogleDrive,
  syncStateToGoogleDrive,
  getGoogleDriveStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Trash2,
  Tags,
  Cloud,
  Download,
  Upload,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCategoryIcon } from "@/lib/utils";
import { disconnectGoogleDrive } from "@/lib/cloud-storage";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useListCategories();

  const [catName, setCatName] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(getGoogleDriveStatus());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      initGoogleDriveAuth();
      setCloudStatus(getGoogleDriveStatus());
    } catch {
      // Se inicializa cuando el usuario pulsa el botón.
    }
  }, []);

  const refreshCloudStatus = () => {
    setCloudStatus(getGoogleDriveStatus());
  };

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListRecurringQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }),
    ]);
  };

  const createMutation = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "Categoría agregada" });
        setCatName("");
      },
    },
  });

  const deleteMutation = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "Categoría eliminada" });
      },
    },
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    createMutation.mutate({ data: { name: catName.trim() } });
  };

  const handleConnect = async () => {
    try {
      setCloudBusy(true);
      await loginWithGoogleDrive();
      refreshCloudStatus();

      toast({
        title: "Google Drive conectado",
        description: "La sesión quedó iniciada y lista para sincronizar.",
      });
    } catch (error) {
      toast({
        title: "No se pudo conectar con Google Drive",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const handleUpload = async () => {
    try {
      setCloudBusy(true);
      await syncStateToGoogleDrive();
      refreshCloudStatus();

      const now = new Date();
      setLastSavedAt(now.toLocaleString());

      toast({
        title: "Guardado completado",
        description: "Tus datos se sincronizaron con Google Drive.",
      });
    } catch (error) {
      toast({
        title: "No se pudieron guardar los datos",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const handleDownload = async () => {
    try {
      setCloudBusy(true);
      await syncStateFromGoogleDrive();
      refreshCloudStatus();
      await invalidateAll();

      toast({
        title: "Carga completada",
        description: "Tus datos se cargaron desde Google Drive.",
      });
    } catch (error) {
      toast({
        title: "No se pudieron cargar los datos",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      setCloudBusy(true);

      disconnectGoogleDrive();
      setCloudStatus({ connected: false, hasFile: false });
      setLastSavedAt(null);

      toast({
        title: "Sesión cerrada",
        description: "Se desconectó Google Drive correctamente.",
      });

      window.location.reload();
    } finally {
      setCloudBusy(false);
    }
  };

  return (
    <Layout title="Configuración">
      <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Google Drive
            </CardTitle>
            <CardDescription>
              Inicia sesión con Google y guarda toda tu información en un archivo
              JSON dentro de tu Drive.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 text-sm space-y-2">
              <div className="font-medium text-foreground">Estado</div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    cloudStatus.connected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  {cloudStatus.connected
                    ? "Conectado a Google Drive"
                    : "No conectado"}
                </span>
              </div>

              <div className="text-muted-foreground">
                {cloudStatus.hasFile
                  ? "Archivo vinculado en Drive listo para sincronizar."
                  : "Todavía no hay archivo vinculado en Drive."}
              </div>

              <div className="text-muted-foreground">
                {lastSavedAt
                  ? `Último guardado: ${lastSavedAt}`
                  : "Todavía no se ha guardado nada en esta sesión."}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConnect} disabled={cloudBusy}>
                <Cloud className="w-4 h-4 mr-2" />
                {cloudBusy ? "Procesando..." : "Iniciar sesión con Google"}
              </Button>

              <Button
                variant="outline"
                onClick={handleUpload}
                disabled={cloudBusy || !cloudStatus.connected}
              >
                <Upload className="w-4 h-4 mr-2" />
                Guardar en Drive
              </Button>

              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={cloudBusy || !cloudStatus.connected}
              >
                <Download className="w-4 h-4 mr-2" />
                Cargar desde Drive
              </Button>

              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={cloudBusy || !cloudStatus.connected}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Necesitas configurar <code>VITE_GOOGLE_CLIENT_ID</code> en GitHub
              Actions para que el login funcione al publicar la app.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              Categorías de Transacciones
            </CardTitle>
            <CardDescription>
              Personaliza las categorías disponibles para clasificar tus ingresos
              y gastos.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
              <Input
                placeholder="Ej. Mascotas, Gym, Suscripciones..."
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="bg-background flex-1"
                required
              />
              <Button type="submit" disabled={createMutation.isPending}>
                Agregar
              </Button>
            </form>

            {isLoading ? (
              <div className="py-4 text-center text-muted-foreground">
                Cargando categorías...
              </div>
            ) : categories?.length ? (
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30 group hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl opacity-80">
                        {getCategoryIcon(c.name)}
                      </span>
                      <span className="font-medium text-foreground">
                        {c.name}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (confirm(`¿Eliminar la categoría "${c.name}"?`)) {
                          deleteMutation.mutate({ id: c.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
                No hay categorías personalizadas. Agrega la primera arriba.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
