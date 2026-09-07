import {test,expect,request} from "@playwright/test";

async function login(page:any,email="aisha@completeit.local"){
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password",{exact:true}).fill("CompleteIt@123");
  await page.getByRole("button",{name:"Log in"}).click();
  await expect(page).toHaveURL(/\/my-sets/);
}

test("guest completes a category-neutral manual plan and reaches private migration",async({page})=>{
  await page.goto("/create");
  await page.getByRole("button",{name:/Build from my list/}).click();
  await page.getByLabel("What should this set accomplish?").fill("Prepare everything needed for a two-day camping trip.");
  await page.getByLabel("Already have").fill("Tent | camping");
  await page.getByLabel("Want to add").fill("Portable stove | camping");
  await page.getByRole("button",{name:"Continue as entered"}).click();
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByRole("button",{name:"Build my set with AI"}).click();
  await expect(page.getByText("Custom completion plan")).toBeVisible();
  await expect(page.getByText("Best-value path")).toBeVisible();
  await page.getByRole("button",{name:"Save this set"}).click();
  await expect(page.getByText(/Your temporary set is ready.*stay private/)).toBeVisible();
});

test("public discovery never labels a set private",async({page})=>{
  await page.goto("/explore");
  await expect(page.getByRole("heading",{name:"Ideas for every part of life."})).toBeVisible();
  await expect(page.getByText("private",{exact:true})).toHaveCount(0);
});

test("signed-in users can log out from the persistent navigation",async({page})=>{
  await login(page);
  await page.getByLabel("Open account menu").click();
  await expect(page.getByRole("button",{name:"Logout"})).toBeVisible();
  await page.getByRole("button",{name:"Logout"}).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading",{name:"Continue building"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Login"})).toBeVisible();
});

test("My Sets filters, search and sort change the visible library",async({page})=>{
  await login(page);
  await expect(page.getByRole("button",{name:/All/})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:/Drafts/}).click();
  await expect(page).toHaveURL(/\/my-sets\/drafts/);
  await expect(page.getByRole("button",{name:/Drafts/})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:/All/}).click();
  await expect(page).toHaveURL(/\/my-sets$/);
  await page.getByLabel("Search my sets").fill("Student desk under");
  await expect(page.getByText(/Showing 1 of/)).toBeVisible();
  await page.getByLabel("Sort sets").selectOption("name");
  await page.getByRole("button",{name:"Clear search"}).click();
  await page.getByRole("button",{name:/Following/}).click();
  await expect(page).toHaveURL(/\/my-sets\/following/);
});

test("an owner can publish a private set from its detail page",async({page},testInfo)=>{
  await login(page,"rohan@completeit.local");
  const made=await page.request.post("http://localhost:4000/api/v1/sets",{data:{title:`Visibility ${testInfo.project.name} ${Date.now()}`,description:"Visibility control test",outcome:"Build a study setup",budget:30000,items:[]}});
  expect(made.ok()).toBe(true);
  const {set}=await made.json();
  await page.goto(`/sets/${set.slug}`);
  await expect(page.getByText("Owner controls")).toBeVisible();
  await page.getByLabel("Who can view this set?").selectOption("PUBLIC");
  await page.getByRole("button",{name:"Apply visibility"}).click();
  await expect(page.getByRole("status")).toContainText("published publicly");
  await expect(page.getByText("public",{exact:true})).toBeVisible();
});

test("a followed set can be unfollowed from the same control",async({page},testInfo)=>{
  const owner=await request.newContext({baseURL:"http://localhost:4000/api/v1/"});
  const ownerLogin=await owner.post("auth/login",{data:{email:"rohan@completeit.local",password:"CompleteIt@123"}});
  expect(ownerLogin.ok()).toBe(true);
  const made=await owner.post("sets",{data:{title:`Follow toggle ${testInfo.project.name} ${Date.now()}`,description:"Follow control test",outcome:"Build a study setup",budget:30000,items:[]}});
  expect(made.ok()).toBe(true);
  const {set}=await made.json();
  const published=await owner.post(`sets/${set.slug}/publish`,{data:{visibility:"PUBLIC"}});
  expect(published.ok()).toBe(true);
  await owner.dispose();
  await login(page);
  await page.goto(`/sets/${set.slug}`);
  await page.getByRole("button",{name:"Follow",exact:true}).click();
  await expect(page.getByRole("button",{name:"Unfollow",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Unfollow",exact:true}).click();
  await expect(page.getByRole("button",{name:"Follow",exact:true})).toBeVisible();
});

test("text creation preserves an unknown custom goal instead of forcing a tech preset",async({page})=>{
  await page.goto("/create");
  await page.getByLabel("Tell us anything you want to complete").fill("I already have an aquarium. Help me create a weekly fish-tank cleaning and water-testing kit under ₹3,000.");
  await page.getByRole("button",{name:"Interpret my goal"}).click();
  await expect(page.getByText(/Structured interpretation|Gemini AI interpretation/)).toBeVisible();
  await expect(page.getByRole("heading",{name:/weekly fish-tank cleaning/i})).toBeVisible();
  await expect(page.locator('input[value="Aquarium"]')).toBeVisible();
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByRole("button",{name:"Build my set with AI"}).click();
  await expect(page.getByText("Custom completion plan")).toBeVisible();
  await expect(page.getByText(/instead of receiving unrelated suggestions/)).toBeVisible();
});

test("manual list content is AI-organized without dropping custom products",async({page})=>{
  await page.goto("/create");
  await page.getByRole("button",{name:/Build from my list/}).click();
  await page.getByLabel("What should this set accomplish?").fill("Organize a portable craft toolbox under ₹20,000.");
  await page.getByLabel("Already have").fill("Vintage sewing machine | sewing equipment | Inherited | 3500");
  await page.getByLabel("Want to add").fill("Portable supply caddy | arts-and-crafts");
  await page.getByRole("button",{name:"Organize with AI"}).click();
  await expect(page.getByText(/Structured interpretation|Gemini AI interpretation/)).toBeVisible();
  await expect(page.locator('input[value="Vintage sewing machine"]')).toBeVisible();
  await expect(page.locator('input[value="Portable supply caddy"]')).toBeVisible();
  await expect(page.getByLabel("Item status 2")).toHaveValue("planned");
});

test("real photo upload reaches an honest manual-confirmation set flow",async({page})=>{
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64");
  await page.goto("/create");
  await page.getByRole("button",{name:/Use a photo/i}).click();
  await page.getByTestId("photo-input").setInputFiles({name:"room.png",mimeType:"image/png",buffer:png});
  await expect(page.getByText(/not configured|could not identify|temporarily unavailable/i)).toBeVisible();
  await expect(page.getByText(/Nothing is assumed/)).toBeVisible();
  await page.getByRole("button",{name:"Add any item"}).click();
  await page.getByLabel("Item name 1").fill("Existing shelf");
  await page.getByLabel("Category 1").fill("storage");
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("What do you want this set to achieve?").fill("Organize a collection of board games");
  await page.getByRole("button",{name:"Build my set with AI"}).click();
  await expect(page.getByText("Custom completion plan")).toBeVisible();
});
