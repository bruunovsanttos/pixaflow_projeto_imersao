import {
  test,
  expect,
  type BrowserContext,
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


test.describe(
  "Nexora - regras de negócio em produção",
  () => {

    test.beforeEach(
      async ({ context }) => {
        await authenticate(context);
      }
    );


    test(
      "Dashboard usa os 28 dias operacionais",
      async ({ page }) => {

        await page.goto("/", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page
            .getByText(
              /28\/28 dias registrados/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "Dashboard possui saúde operacional calculada",
      async ({ page }) => {

        await page.goto("/", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page.getByText(
            "Saúde operacional · Cumprimento no prazo",
            {
              exact: true,
            }
          )
        ).toBeVisible();

        await expect(
          page
            .getByText(
              /83[,.]54/
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "Dashboard possui eficiência calculada",
      async ({ page }) => {

        await page.goto("/", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page
            .getByText(
              /88[,.]78%/
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "Dashboard possui previsão de receita",
      async ({ page }) => {

        await page.goto("/", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page
            .getByText(
              /45\.321|45,321|45321/
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "Dashboard possui riscos",
      async ({ page }) => {

        await page.goto("/", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page
            .getByText(
              /3.*riscos|riscos.*3/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "Dashboard possui oportunidades",
      async ({ page }) => {

        await page.goto("/", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page
            .getByText(
              /3.*oportunidades|oportunidades.*3/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "Dados diários exibem último registro",
      async ({ page }) => {

        await page.goto("/dados", {
          waitUntil: "domcontentloaded",
        });

        const dateInput =
          page
            .locator('input[type="date"]')
            .first();

        await expect(
          dateInput
        ).toBeVisible();

        await expect(
          dateInput
        ).toHaveValue(
          "2026-10-23"
        );

        const revenueInput =
          page.locator(
            'input[name="revenue"]'
          );

        await expect(
          revenueInput
        ).toBeVisible();

        await expect(
          revenueInput
        ).toHaveValue(
          /1880(?:\.00)?/
        );
      }
    );


    test(
      "último registro respeita tarefas",
      async ({ page }) => {

        await page.goto("/dados", {
          waitUntil: "domcontentloaded",
        });

        const planned =
          page.locator(
            'input[name="planned"]'
          );

        const completed =
          page.locator(
            'input[name="completed"]'
          );

        const onTime =
          page.locator(
            'input[name="on_time"]'
          );

        await expect(
          planned
        ).toBeVisible();

        await expect(
          completed
        ).toBeVisible();

        await expect(
          onTime
        ).toBeVisible();

        await expect(
          planned
        ).toHaveValue(
          "21"
        );

        await expect(
          completed
        ).toHaveValue(
          "19"
        );

        await expect(
          onTime
        ).toHaveValue(
          "16"
        );
      }
    );


    test(
      "Simulações não apresentam erro de carregamento",
      async ({ page }) => {

        await page.goto(
          "/simulador",
          {
            waitUntil:
              "domcontentloaded",
          }
        );

        await expect(
          page
            .getByText(
              /Simula/i
            )
            .first()
        ).toBeVisible();

        await expect(
          page.getByText(
            /erro ao carregar|não foi possível carregar/i
          )
        ).toHaveCount(0);
      }
    );


    test(
      "Assistente não apresenta erro inicial",
      async ({ page }) => {

        await page.goto(
          "/assistente",
          {
            waitUntil:
              "domcontentloaded",
          }
        );

        await expect(
          page
            .getByText(
              /Assistente/i
            )
            .first()
        ).toBeVisible();

        await expect(
          page.getByText(
            /erro ao carregar|não foi possível conectar/i
          )
        ).toHaveCount(0);
      }
    );

  }
);