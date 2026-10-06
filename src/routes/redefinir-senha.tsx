import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — IGA Network BR" },
      { name: "description", content: "Crie uma nova senha para acessar a plataforma IGA Network BR." },
      { property: "og:title", content: "Redefinir senha — IGA Network BR" },
      { property: "og:description", content: "Recuperação segura de acesso à plataforma IGA Network BR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCanReset(Boolean(data.session));
      setChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setCanReset(true);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmation) {
      toast.error("As senhas informadas não coincidem");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("O link expirou ou não é válido. Solicite um novo link na tela de acesso.");
      return;
    }

    toast.success("Senha atualizada com sucesso");
    navigate({ to: "/painel", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">IGA Network BR</span>
        </Link>
        <KeyRound className="mb-4 h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold">Criar nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina uma nova senha para recuperar o acesso à plataforma.
        </p>

        {checking ? (
          <p className="mt-6 text-sm text-muted-foreground">Validando o link de recuperação…</p>
        ) : canReset ? (
          <form className="mt-6 space-y-4" onSubmit={updatePassword}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Este link expirou ou não é válido. Solicite um novo link na tela de acesso.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Voltar ao acesso</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}