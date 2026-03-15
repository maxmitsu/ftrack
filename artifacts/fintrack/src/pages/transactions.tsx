import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListTransactions, useCreateTransaction, useDeleteTransaction, useListCategories, useListAccounts, getListTransactionsQueryKey, getListAccountsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, getCategoryIcon } from "@/lib/utils";
import { Trash2, PlusCircle, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Transactions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<"todas" | "ingreso" | "gasto">("todas");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const { data: transactions, isLoading } = useListTransactions();
  const { data: categories } = useListCategories();
  const { data: accounts } = useListAccounts();

  const createMutation = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        toast({ title: "Transacción agregada" });
        setForm({ name: "", amount: "", cat: "", type: "gasto", date: new Date().toISOString().split('T')[0], accountId: "none" });
      },
      onError: () => toast({ title: "Error al agregar", variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteTransaction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        toast({ title: "Transacción eliminada" });
      }
    }
  });

  const [form, setForm] = useState({
    name: "", amount: "", cat: "", type: "gasto" as const, date: new Date().toISOString().split('T')[0], accountId: "none"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.cat || !form.date) return;
    
    createMutation.mutate({
      data: {
        name: form.name,
        amount: Number(form.amount),
        cat: form.cat,
        type: form.type,
        date: form.date,
        accountId: form.accountId === "none" ? null : parseInt(form.accountId)
      }
    });
  };

  // Extract unique months for filter
  const months = Array.from(new Set(transactions?.map(t => t.date.substring(0, 7)) || [])).sort().reverse();

  // Apply filters
  let filteredTxs = [...(transactions || [])].reverse();
  if (filterType !== "todas") {
    filteredTxs = filteredTxs.filter(t => t.type === filterType);
  }
  if (filterMonth !== "all") {
    filteredTxs = filteredTxs.filter(t => t.date.startsWith(filterMonth));
  }

  return (
    <Layout title="Transacciones">
      {/* Add Form */}
      <Card className="mb-8 border-border/50 shadow-sm overflow-hidden">
        <div className="bg-primary/5 p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-primary" /> Agregar nueva
          </h3>
        </div>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Descripción</label>
              <Input placeholder="Ej. Supermercado" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-background" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Monto</label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="bg-background" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={form.type} onValueChange={(val: any) => setForm({...form, type: val})}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasto">Gasto</SelectItem>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Categoría</label>
              <Select value={form.cat} onValueChange={val => setForm({...form, cat: val})} required>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                  {!categories?.length && <SelectItem value="Otros">Otros</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Cuenta (Opcional)</label>
              <Select value={form.accountId} onValueChange={val => setForm({...form, accountId: val})}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  {accounts?.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name} ({formatCurrency(a.bal)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Fecha</label>
              <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="bg-background" />
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Guardando..." : "Guardar transacción"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filters & List */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex bg-secondary p-1 rounded-lg w-full sm:w-auto">
          {(["todas", "gasto", "ingreso"] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize ${filterType === type ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {months.map(m => {
                const [y, mo] = m.split('-');
                const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return <SelectItem key={m} value={m}>{names[parseInt(mo)-1]} {y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <div className="divide-y divide-border/50">
          {isLoading ? (
             <div className="p-8 text-center text-muted-foreground">Cargando transacciones...</div>
          ) : filteredTxs.length > 0 ? (
            filteredTxs.map(tx => (
              <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-secondary/20 transition-colors group gap-4 sm:gap-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl shadow-sm shrink-0">
                    {getCategoryIcon(tx.cat)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-base">{tx.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="bg-secondary px-2 py-0.5 rounded-full text-xs font-medium">{tx.cat}</span>
                      <span>{formatDate(tx.date)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto w-full pl-16 sm:pl-0">
                  <span className={`font-bold text-lg ${tx.type === 'ingreso' ? 'text-emerald-600' : 'text-foreground'}`}>
                    {tx.type === 'ingreso' ? '+' : ''}{formatCurrency(tx.amount)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                    onClick={() => {
                      if(confirm("¿Eliminar transacción?")) {
                        deleteMutation.mutate({ id: tx.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-2xl">📭</div>
              <h3 className="text-lg font-medium text-foreground">No hay transacciones</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">Ajusta los filtros o agrega una nueva transacción para comenzar.</p>
            </div>
          )}
        </div>
      </Card>
    </Layout>
  );
}
