import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListRecurring, useCreateRecurring, useDeleteRecurring, usePayRecurring, useListAccounts, getListRecurringQueryKey, getListTransactionsQueryKey, getListAccountsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Trash2, CalendarDays, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Recurring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: recurring, isLoading } = useListRecurring();
  const { data: accounts } = useListAccounts();

  const [form, setForm] = useState({ name: "", amount: "", day: "", accountId: "none" });

  const createMutation = useCreateRecurring({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecurringQueryKey() });
        toast({ title: "Pago fijo agregado" });
        setForm({ name: "", amount: "", day: "", accountId: "none" });
      }
    }
  });

  const deleteMutation = useDeleteRecurring({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecurringQueryKey() });
        toast({ title: "Pago fijo eliminado" });
      }
    }
  });

  const payMutation = usePayRecurring({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        toast({ title: "Pago registrado exitosamente", description: "Se agregó a tus transacciones." });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = parseInt(form.day);
    if (!form.name || !form.amount || isNaN(day) || day < 1 || day > 31) return;
    
    createMutation.mutate({
      data: {
        name: form.name,
        amount: Number(form.amount),
        dayOfMonth: day,
        accountId: form.accountId === "none" ? null : parseInt(form.accountId)
      }
    });
  };

  const today = new Date().getDate();

  return (
    <Layout title="Pagos Fijos">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-foreground">Tus suscripciones y pagos</h2>

          {isLoading ? (
             <div className="p-8 text-center text-muted-foreground">Cargando pagos...</div>
          ) : recurring?.length ? (
            <div className="grid gap-4">
              {recurring.map((p) => {
                const diff = p.dayOfMonth - today;
                let statusColor = "bg-secondary text-foreground";
                let statusIcon = <Clock className="w-4 h-4 mr-1" />;
                let statusText = `Día ${p.dayOfMonth}`;

                if (diff < 0) {
                  statusColor = "bg-destructive/10 text-destructive border border-destructive/20";
                  statusIcon = <AlertCircle className="w-4 h-4 mr-1" />;
                  statusText = "Vencido";
                } else if (diff <= 3) {
                  statusColor = "bg-amber-500/10 text-amber-600 border border-amber-500/20";
                  statusIcon = <AlertCircle className="w-4 h-4 mr-1" />;
                  statusText = `En ${diff} día${diff === 1 ? '' : 's'}`;
                } else {
                  statusColor = "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
                  statusIcon = <CalendarDays className="w-4 h-4 mr-1" />;
                }

                const linkedAcc = accounts?.find(a => a.id === p.accountId);

                return (
                  <Card key={p.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <CalendarDays className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-foreground text-lg">{p.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${statusColor}`}>
                              {statusIcon} {statusText}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(p.amount)} al mes
                            {linkedAcc && ` • Paga con: ${linkedAcc.name}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button 
                          onClick={() => payMutation.mutate({ id: p.id })}
                          disabled={payMutation.isPending}
                          className="flex-1 sm:flex-none shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Registrar Pago
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 border border-transparent hover:bg-destructive/10" onClick={() => {
                           if(confirm("¿Eliminar pago fijo?")) deleteMutation.mutate({ id: p.id });
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">No hay pagos fijos</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm">Agrega tu renta, servicios, o suscripciones para recordarlos.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Form */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Nuevo Pago Fijo</h2>
          <Card className="border-border/50 shadow-sm sticky top-24">
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Descripción</label>
                  <Input placeholder="Ej. Renta, Netflix, Luz" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Monto ($)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Día del mes (1-31)</label>
                  <Input type="number" min="1" max="31" placeholder="Ej. 15" value={form.day} onChange={e => setForm({...form, day: e.target.value})} required className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Cuenta a debitar</label>
                  <Select value={form.accountId} onValueChange={val => setForm({...form, accountId: val})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin vincular</SelectItem>
                      {accounts?.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Agregando..." : "Agregar Pago Fijo"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
