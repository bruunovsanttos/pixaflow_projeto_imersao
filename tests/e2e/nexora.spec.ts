import {
  test,
  expect,
  type Page,
} from "@playwright/test";


const EMAIL =
  process.env.NEXORA_TEST_EMAIL ??
  "bruno@bellastudio.com.br";

const PASSWORD =
  process.env.NEXORA_TEST_PASSWORD;


function requirePassword(): string {
  if (!PASSWORD) {
    throw new Error(
      "NEXORA_TEST_PASSWORD não está definida no PowerShell."
    );
  }

  return PASSWORD;
}


async function loginThroughUI(
  page: Page
) {
  const password =
    requirePassword();

  /*
   * O projeto chromium já possui storageState.
   * Para testar login de verdade,
   * limpamos a sessão desta página/contexto.
   */
  await page.context().clearCookies();

  await page.goto(
    "/login",
    {
      waitUntil:
        "networkidle",

      timeout:
        60_000,
    }
  );

  const emailInput =
    page.locator(
      'input[type="email"]'
    );

  const passwordInput =
    page.locator(
      'input[type="password"]'
    );

  const loginButton =
    page
      .getByRole(
        "button",
        {
          name:
            /entrar|login|acessar/i,
        }
      )
      .first();

  await expect(
    emailInput
  ).toBeVisible();

  await expect(
    passwordInput
  ).toBeVisible();

  await expect(
    loginButton
  ).toBeVisible();

  await emailInput.fill(
    EMAIL
  );

  await passwordInput.fill(
    password
  );

  await page.waitForTimeout(
    1000
  );

  await loginButton.click();

  await expect(
    page
  ).not.toHaveURL(
    /\/login(?:\?|$)/,
    {
      timeout:
        30_000,
    }
  );

  await expect(
    page
      .getByText(
        "Bella Studio"
      )
      .first()
  ).toBeVisible({
    timeout:
      30_000,
  });
}


test.describe(
  "Nexora E2E",
  () => {

    test(
      "login funciona",
      async ({ page }) => {

        await loginThroughUI(
          page
        );

        await expect(
          page
            .getByText(
              "Bella Studio"
            )
            .first()
        ).toBeVisible();
      }
    );


    test.describe(
      "área autenticada",
      () => {

        test(
          "Dashboard carrega",
          async ({ page }) => {

            await page.goto(
              "/",
              {
                waitUntil:
                  "domcontentloaded",
              }
            );

            await expect(
              page
                .getByText(
                  /Saúde operacional/i
                )
                .first()
            ).toBeVisible();
          }
        );


        test(
          "receita estimada aparece",
          async ({ page }) => {

            await page.goto(
              "/",
              {
                waitUntil:
                  "domcontentloaded",
              }
            );

            await expect(
              page.getByText(
                /45\.?321[,.]43/
              ).first()
            ).toBeVisible();
          }
        );


        test(
          "eficiência aparece",
          async ({ page }) => {

            await page.goto(
              "/",
              {
                waitUntil:
                  "domcontentloaded",
              }
            );

            await expect(
              page.getByText(
                /88[,.]78/
              ).first()
            ).toBeVisible();
          }
        );


        test(
          "dados diários carregam",
          async ({ page }) => {

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

            await expect(
              page.locator(
                'input[name="revenue"]'
              )
            ).toBeVisible();
          }
        );


        test(
          "riscos carregam",
          async ({ page }) => {

            await page.goto(
              "/riscos",
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
                    /Riscos/i,
                }
              )
            ).toBeVisible();
          }
        );


        test(
          "oportunidades carregam",
          async ({ page }) => {

            await page.goto(
              "/oportunidades",
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
                    /Oportunidades/i,
                }
              )
            ).toBeVisible();
          }
        );


        test(
          "linha do tempo carrega",
          async ({ page }) => {

            await page.goto(
              "/linha-do-tempo",
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
                    /Linha do Tempo/i,
                }
              )
            ).toBeVisible();
          }
        );


        test(
          "simulações carregam",
          async ({ page }) => {

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
        );


        test(
          "assistente carrega",
          async ({ page }) => {

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
                    /Assistente/i,
                }
              )
            ).toBeVisible();
          }
        );


        test(
          "sessão permanece após atualizar",
          async ({ page }) => {

            await page.goto(
              "/",
              {
                waitUntil:
                  "domcontentloaded",
              }
            );

            await expect(
              page
                .getByText(
                  "Bella Studio"
                )
                .first()
            ).toBeVisible();

            await page.reload({
              waitUntil:
                "domcontentloaded",
            });

            await expect(
              page
                .getByText(
                  "Bella Studio"
                )
                .first()
            ).toBeVisible();

            await expect(
              page
            ).not.toHaveURL(
              /\/login/
            );
          }
        );
      }
    );
  }
);