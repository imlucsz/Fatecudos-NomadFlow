import { expect, test } from "@playwright/test";

test("landing pública renderiza navegação e chamada principal", async ({page}) => {
  await page.goto("/");
  await expect(page.getByRole("link",{name:/Planejar viagem/i}).first()).toBeVisible();
  await expect(page.getByRole("link",{name:"Explorar"}).first()).toBeVisible();
});

test("rotas protegidas explicam acesso local em vez de falhar", async ({page}) => {
  await page.goto("/viagens");
  await expect(page.getByText(/Minhas viagens/i).first()).toBeVisible();
  await expect(page.getByText(/perfil|entrar|cadastro|navegador/i).first()).toBeVisible();
});
