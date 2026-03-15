import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListBudgets, useCreateBudget, useDeleteBudget, useListTransactions, useListCategories, getListBudgetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, getCategoryColor } from "@/lib/utils";
import { Trash2, PlusCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Budgets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: budgets, isLoading: isBudgetsLoading } = useListBudgets();
  const { data: transactions } = useListTransactions();
  const { data: categories } = useListCategories();

  const [form, setForm] = useState({ cat: "", limit: "" });

  const createMutation = useCreateBudget({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey() });
        toast({ title: "Presupuesto agregado" });
        setForm({ cat: "", limit: "" });
      }
    }
  });

  const deleteMutation = useDeleteBudget({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBudgetsQueryKey() });
        toast({ title: "Presupuesto eliminado" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cat || !form.limit) return;
    createMutation.mutate({
      data: {
        cat: form.cat,
        limit: Number(form.limit),
        color: getCategoryColor(budgets?.length || 0)
      }
    });
  };

  // Calculations for current month
  const currentMonth = new Date().toISOString().substring(0, 7);
  const totalBudget = budgets?.reduce((s, b) => s + b.limit, 0) || 0;
  
  const currentMonthExpenses = transactions?.filter(t => t.type === 'gasto' && t.date.startsWith(currentMonth)) || [];
  
  const totalSpent = budgets?.reduce((sum, b) => {
    const spent = currentMonthExpenses.filter(t => t.cat === b.cat).reduce((x, t) => x + t.amount, 0);
    return sum + spent;
  }, 0) || 0;

  const available = totalBudget - totalSpent;

  return (
    <Layout title="Presupuesto Mensual">
      {/* Overview Metrics */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Presupuestado</p>
            <h3 className="text-2xl font-display font-bold text-foreground">{formatCurrency(totalBudget)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Gastado</p>
            <h3 className="text-2xl font-display font-bold text-rose-600">{formatCurrency(totalSpent)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-primary/5">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-primary mb-1">Disponible</p>
            <h3 className="text-2xl font-display font-bold text-primary">{formatCurrency(available)}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Budget List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Límites por categoría</h2>
          
          {isBudgetsLoading ? (
            <div className="text-muted-foreground text-center p-8">Cargando presupuestos...</div>
          ) : budgets?.length ? (
            budgets.map(b => {
              const spent = currentMonthExpenses.filter(t => t.cat === b.cat).reduce((x, t) => x + t.amount, 0);
              const pct = Math.min(Math.round((spent / b.limit) * 100), 100);
              const isOver = spent > b.limit;
              const isWarn = !isOver && pct >= 80;

              return (
                <Card key={b.id} className="border-border/50 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{b.cat}</h4>
                          {isOver && <span className="bg-destructive/10 text-destructive text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Excedido</span>}
                          {isWarn && <span className="bg-amber-500/10 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">80% Usado</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCurrency(spent)} de {formatCurrency(b.limit)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-display font-bold ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                          {pct}%
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                          if(confirm("¿Eliminar límite?")) deleteMutation.mutate({ id: b.id });
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-destructive' : isWarn ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
             <div className="p-8 text-center bg-card rounded-xl border border-border/50">
               <p className="text-muted-foreground">No tienes presupuestos definidos.</p>
             </div>
          )}
        </div>

        {/* Add Form Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Nuevo Límite</h2>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Categoría</label>
                  <Select value={form.cat} onValueChange={val => setForm({...form, cat: val})} required>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                      {!categories?.length && <SelectItem value="General">General</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Límite Mensual ($)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.limit} onChange={e => setForm({...form, limit: e.target.value})} required className="bg-background" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Agregando..." : "Agregar Presupuesto"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
