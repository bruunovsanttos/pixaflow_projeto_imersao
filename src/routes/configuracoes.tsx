import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/nexora/AppShell";
import { PageHeader, Panel } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  alertOptions,
  companies,
  defaultSettings,
  getSettings,
  saveSettings,
  type DemoSettings,
} from "@/lib/mock-data";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — NEXORA" }] }),
  component: SettingsPage,
});
function SettingsPage() {
  const [draft, setDraft] = useState<DemoSettings>(defaultSettings);
  const [saved, setSaved] = useState<DemoSettings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void getSettings()
      .then((value) => {
        setDraft(value);
        setSaved(value);
      })
      .catch(() =>
        setError(
          "Não foi possível carregar as preferências. Revise e salve para restaurar os dados locais.",
        ),
      )
      .finally(() => setReady(true));
  }, []);
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          eyebrow="Configurações"
          title="Configurações"
          description="Preferências de demonstração salvas neste navegador. Alertas e previsões reais serão ativados com a integração da empresa."
        />
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const value = await saveSettings(draft);
              setDraft(value);
              setSaved(value);
              toast.success("Preferências salvas neste navegador");
            } catch {
              setError(
                "Não foi possível salvar. Confira os campos e a disponibilidade do armazenamento local.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={!ready || busy} className="space-y-4">
            <Panel title="Perfil" description={`Empresa demonstrada: ${companies[0]!.name}.`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["name", "email", "role"] as const).map((key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>
                      {{ name: "Nome", email: "E-mail", role: "Cargo" }[key]}
                    </Label>
                    <Input
                      id={key}
                      type={key === "email" ? "email" : "text"}
                      required
                      maxLength={80}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Alertas"
              description="Preferências para a futura integração. Nenhum e-mail é enviado nesta demonstração."
            >
              <div className="divide-y">
                {alertOptions.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-4 py-4">
                    <Label htmlFor={a.id}>{a.label}</Label>
                    <Switch
                      id={a.id}
                      checked={draft.alerts[a.id]}
                      onCheckedChange={(checked) =>
                        setDraft({ ...draft, alerts: { ...draft.alerts, [a.id]: checked } })
                      }
                    />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Previsões"
              description="Preferências salvas para uso futuro. Os exemplos das telas mantêm seus períodos demonstrativos."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="horizon">Horizonte preferido</Label>
                  <select
                    id="horizon"
                    className="w-full rounded-lg border bg-card p-3"
                    value={draft.horizon}
                    onChange={(e) =>
                      setDraft({ ...draft, horizon: e.target.value as DemoSettings["horizon"] })
                    }
                  >
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sensitivity">Sensibilidade</Label>
                  <select
                    id="sensitivity"
                    className="w-full rounded-lg border bg-card p-3"
                    value={draft.sensitivity}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        sensitivity: e.target.value as DemoSettings["sensitivity"],
                      })
                    }
                  >
                    <option value="conservadora">Conservadora</option>
                    <option value="equilibrada">Equilibrada</option>
                    <option value="agressiva">Agressiva</option>
                  </select>
                </div>
              </div>
            </Panel>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(saved);
                  setError("");
                }}
              >
                Cancelar alterações
              </Button>
              <Button type="submit">{busy ? "Salvando..." : "Salvar alterações"}</Button>
            </div>
          </fieldset>
        </form>
      </div>
    </AppShell>
  );
}
