import {
  test,
  expect,
} from "@playwright/test";


test.describe(
  "Nexora - regras de negócio em produção",
  () => {

    test(
      "Dashboard usa os 28 dias operacionais",
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
              /28\/28 dias registrados/i
            )
            .first()
        ).toBeVisible();
      }
    );


    test(
      "Dashboard possui saúde operacional calculada",
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
            /83[,.]54/
          ).first()
        ).toBeVisible();
      }
    );


    test(
      "Dashboard possui eficiência calculada",
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
      "Dashboard possui previsão de receita",
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
      "Dashboard possui riscos",
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

        await expect(
          page.getByRole(
            "alert"
          )
        ).toHaveCount(0);
      }
    );


    test(
      "Dashboard possui oportunidades",
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

        await expect(
          page.getByRole(
            "alert"
          )
        ).toHaveCount(0);
      }
    );


    test(
      "Dados diários exibem último registro",
      async ({ page }) => {

        await page.goto(
          "/dados",
          {
            waitUntil:
              "domcontentloaded",
          }
        );

        const date =
          page.locator(
            'input[type="date"]'
          ).first();

        await expect(
          date
        ).toHaveValue(
          "2026-10-23"
        );

        await expect(
          page.locator(
            'input[name="revenue"]'
          )
        ).toHaveValue(
          /1880(?:\.00)?/
        );
      }
    );


    test(
      "último registro respeita tarefas",
      async ({ page }) => {

        await page.goto(
          "/dados",
          {
            waitUntil:
              "domcontentloaded",
          }
        );

        await expect(
          page.locator(
            'input[name="planned"]'
          )
        ).toHaveValue(
          "21"
        );

        await expect(
          page.locator(
            'input[name="completed"]'
          )
        ).toHaveValue(
          "19"
        );

        await expect(
          page.locator(
            'input[name="on_time"]'
          )
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
          page.getByRole(
            "heading",
            {
              name:
                /Simulador de Decisões/i,
            }
          )
        ).toBeVisible();

        await expect(
          page.getByRole(
            "alert"
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
          page.getByRole(
            "heading",
            {
              name:
                /Assistente/i,
            }
          )
        ).toBeVisible();

        await expect(
          page.getByRole(
            "alert"
          )
        ).toHaveCount(0);
      }
    );
  }
);