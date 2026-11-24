import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const base = process.env.PREVIEW_URL ?? "http://localhost:3001";
const executablePath =
  process.env.BROWSER_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const routes = {
  billing: "Counter Billing",
  inventory: "Inventory is coming soon",
  reports: "Billing reports",
  admin: "Store administration",
};
const browser = await chromium.launch({ executablePath, headless: true });
try {
  for (const width of [360, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width < 600 ? 800 : 900 },
    });
    const page = await context.newPage();
    await page.goto(`${base}/login`);
    await page.getByRole("button", { name: "Admin", exact: true }).click();
    await page.waitForURL("**/billing");
    for (const [route, heading] of Object.entries(routes)) {
      await page.goto(`${base}/${route}`);
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }));
      assert.ok(
        dimensions.page <= dimensions.viewport,
        `${width}px ${route}: page ${dimensions.page}px exceeds ${dimensions.viewport}px`,
      );
      if (route === "admin") {
        if (route === "admin")
          await page
            .getByRole("button", { name: "Menu items", exact: true })
            .click();
        if (width < 768) {
          const table = page.getByRole("table").first();
          await table.waitFor();
          const layout = await table.evaluate((element) => {
            const row = element.querySelector("tbody tr");
            const scroller = element.parentElement;
            return {
              tableDisplay: getComputedStyle(element).display,
              rowDisplay: row ? getComputedStyle(row).display : "",
              labels: row
                ? [...row.querySelectorAll("td")].map(
                    (cell) => cell.dataset.label,
                  )
                : [],
              scrollWidth: scroller?.scrollWidth ?? 0,
              clientWidth: scroller?.clientWidth ?? 0,
            };
          });
          assert.equal(
            layout.tableDisplay,
            "block",
            `${width}px ${route} does not use the card layout`,
          );
          assert.equal(
            layout.rowDisplay,
            "block",
            `${width}px ${route} record is not a card`,
          );
          assert.ok(
            layout.labels.length > 0 && layout.labels.every(Boolean),
            `${width}px ${route} has missing card labels`,
          );
          assert.ok(
            layout.scrollWidth <= layout.clientWidth,
            `${width}px ${route} cards scroll horizontally`,
          );
        } else {
          const display = await page
            .getByRole("table")
            .first()
            .evaluate((element) => getComputedStyle(element).display);
          assert.equal(
            display,
            "table",
            `${width}px ${route} desktop table changed`,
          );
        }
        const openName =
          route === "inventory"
            ? /New stock item/
            : route === "reports"
              ? "Add expense"
              : "Add menu item";
        const dialogName =
          route === "inventory"
            ? "New stock item"
            : route === "reports"
              ? "Add operating expense"
              : "Add menu item";
        const saveName =
          route === "inventory"
            ? "Save item"
            : route === "reports"
              ? "Save expense"
              : "Save dish";
        await page.getByRole("button", { name: openName }).click();
        const dialog = page.getByRole("dialog", { name: dialogName });
        await dialog.waitFor();
        const save = dialog.getByRole("button", { name: saveName });
        const saveBox = await save.boundingBox();
        assert.ok(
          saveBox &&
            saveBox.y >= 0 &&
            saveBox.y + saveBox.height <= page.viewportSize().height,
          `${width}px ${route} dialog action is clipped`,
        );
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
      }
    }
    await page.goto(`${base}/billing`);
    await page.getByRole("button", { name: "Photos grid" }).click();
    const addDish = page.getByRole("button", {
      name: "Add Idli Sambar to cart",
    });
    await addDish.click();
    await addDish.click();
    const quantityButton = page.getByRole("button", {
      name: "Add Idli Sambar, 2 in cart",
    });
    const cardBounds = await quantityButton
      .locator("xpath=ancestor::section[1]")
      .boundingBox();
    const quantityBounds = await quantityButton.boundingBox();
    assert.ok(
      cardBounds &&
        quantityBounds &&
        quantityBounds.x >= cardBounds.x &&
        quantityBounds.x + quantityBounds.width <=
          cardBounds.x + cardBounds.width + 1,
      `${width}px dish quantity control overflows its card`,
    );
    if (width < 1024) {
      await page.getByRole("link", { name: /View bill/ }).click();
    } else {
      const checkoutButton = await page
        .getByRole("button", { name: "Complete & Print" })
        .boundingBox();
      assert.ok(
        checkoutButton &&
          checkoutButton.y + checkoutButton.height <=
            page.viewportSize().height,
        `${width}px cart action is clipped`,
      );
    }
    await page.getByRole("button", { name: "Complete & Print" }).click();
    const checkout = page.getByRole("dialog", { name: "Confirm payment" });
    await checkout.waitFor();
    const action = checkout.getByRole("button", { name: "Confirm payment" });
    const box = await action.boundingBox();
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= page.viewportSize().height,
      `${width}px checkout action is clipped`,
    );
    await checkout.getByRole("button", { name: "Back to cart" }).click();
    await page.getByRole("button", { name: "Past Bills" }).click();
    await page.evaluate(() => {
      const getter = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow").get;
      Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
        configurable: true,
        get() {
          const printWindow = getter.call(this);
          if (printWindow) printWindow.print = () => {
            window.__receiptPrintRequested = !!this.contentDocument?.querySelector(".receipt-print-root .receipt-paper");
            window.dispatchEvent(new Event("afterprint"));
          };
          return printWindow;
        },
      });
    });
    await page.getByRole("button", { name: "Print receipt" }).first().click();
    await page.waitForFunction(() => window.__receiptPrintRequested === true);
    await context.close();
    console.log(`${width}px: routes fit and checkout opens`);
  }
} finally {
  await browser.close();
}
