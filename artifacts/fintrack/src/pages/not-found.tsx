import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <Layout title="Extraviado">
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-8xl font-display font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-2">Página no encontrada</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Parece que te perdiste. La ruta a la que intentas acceder no existe en tus finanzas.
        </p>
        <Button asChild size="lg" className="rounded-xl shadow-lg shadow-primary/20">
          <Link href="/">Volver al Dashboard</Link>
        </Button>
      </div>
    </Layout>
  );
}
