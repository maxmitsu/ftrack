import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListAccounts, useCreateAccount, useDeleteAccount, useListRecurring, getListAccountsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Accounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: accounts, isLoading } = useListAccounts();
  const { data: recurring } = useListRecurring();

  const [form, setForm] = useState({ name: "", bank: "", bal: "" });

  const createMutation = useCreateAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        toast({ title: "Cuenta agregada" });
        setForm({ name: "", bank: "", bal: "" });
      }
    }
  });

  const deleteMutation = useDeleteAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        toast({ title: "Cuenta eliminada" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.bal) return;
    createMutation.mutate({
      data: {
        name: form.name,
        bank: form.bank || "Banco General",
        bal: Number(form.bal)
      }
    });
  };

  const totalBalance = accounts?.reduce((s, a) => s + a.bal, 0) || 0;

  return (
    <Layout title="Mis Cuentas">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Cuentas Activas</h2>
            <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold font-display text-lg">
              Total: {formatCurrency(totalBalance)}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando cuentas...</div>
          ) : accounts?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {accounts.map(acc => {
                // Calculate projected balance after recurring payments linked to this account
                const accountRecurring = recurring?.filter(r => r.accountId === acc.id) || [];
                const pendingTotal = accountRecurring.reduce((s, r) => s + r.amount, 0);
                const projected = acc.bal - pendingTotal;
                const hasRecurring = pendingTotal > 0;

                return (
                  <Card key={acc.id} className="border-border/50 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground">{acc.name}</h3>
                            <p className="text-xs text-muted-foreground">{acc.bank}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => { if(confirm("¿Eliminar cuenta?")) deleteMutation.mutate({ id: acc.id }); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Balance Actual</p>
                        <p className={`text-2xl font-display font-bold ${acc.bal < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {formatCurrency(acc.bal)}
                        </p>
                        
                        {hasRecurring && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground flex justify-between">
                              <span>Tras pagos fijos:</span>
                              <span className={`font-semibold ${projected < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                {formatCurrency(projected)}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">No hay cuentas</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm">Registra tus cuentas bancarias para tener un control exacto de tu dinero.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Form */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Agregar Cuenta</h2>
          <Card className="border-border/50 shadow-sm sticky top-24">
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nombre de la cuenta</label>
                  <Input placeholder="Ej. Ahorros, Nómina" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Banco (Opcional)</label>
                  <Input placeholder="Ej. Banco General" value={form.bank} onChange={e => setForm({...form, bank: e.target.value})} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Balance Actual ($)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.bal} onChange={e => setForm({...form, bal: e.target.value})} required className="bg-background" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Agregando..." : "Agregar Cuenta"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
