import {
  test as setup,
  expect,
} from "@playwright/test";

const EMAIL =
  process.env.NEXORA_TEST_EMAIL ??
  "bruno@bellastudio.com.br";

const PASSWORD =
  process.env.NEXORA_TEST_PASSWORD;

const BASE_URL =
  process.env.NEXORA_E2E_URL ??
  "https://pixaflow-projeto-imersao.onrender.com";

const AUTH_FILE =
  "playwright/.auth/user.json";

function requirePassword(): string {
  if (!PASSWORD) {
    throw new Error(
      "NEXORA_TEST_PASSWORD não está definida."
    );
  }

  return PASSWORD;
}

setup(
  "autentica usuário de teste",
  async ({ request }) => {
    const response =
      await request.post(
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

    await request.storageState({
      path: AUTH_FILE,
    });
  }
);