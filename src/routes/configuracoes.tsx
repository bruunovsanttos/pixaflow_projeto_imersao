import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/nexora/AppShell";
import { PageHeader, Panel } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { alertOptions, saveSettings, settingsSchema, type DemoSettings } from "@/lib/mock-data";
import { useIdentity, identityKey } from "@/hooks/use-identity";
import { identitySettings, preferencesSchema, type Identity } from "@/lib/api/identity";
import { updateMembershipPreferences } from "@/lib/api/users";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — NEXORA" }] }),
  component: SettingsPage,
});
function SettingsPage() {
  const identity = useIdentity();
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl" aria-busy={identity.source === "loading"}>
        <PageHeader
          eyebrow="Configurações"
          title="Configurações"
          description={
            identity.source === "api"
              ? "Perfil da empresa e preferências salvas na sua conta de desenvolvimento. O perfil é somente leitura."
              : identity.source === "loading"
                ? "Carregando perfil e preferências…"
                : "Preferências de demonstração salvas somente neste navegador."
          }
        />
        <SettingsForm
          key={identity.source + ":" + (identity.identity?.membership.id ?? "local")}
          settings={identity.settings}
          identity={identity.identity}
          loading={identity.source === "loading"}
          companyName={identity.company.name}
        />
      </div>
    </AppShell>
  );
}
function SettingsForm({
  settings,
  identity,
  loading,
  companyName,
}: {
  settings: DemoSettings;
  identity: Identity | null;
  loading: boolean;
  companyName: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) {
      setDraft(settings);
      setSaved(settings);
    }
  }, [settings, dirty]);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          const validated = settingsSchema.parse(draft);
          let value: DemoSettings;
          if (identity) {
            const preferences = preferencesSchema.parse(
              await updateMembershipPreferences(identity.membership.id, validated),
            );
            if (preferences.membershipId !== identity.membership.id)
              throw new Error("Vínculo inconsistente.");
            value = identitySettings(identity.user, identity.membership, preferences);
            queryClient.setQueryData<Identity>(identityKey(identity.company.id), {
              ...identity,
              preferences,
              settings: value,
            });
            toast.success("Preferências salvas na empresa");
          } else {
            value = await saveSettings(validated);
            toast.success("Preferências de demonstração salvas neste navegador");
          }
          setDraft(value);
          setSaved(value);
        } catch {
          setError(
            identity
              ? "Não foi possível confirmar o salvamento na empresa. Suas alterações foram mantidas; tente salvar novamente."
              : "Não foi possível salvar. Confira os campos e a disponibilidade do armazenamento local.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={loading || busy} className="space-y-4">
        <Panel
          title="Perfil"
          description={`Empresa: ${companyName}.${identity ? " Perfil somente leitura." : ""}`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {(["name", "email", "role"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{{ name: "Nome", email: "E-mail", role: "Cargo" }[key]}</Label>
                <Input
                  id={key}
                  type={key === "email" ? "email" : "text"}
                  required
                  maxLength={key === "email" ? 254 : 80}
                  readOnly={!!identity}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Alertas"
          description={
            identity
              ? "Preferências de alertas deste vínculo com a empresa. Nenhum envio de e-mail é ativado nesta etapa."
              : "Preferências de demonstração. Nenhum e-mail é enviado."
          }
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
          description="Preferências salvas para uso futuro. Os períodos das demais telas permanecem inalterados."
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
                  setDraft({ ...draft, sensitivity: e.target.value as DemoSettings["sensitivity"] })
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
  );
}
