import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { AppShell } from "@/components/nexora/AppShell";
import { Button } from "@/components/ui/button";

import { useSession } from "@/hooks/use-session";
import { useCurrentCompany } from "@/hooks/use-identity";
import { useAnalytics } from "@/hooks/use-analytics";

import {
  get,
  put,
  post,
} from "@/lib/api/client";

import {
  brazilDate,
  money,
  snapshotSchema,
  type DailyRecord,
} from "@/lib/api/analytics";


export const Route =
  createFileRoute("/dados")({
    component: DailyData,
  });


const fields = [
  [
    "revenue",
    "Receita realizada (R$)",
  ],
  [
    "planned",
    "Tarefas previstas",
  ],
  [
    "completed",
    "Tarefas concluídas",
  ],
  [
    "on_time",
    "Concluídas no prazo",
  ],
  [
    "available_minutes",
    "Minutos disponíveis da equipe",
  ],
  [
    "productive_minutes",
    "Minutos produtivos da equipe",
  ],
] as const;


function DailyData() {
  const company =
    useCurrentCompany();

  const session =
    useSession();

  const client =
    useQueryClient();

  const analysis =
    useAnalytics();


  /*
   * Não inicializamos mais com brazilDate(-1).
   *
   * Primeiro buscamos os registros existentes
   * da empresa e usamos o registro mais recente.
   */
  const [
    day,
    setDay,
  ] = useState("");


  const [
    reference,
    setReference,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    busy,
    setBusy,
  ] = useState(false);


  const id =
    company.data?.id;


  const base =
    `/companies/${id}`;


  const role =
    session.data?.memberships.find(
      (membership) =>
        membership.company_id === id
    )?.role;


  const canWrite =
    role === "admin" ||
    role === "operator";


  /*
   * Busca os registros disponíveis.
   *
   * O backend devolve em ordem decrescente
   * por record_date, portanto data[0]
   * é o registro mais recente.
   */
  const latestRecords =
    useQuery({
      queryKey: [
        "daily-latest",
        id,
      ],

      queryFn: () =>
        get<DailyRecord[]>(
          `${base}/daily-data`
        ),

      enabled: !!id,

      retry: false,

      staleTime: 0,
    });


  /*
   * Inicializa a página no último registro
   * real disponível.
   *
   * Caso seja uma empresa nova, sem nenhum
   * registro, usamos ontem como fallback
   * para permitir a criação do primeiro dia.
   */
  useEffect(() => {
    if (!id) {
      return;
    }

    if (
      latestRecords.isPending
    ) {
      return;
    }

    const latest =
      latestRecords.data?.[0];

    if (latest) {
      if (!day) {
        setDay(
          latest.record_date
        );
      }

      if (!reference) {
        setReference(
          latest.record_date
        );
      }

      return;
    }

    const fallback =
      brazilDate(-1);

    if (!day) {
      setDay(
        fallback
      );
    }

    if (!reference) {
      setReference(
        fallback
      );
    }
  }, [
    id,
    latestRecords.data,
    latestRecords.isPending,
    day,
    reference,
  ]);


  /*
   * Busca somente o dia atualmente
   * selecionado.
   */
  const records =
    useQuery({
      queryKey: [
        "daily",
        id,
        day,
      ],

      queryFn: () =>
        get<DailyRecord[]>(
          `${base}/daily-data`,
          {
            start: day,
            end: day,
          }
        ),

      enabled:
        !!id &&
        !!day,

      retry: false,
    });


  /*
   * Histórico das análises.
   */
  const history =
    useQuery({
      queryKey: [
        "analysis-history",
        id,
      ],

      queryFn: async () =>
        snapshotSchema
          .array()
          .parse(
            await get(
              `${base}/analytics/history`
            )
          ),

      enabled: !!id,

      retry: false,
    });


  /*
   * Histórico de alterações do
   * dia selecionado.
   */
  const audit =
    useQuery({
      queryKey: [
        "daily-history",
        id,
        day,
      ],

      queryFn: () =>
        get<
          {
            revision: number;
            created_at: string;
            values: Record<
              string,
              unknown
            >;
          }[]
        >(
          `${base}/daily-data/${day}/history`
        ),

      enabled:
        !!id &&
        !!day,

      retry: false,
    });


  const row =
    records.data?.[0];


  async function refresh() {
    await Promise.all([
      client.invalidateQueries({
        queryKey: [
          "daily",
        ],
      }),

      client.invalidateQueries({
        queryKey: [
          "daily-latest",
        ],
      }),

      client.invalidateQueries({
        queryKey: [
          "daily-history",
        ],
      }),

      client.invalidateQueries({
        queryKey: [
          "analytics",
        ],
      }),

      client.invalidateQueries({
        queryKey: [
          "analysis-history",
        ],
      }),
    ]);
  }


  async function save(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !canWrite ||
      !id ||
      !day
    ) {
      return;
    }


    const form =
      new FormData(
        event.currentTarget
      );


    setBusy(true);

    setMessage("");


    try {
      const values =
        Object.fromEntries(
          fields.map(
            ([key]) => [
              key,

              key ===
              "revenue"
                ? String(
                    form.get(
                      key
                    )
                  )
                : Number(
                    form.get(
                      key
                    )
                  ),
            ]
          )
        );


      await put(
        `${base}/daily-data/${day}`,
        {
          ...values,

          note:
            form.get(
              "note"
            ),

          expected_revision:
            row?.revision ??
            0,
        }
      );


      await refresh();


      setMessage(
        "Dados salvos. Gere uma análise para atualizar os indicadores."
      );

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao salvar."
      );

    } finally {
      setBusy(false);
    }
  }


  async function run() {
    if (
      !id ||
      !reference
    ) {
      return;
    }


    setBusy(true);

    setMessage("");


    try {
      await post(
        `${base}/analytics`,
        {
          reference_date:
            reference,
        }
      );


      await refresh();


      setMessage(
        "Análise salva e disponível na Visão Geral."
      );

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha na análise."
      );

    } finally {
      setBusy(false);
    }
  }


  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">

        <h1 className="text-3xl font-semibold">
          Dados diários
        </h1>


        <p className="text-muted-foreground">
          Informe os totais realizados
          pela empresa. Inclua dias sem
          atividade com valores zero. O
          dia usa o horário de Brasília.
          Não preencha valores estimados.
        </p>


        {!canWrite && (
          <p>
            Seu perfil permite somente
            consulta.
          </p>
        )}


        {message && (
          <p
            role="status"
            className="rounded-xl border bg-card p-4"
          >
            {message}
          </p>
        )}


        {company.isError && (
          <Button
            onClick={() =>
              void company.refetch()
            }
          >
            Tentar carregar empresa
            novamente
          </Button>
        )}


        <section className="rounded-2xl border bg-card p-6">

          <Button
            variant="outline"
            disabled={
              busy ||
              records.isFetching ||
              !day
            }
            onClick={() =>
              void records.refetch()
            }
          >
            Recarregar dia
          </Button>


          <label className="mb-4 block">
            Dia do registro

            <input
              type="date"
              value={day}
              max={brazilDate()}
              onChange={(
                event
              ) => {
                if (
                  event.target
                    .value
                ) {
                  setDay(
                    event.target
                      .value
                  );
                }
              }}
              className="ml-3 rounded border p-2"
            />

          </label>


          {latestRecords.isPending &&
          !day ? (

            <p role="status">
              Localizando último
              registro…
            </p>

          ) : records.isPending ? (

            <p role="status">
              Carregando dados…
            </p>

          ) : records.isError ? (

            <>
              <p role="alert">
                {
                  records.error
                    .message
                }
              </p>

              <Button
                onClick={() =>
                  void records.refetch()
                }
              >
                Tentar novamente
              </Button>
            </>

          ) : (

            <form
              key={`${day}-${row?.revision ?? 0}`}
              onSubmit={save}
            >

              <fieldset
                disabled={
                  !canWrite ||
                  busy ||
                  records.isFetching
                }
                className="grid gap-4 sm:grid-cols-2"
              >

                {fields.map(
                  (
                    [
                      key,
                      label,
                    ]
                  ) => (

                    <label
                      key={
                        key
                      }
                      className="text-sm"
                    >

                      {label}


                      <input
                        name={
                          key
                        }
                        type="number"
                        min="0"
                        max={
                          key ===
                          "revenue"
                            ? undefined
                            : key.includes(
                                  "minutes"
                                )
                              ? 100000000
                              : 1000000
                        }
                        step={
                          key ===
                          "revenue"
                            ? "0.01"
                            : "1"
                        }
                        defaultValue={
                          row?.[
                            key
                          ] ??
                          ""
                        }
                        required
                        className="mt-1 block w-full rounded-lg border p-3"
                      />

                    </label>
                  )
                )}


                <label className="text-sm sm:col-span-2">

                  Observação


                  <textarea
                    name="note"
                    maxLength={
                      500
                    }
                    defaultValue={
                      row?.note ??
                      ""
                    }
                    className="mt-1 block w-full rounded-lg border p-3"
                  />

                </label>


                <p className="text-xs text-muted-foreground sm:col-span-2">

                  No prazo ≤ concluídas
                  ≤ previstas. Tempo
                  produtivo ≤ disponível.
                  Some os minutos de toda
                  a equipe.{" "}

                  {row
                    ? `Revisão ${row.revision}. Salvar preserva a versão anterior no histórico.`
                    : "Novo registro."}

                </p>


                <Button
                  type="submit"
                >
                  {busy
                    ? "Salvando…"
                    : "Salvar dia"}
                </Button>

              </fieldset>

            </form>
          )}


          <details className="mt-4">

            <summary>
              Histórico de alterações
              deste dia
            </summary>


            {audit.isError ? (

              <Button
                onClick={() =>
                  void audit.refetch()
                }
              >
                Tentar carregar
                histórico
              </Button>

            ) : audit.data?.length ? (

              audit.data.map(
                (item) => (

                  <p
                    key={
                      item.revision
                    }
                    className="mt-2 text-sm"
                  >

                    Revisão{" "}
                    {
                      item.revision
                    }{" "}
                    ·{" "}

                    {new Date(
                      item.created_at
                    ).toLocaleString(
                      "pt-BR"
                    )}{" "}

                    · Receita{" "}

                    {String(
                      item.values[
                        "revenue"
                      ]
                    )}{" "}

                    · Tarefas{" "}

                    {String(
                      item.values[
                        "on_time"
                      ]
                    )}
                    /
                    {String(
                      item.values[
                        "planned"
                      ]
                    )}{" "}

                    · Minutos{" "}

                    {String(
                      item.values[
                        "productive_minutes"
                      ]
                    )}
                    /
                    {String(
                      item.values[
                        "available_minutes"
                      ]
                    )}

                  </p>
                )
              )

            ) : (

              <p>
                Sem alterações
                registradas.
              </p>
            )}

          </details>

        </section>


        <section className="space-y-4 rounded-2xl border bg-card p-6">

          <h2 className="text-xl font-semibold">
            Gerar análise
          </h2>


          <p className="text-sm">
            Janela de 28 dias até a
            referência. Saúde = tarefas
            no prazo / previstas.
            Eficiência = minutos
            produtivos / disponíveis.
            Receita estimada = média
            diária de 28 dias completos
            × 30. Sem denominador ou
            histórico suficiente, o
            indicador fica indisponível.
          </p>


          <label>
            Data de referência

            <input
              type="date"
              max={
                brazilDate(-1)
              }
              value={
                reference
              }
              onChange={(
                event
              ) =>
                setReference(
                  event.target
                    .value
                )
              }
              className="ml-3 rounded border p-2"
            />

          </label>


          <Button
            className="ml-3"
            disabled={
              !canWrite ||
              busy ||
              !reference ||
              !id
            }
            onClick={() =>
              void run()
            }
          >
            Gerar e salvar análise
          </Button>


          {analysis.data && (
            <p className="text-sm">

              Última análise:{" "}

              {
                analysis.data
                  .reference_date
              }{" "}

              ·{" "}

              {
                analysis.data
                  .result
                  .coverage_days
              }

              /28 dias registrados

              {analysis.data
                .stale
                ? " · Dados alterados: gere novamente."
                : ""}

            </p>
          )}


          <h3 className="font-semibold">
            Análises salvas
          </h3>


          {history.isError ? (

            <>
              <p role="alert">
                {
                  history.error
                    .message
                }
              </p>

              <Button
                onClick={() =>
                  void history.refetch()
                }
              >
                Tentar novamente
              </Button>
            </>

          ) : history.data?.length ? (

            history.data.map(
              (snapshot) => (

                <details
                  key={
                    snapshot.id
                  }
                  className="rounded-lg border p-3"
                >

                  <summary>

                    Referência{" "}

                    {
                      snapshot.reference_date
                    }{" "}

                    ·{" "}

                    {
                      snapshot.result
                        .coverage_days
                    }

                    /28 dias

                    {snapshot.stale
                      ? " · Dados alterados"
                      : ""}

                  </summary>


                  <p className="mt-2 text-sm">

                    Saúde:{" "}

                    {
                      snapshot.result
                        .health ??
                      "—"
                    }{" "}

                    · Eficiência:{" "}

                    {
                      snapshot.result
                        .efficiency ??
                      "—"
                    }

                    % · Receita estimada:{" "}

                    {snapshot.result
                      .revenue_forecast ===
                    null
                      ? "Histórico insuficiente"
                      : money(
                          snapshot.result
                            .revenue_forecast
                        )}

                  </p>


                  <p className="text-xs">

                    Modelo{" "}

                    {
                      snapshot.model_version
                    }{" "}

                    · Gerada em{" "}

                    {new Date(
                      snapshot.created_at
                    ).toLocaleString(
                      "pt-BR"
                    )}

                    .{" "}

                    {snapshot.result.limitations.join(
                      " "
                    )}

                  </p>

                </details>
              )
            )

          ) : (

            <p>
              Nenhuma análise salva.
            </p>
          )}

        </section>

      </div>
    </AppShell>
  );
}