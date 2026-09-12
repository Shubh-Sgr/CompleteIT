import {test, expect, request, type Page} from "@playwright/test";

test.beforeEach(async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // Run after the test actions, including unhandled promise rejections.
  (page as Page & {runtimeErrors: string[]}).runtimeErrors = errors;
});
test.afterEach(async ({page}) => {
  expect((page as Page & {runtimeErrors: string[]}).runtimeErrors).toEqual([]);
});

async function login(page: Page, email = "aisha@completeit.local") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", {exact: true}).fill("CompleteIt@123");
  await page.getByRole("button", {name: "Log in", exact: true}).click();
  await expect(page).toHaveURL(/\/my-sets$/);
}

test("every existing route survives a direct visit and browser refresh", async ({page}) => {
  test.setTimeout(180_000);
  await login(page);
  const {products} = await (await page.request.get("/api/v1/products")).json();
  const {worlds} = await (await page.request.get("/api/v1/product-worlds")).json();
  const {sets} = await (await page.request.get("/api/v1/sets/mine")).json();
  const ownSet = sets[0];
  expect(ownSet).toBeTruthy();
  const routes: [string, string | RegExp][] = [
    ["/", /Everything you need/], ["/create", "Describe anything"], ["/explore", "Ideas for every part of life."],
    ["/search", "Find the missing piece."], ["/login", "Continue building"], ["/register", "Start completing"],
    ["/my-sets", "My Sets"],
    ...["drafts", "private", "followers", "published", "unlisted", "forked", "following", "archived"].map(filter => [`/my-sets/${filter}`, "My Sets"] as [string, string]),
    ["/notifications", "Your inbox"], ["/following", "Following"], ["/settings", "Settings"], ["/moderation", "Moderation audit"],
    [`/sets/${ownSet.slug}`, ownSet.title], [`/sets/${ownSet.slug}/edit`, "Edit your set"],
    [`/sets/${ownSet.slug}/compare`, "Compare set outcomes"], [`/sets/${ownSet.slug}/fork`, "Make this set yours"],
    ["/users/aisha", /Aisha/], [`/products/${products[0].id}`, products[0].name],
    [`/product-worlds/${worlds[0].slug}`, worlds[0].title], ["/missing-migration-page", "We could not find that page"]
  ];
  for (const [path, heading] of routes) {
    await test.step(path, async () => {
      await page.goto(path);
      await expect(page.getByRole("heading", {level: 1})).toHaveText(heading);
      await page.reload();
      await expect(page.getByRole("heading", {level: 1})).toHaveText(heading);
      await expect(page.locator("#main-content")).toHaveAttribute("tabindex", "-1");
    });
  }
});

test("links stay client-side, browser history works, and themes survive reload", async ({page}) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toHaveValue("");
  await expect(page.getByLabel("Password", {exact: true})).toHaveValue("");
  await page.evaluate(() => { (window as any).migrationMarker = "same-document"; });
  await page.getByRole("link", {name: "CompleteIt home"}).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => (window as any).migrationMarker)).toBe("same-document");
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", {name: "Continue building"})).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", {level: 1})).toContainText("Everything you need");
  await page.getByRole("button", {name: "Toggle color theme"}).click();
  const theme = await page.evaluate(() => localStorage.getItem("theme"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(theme!);
  await expect(page).toHaveTitle("CompleteIt — Complete anything");
  expect((await page.request.get("/manifest.webmanifest")).ok()).toBe(true);
});

test("My Sets filter changes preserve search and sort without adding history entries", async ({page}) => {
  await login(page);
  await page.getByLabel("Search my sets").fill("Student desk");
  await page.getByLabel("Sort sets").selectOption("name");
  const historyLength = await page.evaluate(() => history.length);
  await page.getByRole("button", {name: /^Private/}).click();
  await expect(page).toHaveURL(/\/my-sets\/private$/);
  await expect(page.getByLabel("Search my sets")).toHaveValue("Student desk");
  await expect(page.getByLabel("Sort sets")).toHaveValue("name");
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.reload();
  await expect(page.getByRole("button", {name: /^Private/})).toHaveAttribute("aria-pressed", "true");
});

test("back navigation restores the previous scroll position", async ({page}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {level: 1})).toContainText("Everything you need");
  await page.evaluate(() => window.scrollTo({top: 650, behavior: "instant"}));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(650);
  await page.getByRole("link", {name: "Login", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Continue building"})).toBeVisible();
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(650);
});

test("catalogue anchor and guest migration query parameters are preserved", async ({page}) => {
  const {products} = await (await page.request.get("/api/v1/products")).json();
  const product = products[0];
  await page.goto(`/create?anchor=${product.id}`);
  await expect(page.getByLabel("Item name 1")).toHaveValue(product.name);
  await expect(page.getByLabel("Brand 1")).toHaveValue(product.brand);
  await page.reload();
  await expect(page.getByLabel("Item name 1")).toHaveValue(product.name);
  await page.goto("/register?migrate=1");
  await expect(page.getByText(/Your temporary set is ready/)).toBeVisible();
  await expect(page.getByRole("heading", {level: 1})).toHaveText("Save your set");
});

