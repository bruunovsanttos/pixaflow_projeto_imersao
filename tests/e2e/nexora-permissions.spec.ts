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

type Role =
  | "admin"
  | "operator"
  | "viewer";

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

async function mockRole(
  page: Page,
  role: Role
) {
  await page.route(
    "**/api/v1/auth/me",
    async (route) => {
      const response =
        await route.fetch();

      const body =
        await response.json();

      body.memberships =
        body.memberships.map(
          (
            membership: {
              id: string;
              company_id: string;
              role: string;
            }
          ) => ({
            ...membership,
            role,
          })
        );

      await route.fulfill({
        response,
        json: body,
      });
    }
  );
}

async function openDailyData(
  page: Page,
  role: Role
) {
  await mockRole(
    page,
    role
  );

  await page.goto(
    "/dados",
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
          /Dados diários/i,
      }
    )
  ).toBeVisible();
}

async function openSimulator(
  page: Page,
  role: Role
) {
  await mockRole(
    page,
    role
  );

  await page.goto(
    "/simulador",
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
          /Simulador de Decisões/i,
      }
    )
  ).toBeVisible();
}

async function runSimulation(
  page: Page
) {
  const decision =
    page.locator(
      "#decision"
    );

  const amount =
    page.locator(
      "#amount"
    );

  await expect(
    decision
  ).toBeVisible();

  await expect(
    amount
  ).toBeVisible();

  await decision.fill(
    "Teste de permissão E2E"
  );

  await amount.fill(
    "10"
  );

  const simulate =
    page.getByRole(
      "button",
      {
        name:
          /Simular decisão/i,
      }
    );

  await expect(
    simulate
  ).toBeEnabled();

  await simulate.click();

  await expect(
    page.getByRole(
      "button",
      {
        name:
          /Salvar cenário/i,
      }
    )
  ).toBeVisible();
}

test.describe(
  "Nexora - permissões no frontend",
  () => {

    let context:
      BrowserContext;

    test.beforeAll(
      async ({
        browser,
      }) => {

        context =
          await browser.newContext({
            baseURL:
              BASE_URL,
          });

        await authenticate(
          context
        );
      }
    );

    test.afterAll(
      async () => {
        await context?.close();
      }
    );

    test(
      "admin pode editar dados diários",
      async () => {

        const page =
          await context.newPage();

        try {
          await openDailyData(
            page,
            "admin"
          );

          await expect(
            page.getByText(
              /Seu perfil permite somente consulta/i
            )
          ).toHaveCount(0);

          await expect(
            page.locator(
              'input[name="revenue"]'
            )
          ).toBeEnabled();

          await expect(
            page.getByRole(
              "button",
              {
                name:
                  /Salvar dia/i,
              }
            )
          ).toBeEnabled();

        } finally {
          await page.close();
        }
      }
    );

    test(
      "operator pode editar dados diários",
      async () => {

        const page =
          await context.newPage();

        try {
          await openDailyData(
            page,
            "operator"
          );

          await expect(
            page.getByText(
              /Seu perfil permite somente consulta/i
            )
          ).toHaveCount(0);

          await expect(
            page.locator(
              'input[name="revenue"]'
            )
          ).toBeEnabled();

          await expect(
            page.getByRole(
              "button",
              {
                name:
                  /Salvar dia/i,
              }
            )
          ).toBeEnabled();

        } finally {
          await page.close();
        }
      }
    );

    test(
      "viewer fica somente em consulta nos dados diários",
      async () => {

        const page =
          await context.newPage();

        try {
          await openDailyData(
            page,
            "viewer"
          );

          await expect(
            page.getByText(
              /Seu perfil permite somente consulta/i
            )
          ).toBeVisible();

          await expect(
            page.locator(
              'input[name="revenue"]'
            )
          ).toBeDisabled();

          await expect(
            page.getByRole(
              "button",
              {
                name:
                  /Salvar dia/i,
              }
            )
          ).toBeDisabled();

          await expect(
            page.getByRole(
              "button",
              {
                name:
                  /Gerar e salvar análise/i,
              }
            )
          ).toBeDisabled();

        } finally {
          await page.close();
        }
      }
    );

    test(
      "admin pode salvar cenário",
      async () => {

        const page =
          await context.newPage();

        try {
          await openSimulator(
            page,
            "admin"
          );

          await runSimulation(
            page
          );

          await expect(
            page.getByRole(
              "button",
              {
                name:
                  /Salvar cenário/i,
              }
            )
          ).toBeEnabled();

          await expect(
            page.getByText(
              /não permite salvar alterações/i
            )
          ).toHaveCount(0);

        } finally {
          await page.close();
        }
      }
    );

    test(
      "operator pode salvar cenário",
      async () => {

        const page =
          await context.newPage();

        try {
          await openSimulator(
            page,
            "operator"
          );

          await runSimulation(
            page
          );

          await expect(
            page.getByRole(
              "button",
              {
                name:
                  /Salvar cenário/i,
              }
            )
          ).toBeEnabled();

          await expect(
            page.getByText(
              /não permite salvar alterações/i
            )
          ).toHaveCount(0);

        } finally {
          await page.close();
        }
      }
    );

    test(
      "viewer pode simular mas não salvar cenário",
      async () => {

        const page =
          await context.newPage();

        try {
          await openSimulator(
            page,
            "viewer"
          );

          await runSimulation(
            page
          );

          await expect(
            page.getByRole(
              "button",
              {
                name:
                  /Salvar cenário/i,
              }
            )
          ).toBeDisabled();

          await expect(
            page.getByText(
              /Seu perfil permite simular e consultar cenários/i
            )
          ).toBeVisible();

        } finally {
          await page.close();
        }
      }
    );
  }
);
