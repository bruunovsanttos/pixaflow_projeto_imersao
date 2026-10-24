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
      "NEXORA_TEST_PASSWORD não está definida no PowerShell."
    );
  }

  return PASSWORD;
}


/*
 * Login rápido para os testes internos.
 *
 * O request é feito pelo próprio BrowserContext.
 * Assim, o cookie de sessão recebido também fica disponível
 * para as páginas abertas nesse contexto.
 */
async function authenticate(context: BrowserContext) {
  const password = requirePassword();

  const response = await context.request.post(
    `${BASE_URL}/api/v1/auth/login`,
    {
      data: {
        email: EMAIL,
        password,
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


/*
 * Teste específico da interface de login.
 *
 * Esperamos o carregamento/hidratação antes de enviar
 * o formulário para evitar o submit HTML tradicional.
 */
async function loginThroughUI(page: Page) {
  const password = requirePassword();

  await page.goto("/login", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  const emailInput =
    page.locator('input[type="email"]');

  const passwordInput =
    page.locator('input[type="password"]');

  const loginButton = page
    .getByRole("button", {
      name: /entrar|login|acessar/i,
    })
    .first();

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(loginButton).toBeVisible();

  await emailInput.fill(EMAIL);
  await passwordInput.fill(password);

  // Pequena margem para a hidratação do React.
  await page.waitForTimeout(1000);

  await loginButton.click();

  await expect(page).not.toHaveURL(
    /\/login(?:\?|$)/,
    {
      timeout: 30_000,
    }
  );

  await expect(
    page.getByText("Bella Studio").first()
  ).toBeVisible({
    timeout: 30_000,
  });
}


test.describe("Nexora E2E", () => {

  /*
   * Este é o único teste que faz login através da tela.
   */
  test("login funciona", async ({ page }) => {
    await loginThroughUI(page);

    await expect(
      page.getByText("Bella Studio").first()
    ).toBeVisible();
  });


  /*
   * Os demais testes autenticam diretamente pela API.
   * Isso evita:
   *
   * - 11 logins seguidos
   * - rate limit 429
   * - problemas de hidratação
   * - testes desnecessariamente lentos
   */
  test.describe("área autenticada", () => {

    test.beforeEach(
      async ({ context }) => {
        await authenticate(context);
      }
    );


    test(
      "Dashboard carrega",
      async ({ page }) => {

        await page.goto("/", {
          waitUntil: "domcontentloaded",
        });

        await expect(
          page
            .getByText(
              "Saúde operacional · Cumprimento no prazo",
              {
                exact: true,
              }
            )
            .first()
        ).toBeVisible();

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
      "receita estimada aparece",
      async ({ page }) => {

        await page.goto("/");

        await expect(
          page
            .getByText(
              /Receita estimada/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "eficiência aparece",
      async ({ page }) => {

        await page.goto("/");

        await expect(
          page
            .getByText(
              /Eficiência/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "dados diários carregam",
      async ({ page }) => {

        await page.goto("/");

        await page
          .getByText(
            "Dados diários",
            {
              exact: true,
            }
          )
          .first()
          .click();

        await expect(
          page
            .getByText(
              /Receita realizada/i
            )
            .first()
        ).toBeVisible();

        await expect(
          page
            .getByText(
              /Tarefas previstas/i
            )
            .first()
        ).toBeVisible();

        await expect(
          page
            .getByText(
              /Minutos produtivos/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "riscos carregam",
      async ({ page }) => {

        await page.goto("/");

        await page
          .getByText(
            "Riscos",
            {
              exact: true,
            }
          )
          .first()
          .click();

        await expect(
          page
            .getByText(/Riscos/i)
            .first()
        ).toBeVisible();
      }
    );


    test(
      "oportunidades carregam",
      async ({ page }) => {

        await page.goto("/");

        await page
          .getByText(
            "Oportunidades",
            {
              exact: true,
            }
          )
          .first()
          .click();

        await expect(
          page
            .getByText(
              /Oportunidades/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "linha do tempo carrega",
      async ({ page }) => {

        await page.goto("/");

        await page
          .getByText(
            "Linha do Tempo",
            {
              exact: true,
            }
          )
          .first()
          .click();

        await expect(
          page
            .getByText(
              /Linha do Tempo/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "simulações carregam",
      async ({ page }) => {

        await page.goto("/");

        await page
          .getByText(
            "Simulações",
            {
              exact: true,
            }
          )
          .first()
          .click();

        await expect(
          page
            .getByText(/Simula/i)
            .first()
        ).toBeVisible();
      }
    );


    test(
      "assistente carrega",
      async ({ page }) => {

        await page.goto("/");

        await page
          .getByText(
            "Assistente",
            {
              exact: true,
            }
          )
          .first()
          .click();

        await expect(
          page
            .getByText(/Assistente/i)
            .first()
        ).toBeVisible();
      }
    );


    test(
      "sessão permanece após atualizar",
      async ({ page }) => {

        await page.goto("/");

        await expect(
          page
        ).not.toHaveURL(/\/login/);

        await page.reload({
          waitUntil: "domcontentloaded",
        });

        await expect(
          page
        ).not.toHaveURL(/\/login/);

        await expect(
          page
            .getByText(
              "Bella Studio"
            )
            .first()
        ).toBeVisible();
      }
    );

  });

});