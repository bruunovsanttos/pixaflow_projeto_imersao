import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/nexora/AppShell";
import { PageHeader, Panel } from "@/components/nexora/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { companies, currentUser } from "@/lib/mock-data";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — NEXORA" },
      {
        name: "description",
        content: "Ajuste perfil, empresa, alertas e sensibilidade das previsões da Nexora.",
      },
      { property: "og:title", content: "Configurações — NEXORA" },
      {
        property: "og:description",
        content: "Defina como a Nexora monitora e alerta sobre a sua operação.",
      },
    ],
  }),
  component: SettingsPage,
});

const alerts = [
  { id: "risks", label: "Alertas de risco crítico", hint: "Notificar assim que detectado" },
  { id: "opps", label: "Novas oportunidades", hint: "Resumo diário às 8h" },
  { id: "weekly", label: "Relatório semanal", hint: "Enviado toda segunda-feira" },
  { id: "capacity", label: "Capacidade acima de 95%", hint: "Alerta imediato por e-mail" },
];

function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          eyebrow="Configurações"
          title="Configurações"
          description="Defina como a Nexora acompanha a sua operação e quando deve avisar você."
        />

        <div className="grid gap-4">
          <Panel title="Perfil" description="Informações da sua conta.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" defaultValue={currentUser.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" defaultValue={currentUser.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Input id="role" defaultValue={currentUser.role} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa ativa</Label>
                <Select defaultValue={companies[0].id}>
                  <SelectTrigger id="company">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Panel>

          <Panel title="Alertas" description="Escolha o que a Nexora deve avisar.">
            <div className="divide-y divide-border">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.hint}</p>
                  </div>
                  <Switch defaultChecked={a.id !== "capacity"} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Previsões" description="Sensibilidade dos modelos de antecipação.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="horizon">Horizonte de previsão</Label>
                <Select defaultValue="7">
                  <SelectTrigger id="horizon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sensitivity">Sensibilidade a riscos</Label>
                <Select defaultValue="equilibrada">
                  <SelectTrigger id="sensitivity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservadora">Conservadora</SelectItem>
                    <SelectItem value="equilibrada">Equilibrada</SelectItem>
                    <SelectItem value="agressiva">Agressiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator className="my-5" />
            <div className="flex justify-end gap-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Salvar alterações</Button>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
