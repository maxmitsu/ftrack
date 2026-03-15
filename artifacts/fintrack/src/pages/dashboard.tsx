import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListTransactions, useListAccounts } from "@workspace/api-client-react";
import { formatCurrency, formatDate, getCategoryColor, getCategoryIcon } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowDownIcon, ArrowUpIcon, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: transactions, isLoading: isLoadingTxs } = useListTransactions();
  const { data: accounts, isLoading: isLoadingAccs } = useListAccounts();

  const isLoading = isLoadingTxs || isLoadingAccs;

  // Calculate Metrics
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.bal, 0) || 0;
  const totalIncome = transactions?.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalExpense = transactions?.filter(t => t.type === 'gasto').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

  // Recent Transactions
  const recentTxs = [...(transactions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Cash Flow Chart Data (Last 6 months)
  const getCashFlowData = () => {
    if (!transactions) return [];
    const months: Record<string, { income: number, expense: number }> = {};
    transactions.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!months[month]) months[month] = { income: 0, expense: 0 };
      if (t.type === 'ingreso') months[month].income += t.amount;
      else months[month].expense += Math.abs(t.amount);
    });
    
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([m, data]) => {
        const [year, month] = m.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return {
          name: `${monthNames[parseInt(month) - 1]}`,
          Ingresos: data.income,
          Gastos: data.expense
        };
      });
  };

  // Category Pie Chart Data (All time for simplicity or just expenses)
  const getCategoryData = () => {
    if (!transactions) return [];
    const cats: Record<string, number> = {};
    transactions.filter(t => t.type === 'gasto').forEach(t => {
      cats[t.cat] = (cats[t.cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5
      .map(([name, value]) => ({ name, value }));
  };

  const flowData = getCashFlowData();
  const catData = getCategoryData();

  if (isLoading) {
    return (
      <Layout title="Dashboard">
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl mb-6" />
      </Layout>
    );
  }

  return (
    <Layout title="Tu resumen">
      {/* Metrics Row */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
        <Card className="bg-gradient-to-br from-card to-secondary/50 border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">Balance total</p>
              <div className="p-2 bg-primary/10 rounded-lg"><Wallet className="w-4 h-4 text-primary" /></div>
            </div>
            <h3 className="text-3xl font-display font-bold text-foreground">
              {formatCurrency(totalBalance)}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-emerald-500/5 border-emerald-500/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">Ingresos</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg"><ArrowUpIcon className="w-4 h-4 text-emerald-600" /></div>
            </div>
            <h3 className="text-3xl font-display font-bold text-emerald-600">
              {formatCurrency(totalIncome)}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-rose-500/5 border-rose-500/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">Gastos</p>
              <div className="p-2 bg-rose-500/10 rounded-lg"><ArrowDownIcon className="w-4 h-4 text-rose-600" /></div>
            </div>
            <h3 className="text-3xl font-display font-bold text-rose-600">
              {formatCurrency(totalExpense)}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Area */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-8">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Flujo de efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            {flowData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <RechartsTooltip cursor={{ fill: 'var(--secondary)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No hay suficientes datos.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Gastos por categoría</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {catData.length > 0 ? (
              <>
                <div className="h-[220px] w-full mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={catData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {catData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2">
                  {catData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(index) }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Sin gastos registrados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Últimas transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTxs.length > 0 ? (
            <div className="space-y-4">
              {recentTxs.map((tx) => {
                const isIncome = tx.type === 'ingreso';
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg shadow-sm">
                        {getCategoryIcon(tx.cat)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tx.name}</p>
                        <p className="text-xs text-muted-foreground">{tx.cat} • {formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className={`font-semibold ${isIncome ? 'text-emerald-600' : 'text-foreground'}`}>
                      {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay transacciones recientes.</p>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
