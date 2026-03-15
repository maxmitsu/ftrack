import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
  connectGoogleDrive,
  disconnectGoogleDrive,
  getDriveConfiguration,
  syncGoogleDrive,
  useDriveStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Cloud, CloudOff, RefreshCw, Tags, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCategoryIcon } from "@/lib/utils";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useListCategories();
  const { data: driveStatus } = useDriveStatus();
  const driveConfig = getDriveConfiguration();

  const [catName, setCatName] = useState("");
  const [driveBusy, setDriveBusy] = useState(false);

  const createMutation = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "Categoría agregada" });
        setCatName("");
      }
    }
  });

  const deleteMutation = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "Categoría eliminada" });
      }
    }
  });

  const refreshAllData = () => {
    void queryClient.invalidateQueries();
  };

  const handleConnectDrive = async () => {
    try {
      setDriveBusy(true);
      await connectGoogleDrive();
      refreshAllData();
      toast({ title: "Google Drive conectado", description: "Los datos ya se están guardando en tu carpeta privada appDataFolder." });
    } catch (error) {
      toast({
        title: "No se pudo conectar Google Drive",
        description: error instanceof Error ? error.message : "Revisa la configuración OAuth de Google.",
        variant: "destructive",
      });
    } finally {
      setDriveBusy(false);
    }
  };

  const handleSyncDrive = async () => {
    try {
      setDriveBusy(true);
      await syncGoogleDrive();
      toast({ title: "Sincronización completada" });
    } catch (error) {
      toast({
        title: "Error al sincronizar",
        description: error instanceof Error ? error.message : "No se pudo subir el archivo a Google Drive.",
        variant: "destructive",
      });
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDisconnectDrive = () => {
    disconnectGoogleDrive();
    toast({ title: "Google Drive desconectado" });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    createMutation.mutate({
      data: { name: catName.trim() }
    });
  };

  return (
    <Layout title="Configuración">
      <div className="max-w-4xl space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {driveStatus?.signedIn ? <Cloud className="w-5 h-5 text-primary" /> : <CloudOff className="w-5 h-5 text-primary" />} Google Drive
            </CardTitle>
            <CardDescription>
              Usa GitHub Pages para el frontend y guarda todos los datos en un archivo JSON privado dentro de Google Drive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!driveConfig.configured ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground space-y-2">
                <p>Falta la variable <code>VITE_GOOGLE_CLIENT_ID</code>.</p>
                <p>
                  Crea un OAuth Client ID en Google Cloud, añade como JavaScript origin tu URL de GitHub Pages y luego define esa variable al compilar.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                    <p className="mt-1 font-medium">{driveStatus?.signedIn ? "Conectado" : "Sin conectar"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Archivo</p>
                    <p className="mt-1 font-medium">fintrack-data.json</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Última sincronización</p>
                    <p className="mt-1 font-medium">{driveStatus?.lastSyncedAt ? new Date(driveStatus.lastSyncedAt).toLocaleString() : "Todavía no"}</p>
                  </div>
                </div>

                {driveStatus?.error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {driveStatus.error}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {!driveStatus?.signedIn ? (
                    <Button onClick={handleConnectDrive} disabled={driveBusy}>
                      <Cloud className="mr-2 h-4 w-4" /> Conectar Google Drive
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSyncDrive} disabled={driveBusy}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar ahora
                      </Button>
                      <Button variant="outline" onClick={handleDisconnectDrive} disabled={driveBusy}>
                        <CloudOff className="mr-2 h-4 w-4" /> Desconectar
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" /> Categorías de Transacciones
            </CardTitle>
            <CardDescription>
              Personaliza las categorías disponibles para clasificar tus ingresos y gastos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
              <Input
                placeholder="Ej. Mascotas, Gym, Suscripciones..."
                value={catName}
                onChange={e => setCatName(e.target.value)}
                className="bg-background flex-1"
                required
              />
              <Button type="submit" disabled={createMutation.isPending}>Agregar</Button>
            </form>

            {isLoading ? (
              <div className="py-4 text-center text-muted-foreground">Cargando categorías...</div>
            ) : categories?.length ? (
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30 group hover:bg-secondary transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl opacity-80">{getCategoryIcon(c.name)}</span>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if(confirm(`¿Eliminar la categoría "${c.name}"?`)) deleteMutation.mutate({ id: c.id });
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
