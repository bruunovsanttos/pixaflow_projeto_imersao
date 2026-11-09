import {
  test,
  expect,
  type Page,
} from "@playwright/test";


async function openSimulator(
  page: Page
) {
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


test.describe(
  "Nexora - ações reais pelo frontend",
  () => {

    test(
      "executa uma simulação pelo frontend",
      async ({ page }) => {

        await openSimulator(
          page
        );

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
          "Aumentar investimento para teste E2E"
        );

        await amount.fill(
          "10"
        );

        const button =
          page.getByRole(
            "button",
            {
              name:
                /Simular decisão/i,
            }
          );

        await expect(
          button
        ).toBeEnabled();

        await button.click();

        await expect(
          page.getByRole(
            "button",
            {
              name:
                /Salvar cenário/i,
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
      "salva cenário e remove depois do teste",
      async ({ page }) => {

        await openSimulator(
          page
        );

        const uniqueName =
          `E2E cenário ${Date.now()}`;

        await page
          .locator("#decision")
          .fill(uniqueName);

        await page
          .locator("#amount")
          .fill("10");

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
        ).toBeEnabled();

        await saveButton.click();

        await expect(
          page.getByText(
            /Cenário salvo na empresa/i
          )
        ).toBeVisible();

        const scenario =
          page
            .locator("li")
            .filter({
              hasText:
                uniqueName,
            });

        await expect(
          scenario
        ).toBeVisible();

        const removeButton =
          scenario.getByRole(
            "button",
            {
              name:
                /Remover cenário/i,
            }
          );

        await expect(
          removeButton
        ).toBeVisible();

        await removeButton.click();

        await expect(
          scenario
        ).toHaveCount(0);
      }
    );


    test(
      "Assistente consulta dados reais da empresa",
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

        const question =
          page.getByLabel(
            "Pergunta ao assistente"
          );

        await expect(
          question
        ).toBeVisible();

        await question.fill(
          "Quais são os principais riscos da empresa?"
        );

        const send =
          page.getByRole(
            "button",
            {
              name:
                /enviar|perguntar/i,
            }
          );

        await expect(
          send
        ).toBeEnabled();

        await send.click();

        await expect(
          page.getByText(
            /Fonte:/i
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