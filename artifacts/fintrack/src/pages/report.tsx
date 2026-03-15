import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListTransactions } from "@workspace/api-client-react";
import { formatCurrency, getCategoryColor } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

export default function Report() {
  const { data: transactions, isLoading } = useListTransactions();

  if (isLoading) {
    return <Layout title="Reporte Mensual"><div className="p-8 text-center text-muted-foreground">Cargando reporte...</div></Layout>;
  }

  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthTxs = transactions?.filter(t => t.date.startsWith(currentMonth)) || [];

  const inc = currentMonthTxs.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const exp = currentMonthTxs.filter(t => t.type === 'gasto').reduce((s, t) => s + Math.abs(t.amount), 0);
  const neto = inc - exp;

  // Top Expenses
  const byName: Record<string, number> = {};
  currentMonthTxs.filter(t => t.type === 'gasto').forEach(t => {
    byName[t.name] = (byName[t.name] || 0) + Math.abs(t.amount);
  });
  const topExpenses = Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // By Category
  const byCat: Record<string, number> = {};
  currentMonthTxs.filter(t => t.type === 'gasto').forEach(t => {
    byCat[t.cat] = (byCat[t.cat] || 0) + Math.abs(t.amount);
  });
  const catTotal = Object.values(byCat).reduce((s, v) => s + v, 0);
  const catSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  // Net Balance History
  const getNetHistory = () => {
    if (!transactions) return [];
    const months: Record<string, number> = {};
    transactions.forEach(t => {
      const m = t.date.substring(0, 7);
      if (!months[m]) months[m] = 0;
      if (t.type === 'ingreso') months[m] += t.amount;
      else months[m] -= Math.abs(t.amount);
    });
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([m, val]) => {
        const [year, month] = m.split('-');
        const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return { name: names[parseInt(month)-1], Neto: val };
      });
  };
  const netHistory = getNetHistory();

  return (
    <Layout title="Reporte Mensual">
      
      {/* Overview Metrics */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Ingresos del mes</p>
            <h3 className="text-2xl font-display font-bold text-emerald-600">{formatCurrency(inc)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-rose-500/5">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Gastos del mes</p>
            <h3 className="text-2xl font-display font-bold text-rose-600">{formatCurrency(exp)}</h3>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Balance Neto</p>
            <h3 className={`text-2xl font-display font-bold ${neto >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(neto)}
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-8">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Balance neto histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {netHistory.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={netHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <RechartsTooltip cursor={{ fill: 'var(--secondary)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="Neto" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {netHistory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Neto >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sin datos históricos.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top gastos del mes</CardTitle>
          </CardHeader>
          <CardContent>
             {topExpenses.length > 0 ? (
              <div className="space-y-4">
                {topExpenses.map(([name, amount], index) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</div>
                      <span className="font-medium text-foreground">{name}</span>
                    </div>
                    <span className="font-semibold text-rose-600">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
             ) : (
               <div className="py-8 text-center text-muted-foreground">No hay gastos este mes.</div>
             )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Detalle de gastos por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {catSorted.length > 0 ? (
            <div className="space-y-5">
              {catSorted.map(([cat, amt], i) => {
                const pct = catTotal > 0 ? Math.round((amt / catTotal) * 100) : 0;
                const color = getCategoryColor(i);
                return (
                  <div key={cat} className="flex items-center gap-4">
                    <div className="w-[120px] text-sm font-medium text-foreground truncate" title={cat}>{cat}</div>
                    <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <div className="w-[40px] text-right text-sm text-muted-foreground">{pct}%</div>
                    <div className="w-[80px] text-right text-sm font-semibold text-foreground">{formatCurrency(amt)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No hay gastos este mes.</div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
