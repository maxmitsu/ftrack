import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListGoals, useCreateGoal, useDeleteGoal, useUpdateGoal, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, getCategoryColor } from "@/lib/utils";
import { Trash2, Plus, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Goals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useListGoals();

  const [form, setForm] = useState({ name: "", target: "", saved: "" });

  const createMutation = useCreateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: "Meta agregada" });
        setForm({ name: "", target: "", saved: "" });
      }
    }
  });

  const updateMutation = useUpdateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: "Meta actualizada" });
      }
    }
  });

  const deleteMutation = useDeleteGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: "Meta eliminada" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.target) return;
    createMutation.mutate({
      data: {
        name: form.name,
        target: Number(form.target),
        saved: Number(form.saved) || 0,
        color: getCategoryColor(goals?.length || 0)
      }
    });
  };

  const handleAddSavings = (goal: any) => {
    const amountStr = prompt(`¿Cuánto deseas agregar a "${goal.name}"?`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    
    updateMutation.mutate({
      id: goal.id,
      data: {
        name: goal.name,
        target: goal.target,
        saved: goal.saved + amount,
        color: goal.color
      }
    });
  };

  return (
    <Layout title="Metas de Ahorro">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Goals List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-foreground">Tus Metas</h2>

          {isLoading ? (
             <div className="p-8 text-center text-muted-foreground">Cargando metas...</div>
          ) : goals?.length ? (
            <div className="space-y-4">
              {goals.map((g, i) => {
                const pct = Math.min(Math.round((g.saved / g.target) * 100), 100);
                const isComplete = pct >= 100;
                
                return (
                  <Card key={g.id} className={`border-border/50 shadow-sm overflow-hidden transition-all ${isComplete ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0" style={{ backgroundColor: g.color || getCategoryColor(i) }}>
                            <Target className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                              {g.name}
                              {isComplete && <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Lograda 🎉</span>}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              <span className="font-semibold text-foreground">{formatCurrency(g.saved)}</span> ahorrados de {formatCurrency(g.target)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                          <span className={`text-2xl font-display font-bold ${isComplete ? 'text-primary' : 'text-foreground'}`}>{pct}%</span>
                          <div className="flex gap-2">
                            {!isComplete && (
                              <Button variant="outline" size="sm" onClick={() => handleAddSavings(g)} className="h-8 shadow-xs border-border bg-background">
                                <Plus className="w-4 h-4 mr-1" /> Aportar
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                               if(confirm("¿Eliminar meta?")) deleteMutation.mutate({ id: g.id });
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="h-3 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out relative"
                          style={{ width: `${pct}%`, backgroundColor: g.color || getCategoryColor(i) }}
                        >
                          <div className="absolute inset-0 bg-white/20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">No hay metas</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm">Establece objetivos de ahorro para mantenerte motivado.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Form */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Nueva Meta</h2>
          <Card className="border-border/50 shadow-sm sticky top-24">
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nombre de la meta</label>
                  <Input placeholder="Ej. Viaje, Carro" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Objetivo ($)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.target} onChange={e => setForm({...form, target: e.target.value})} required className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Ahorro actual ($) - Opcional</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.saved} onChange={e => setForm({...form, saved: e.target.value})} className="bg-background" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Agregando..." : "Crear Meta"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