test("logout handles an empty API response and clears authentication across reloads", async ({page}) => {
  await login(page);
  await page.getByLabel("Open account menu").click();
  const response = page.waitForResponse(r => r.url().endsWith("/api/v1/auth/logout"));
  await page.getByRole("button", {name: "Logout", exact: true}).click();
  expect((await response).status()).toBe(204);
  await expect(page).toHaveURL(/\/login$/);
  await page.reload();
  await expect(page.getByRole("link", {name: "Login", exact: true})).toBeVisible();
  expect((await page.request.get("/api/v1/sets/mine")).status()).toBe(401);
});

test("saving and editing a manual set retains brands, owned/planned status, and titles", async ({page}, info) => {
  await login(page, "rohan@completeit.local");
  await page.goto("/create");
  await page.getByRole("button", {name: /Build from my list/}).click();
  await page.getByLabel("What should this set accomplish?").fill("Prepare a portable painting kit");
  await page.getByLabel("Already have").fill("Watercolour palette | arts | Test Brand | 500");
  await page.getByLabel("Want to add").fill("Brush roll | arts | Studio Brand | 200");
  await page.getByRole("button", {name: "Continue as entered"}).click();
  await expect(page.getByLabel("Brand 1")).toHaveValue("Test Brand");
  await expect(page.getByLabel("Item status 2")).toHaveValue("planned");
  await page.getByRole("button", {name: "Continue", exact: true}).click();
  await page.getByRole("button", {name: "Build my set with AI"}).click();
  await expect(page.getByText("Custom completion plan")).toBeVisible();
  const saved = page.waitForResponse(r => r.url().endsWith("/api/v1/sets") && r.request().method() === "POST");
  await page.getByRole("button", {name: "Save this set"}).click();
  const response = await saved;
  expect(response.ok()).toBe(true);
  const {set} = await response.json();
  await expect(page).toHaveURL(/\/my-sets$/);
  await page.goto(`/sets/${set.slug}/edit`);
  const title = `React migration ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Set title").fill(title);
  await page.getByRole("button", {name: "Save details"}).click();
  await expect(page.getByRole("status").filter({hasText: "Set details saved."})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Set title")).toHaveValue(title);
  const details = await (await page.request.get(`/api/v1/sets/${set.slug}`)).json();
  expect(details.set.items).toEqual(expect.arrayContaining([
    expect.objectContaining({owned: true, product: expect.objectContaining({brand: "Test Brand"})}),
    expect.objectContaining({owned: false, product: expect.objectContaining({brand: "Studio Brand"})})
  ]));
});

test("notification read/unread and redirects reach the exact asynchronously loaded comment", async ({page}, info) => {
  await login(page);
  const title = `Notification migration ${info.project.name} ${Date.now()}`;
  const made = await page.request.post("/api/v1/sets", {data: {title, outcome: "Organize painting supplies", budget: 0, items: []}});
  expect(made.ok()).toBe(true);
  const {set} = await made.json();
  expect((await page.request.post(`/api/v1/sets/${set.slug}/publish`, {data: {visibility: "PUBLIC"}})).ok()).toBe(true);
  const other = await request.newContext({baseURL: "http://localhost:4000/api/v1/"});
  expect((await other.post("auth/login", {data: {email: "rohan@completeit.local", password: "CompleteIt@123"}})).ok()).toBe(true);
  expect((await other.post(`sets/${set.slug}/comments`, {data: {body: "A useful portable painting collection."}})).ok()).toBe(true);
  await other.dispose();
  await page.goto("/notifications");
  const card = page.locator("article").filter({hasText: title});
  await expect(card.getByRole("button", {name: "Mark read", exact: true})).toBeVisible();
  await card.getByRole("button", {name: "Mark read", exact: true}).click();
  await expect(card.getByRole("button", {name: "Mark unread", exact: true})).toBeVisible();
  await card.getByRole("button", {name: "Mark unread", exact: true}).click();
  await expect(card.getByRole("button", {name: "Mark read", exact: true})).toBeVisible();
  // Delay the detail response so hash scrolling must wait for its content.
  await page.route(`**/api/v1/sets/${set.slug}`, async route => {
    const response = await route.fetch();
    await new Promise(resolve => setTimeout(resolve, 350));
    await route.fulfill({response});
  });
  await card.getByRole("button", {name: "View activity"}).click();
  await expect(page).toHaveURL(new RegExp(`/sets/${set.slug}#comment-`));
  const comment = page.locator('[id^="comment-"]').filter({hasText: "A useful portable painting collection."});
  await expect(comment).toBeInViewport();
  await page.reload();
  await expect(comment).toBeInViewport();
});
