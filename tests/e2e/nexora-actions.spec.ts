import {
  test,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";


const EMAIL =
  process.env.NEXORA_TEST_EMAIL ??
  "bruno@bellastudio.com.br";

const PASSWORD =
  process.env.NEXORA_TEST_PASSWORD;

const BASE_URL =
  process.env.NEXORA_E2E_URL ??
  "https://pixaflow-projeto-imersao.onrender.com";


function requirePassword(): string {
  if (!PASSWORD) {
    throw new Error(
      "NEXORA_TEST_PASSWORD não está definida."
    );
  }

  return PASSWORD;
}


async function authenticate(
  context: BrowserContext
) {
  const response =
    await context.request.post(
      `${BASE_URL}/api/v1/auth/login`,
      {
        data: {
          email: EMAIL,
          password: requirePassword(),
        },

        headers: {
          Origin: BASE_URL,
          Accept: "application/json",
        },
      }
    );

  expect(
    response.status(),
    await response.text()
  ).toBe(200);
}


async function openSimulator(
  page: Page
) {
  await page.goto("/simulador", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", {
      name: /Simulador de Decisões/i,
    })
  ).toBeVisible();
}


test.describe(
  "Nexora - ações reais pelo frontend",
  () => {

    let context: BrowserContext;


    /*
     * Faz apenas UM login para toda a suíte.
     *
     * Isso evita disparar o rate limit
     * de autenticação do Nexora.
     */
    test.beforeAll(
      async ({ browser }) => {

        context =
          await browser.newContext({
            baseURL: BASE_URL,
          });

        await authenticate(context);
      }
    );


    test.afterAll(
      async () => {
        await context?.close();
      }
    );


    test(
      "executa uma simulação pelo frontend",
      async () => {

        const page =
          await context.newPage();

        try {
          await openSimulator(page);


          const decision =
            page.locator("#decision");

          const amount =
            page.locator("#amount");


          await expect(
            decision
          ).toBeVisible();

          await expect(
            amount
          ).toBeVisible();


          await decision.fill(
            "Teste E2E de decisão operacional"
          );

          await amount.fill("10");


          const simulateButton =
            page.getByRole(
              "button",
              {
                name:
                  /Simular decisão/i,
              }
            );


          await expect(
            simulateButton
          ).toBeEnabled();


          await simulateButton.click();


          /*
           * Quando existe resultado,
           * o botão de salvar aparece.
           */
          const saveButton =
            page.getByRole(
              "button",
              {
                name:
                  /Salvar cenário/i,
              }
            );


          await expect(
            saveButton
          ).toBeVisible();


          await expect(
            saveButton
          ).toBeEnabled();


          /*
           * Nenhum erro da simulação
           * deve estar sendo exibido.
           */
          await expect(
            page.getByRole("alert")
          ).toHaveCount(0);

        } finally {
          await page.close();
        }
      }
    );


    test(
      "salva cenário e remove depois do teste",
      async () => {

        const page =
          await context.newPage();

        const uniqueQuestion =
          `E2E cenário ${Date.now()}`;


        try {
          await openSimulator(page);


          const decision =
            page.locator("#decision");

          const amount =
            page.locator("#amount");


          await decision.fill(
            uniqueQuestion
          );

          await amount.fill("10");


          await page
            .getByRole(
              "button",
              {
                name:
                  /Simular decisão/i,
              }
            )
            .click();


          const saveButton =
            page.getByRole(
              "button",
              {
                name:
                  /Salvar cenário/i,
              }
            );


          await expect(
            saveButton
          ).toBeVisible();

          await expect(
            saveButton
          ).toBeEnabled();


          /*
           * Salva no backend real.
           */
          await saveButton.click();


          /*
           * O cenário criado deve
           * aparecer no histórico.
           */
          const savedScenario =
            page
              .locator("li")
              .filter({
                hasText:
                  uniqueQuestion,
              });


          await expect(
            savedScenario
          ).toBeVisible({
            timeout: 20000,
          });


          /*
           * Nenhum erro de salvamento.
           */
          await expect(
            page.getByText(
              /não foi possível salvar/i
            )
          ).toHaveCount(0);


          /*
           * Localiza o botão de remoção
           * somente dentro do cenário
           * criado pelo teste.
           */
          const removeButton =
            savedScenario.getByRole(
              "button",
              {
                name:
                  /Remover cenário/i,
              }
            );


          await expect(
            removeButton
          ).toBeVisible();


          /*
           * Apaga o cenário criado pelo
           * próprio teste.
           */
          await removeButton.click();


          /*
           * Confirma que saiu
           * do histórico.
           */
          await expect(
            savedScenario
          ).toHaveCount(
            0,
            {
              timeout: 20000,
            }
          );


          await expect(
            page.getByText(
              /não foi possível remover/i
            )
          ).toHaveCount(0);

        } finally {
          await page.close();
        }
      }
    );


    test(
      "Assistente consulta dados reais da empresa",
      async () => {

        const page =
          await context.newPage();

        try {

          await page.goto(
            "/assistente",
            {
              waitUntil:
                "domcontentloaded",
            }
          );


          await expect(
            page.getByRole(
              "heading",
              {
                name:
                  /Assistente Nexora/i,
              }
            )
          ).toBeVisible();


          const input =
            page.getByLabel(
              "Pergunta ao assistente"
            );


          await expect(
            input
          ).toBeVisible();

          await expect(
            input
          ).toBeEnabled();


          const question =
            "Quais são os principais riscos da empresa?";


          await input.fill(
            question
          );


          const sendButton =
            page.getByRole(
              "button",
              {
                name: "Enviar",
              }
            );


          await expect(
            sendButton
          ).toBeEnabled();


          await sendButton.click();


          /*
           * Confirma que a pergunta
           * foi enviada.
           */
          await expect(
            page.getByText(
              question,
              {
                exact: true,
              }
            )
          ).toBeVisible();


          /*
           * Aguarda resposta real
           * do backend.
           *
           * Uma resposta válida do
           * Nexora apresenta fontes.
           */
          await expect(
            page.getByText(
              /Fonte:/i
            ).first()
          ).toBeVisible({
            timeout: 30000,
          });


          /*
           * Não deve existir erro.
           */
          await expect(
            page.getByRole(
              "alert"
            )
          ).toHaveCount(0);


          /*
           * O estado de carregamento
           * deve desaparecer.
           */
          await expect(
            page.getByText(
              /Consultando os dados da empresa/i
            )
          ).toHaveCount(0);


        } finally {
          await page.close();
        }
      }
    );

  }
);
