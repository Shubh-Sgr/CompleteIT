import {test,expect} from "@playwright/test";

test("review fields keep focus while typing and source selection is accessible",async({page})=>{
  await page.goto("/create");
  const source=page.getByRole("button",{name:/Build from my list/});
  await source.focus();await source.press("Enter");
  await expect(source).toBeFocused();await expect(source).toHaveAttribute("aria-pressed","true");
  await page.getByLabel("Already have",{exact:true}).fill("Tent");
  await page.getByRole("button",{name:"Continue as entered"}).click();
  const name=page.getByRole("textbox",{name:"Item name 1",exact:true});
  await name.fill("");await name.pressSequentially("Weekend camping tent");
  await expect(name).toHaveValue("Weekend camping tent");await expect(name).toBeFocused();
  await expect(page.getByLabel("Creation progress").locator('[aria-current="step"]')).toContainText("Review");
});

test("network failures show recovery, not a misleading login request",async({page})=>{
  let fail=true;
  await page.route("**/api/v1/sets/mine",route=>fail?route.fulfill({status:500,json:{error:{message:"Temporary failure"}}}):route.continue());
  await page.goto("/my-sets");
  const recovery=page.getByRole("region",{name:"Page recovery"});
  await expect(recovery.getByRole("button",{name:"Try again"})).toBeVisible();
  await expect(recovery.getByRole("link",{name:"Log in",exact:true})).toHaveCount(0);
  fail=false;await recovery.getByRole("button",{name:"Try again"}).click();
  await expect(recovery.getByRole("link",{name:"Log in",exact:true})).toBeVisible();
});

test("unavailable products end loading and expose recovery",async({page})=>{
  await page.route("**/api/v1/products/unavailable",route=>route.fulfill({status:404,json:{error:{message:"Not found"}}}));
  await page.goto("/products/unavailable");
  await expect(page.getByRole("region",{name:"Page recovery"})).toBeVisible({timeout:20000});
  await expect(page.getByText("Loading this item",{exact:true})).toHaveCount(0);
});

test("search and compact navigation fit narrow screens in both themes",async({page})=>{
  for(const width of [320,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const theme of ["light","dark"]){
      await page.goto("/search");
      await page.evaluate(theme=>{localStorage.setItem("theme",theme);document.documentElement.classList.toggle("dark",theme==="dark")},theme);
      await expect(page.getByRole("heading",{name:"Find the missing piece."})).toBeVisible();await expect(page.getByRole("link",{name:"Search anything"})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const box=await page.getByRole("textbox",{name:"Search",exact:true}).boundingBox();
      expect(box!.width).toBeGreaterThan(200);
    }
  }
});

test("account menu dismisses with Escape and outside click",async({page})=>{
  await page.goto("/login");await page.getByLabel("Email").fill("aisha@completeit.local");
  await page.getByLabel("Password",{exact:true}).fill("CompleteIt@123");
  await page.getByRole("button",{name:"Log in",exact:true}).click();await expect(page).toHaveURL(/\/my-sets$/);
  const menu=page.getByLabel("Open account menu"),details=page.locator("details.account-menu");
  await menu.click();await expect(details).toHaveAttribute("open","");
  await page.keyboard.press("Escape");await expect(details).not.toHaveAttribute("open","");await expect(menu).toBeFocused();
  await menu.click();await page.mouse.click(4,100);await expect(details).not.toHaveAttribute("open","");
  const badges=page.locator(".set-card").first().locator(".set-card-type");await expect(badges).toHaveCount(2);
  const first=await badges.nth(0).boundingBox(),second=await badges.nth(1).boundingBox();
  expect(first!.x+first!.width<=second!.x||first!.y+first!.height<=second!.y).toBe(true);
});
