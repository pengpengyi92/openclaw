import { expect, it } from "vitest";
import { installMockGateway } from "../test-helpers/control-ui-e2e.ts";
import { createControlUiE2eSuite } from "./control-ui-e2e-suite.test-support.ts";

const suite = createControlUiE2eSuite({
  name: "chat Markdown alignment",
  unavailableMessage: (executablePath) => `Playwright Chromium is unavailable at ${executablePath}`,
});

suite.define(() => {
  it("aligns task controls with disclosure summaries and contains expanded content", async () => {
    await suite.withPage(
      {
        colorScheme: "light",
        locale: "en-US",
        serviceWorkers: "block",
        viewport: { height: 800, width: 1180 },
      },
      async ({ page }) => {
        await installMockGateway(page, {
          historyMessages: [
            {
              content: [
                {
                  type: "text",
                  text: [
                    "## Alignment check",
                    "",
                    "- [ ] Unchecked task",
                    "",
                    "<details open>",
                    "<summary>More details</summary>",
                    "",
                    "Disclosure body",
                    "</details>",
                    "",
                    "<details>",
                    "<summary>Collapsed details</summary>",
                    "Hidden body",
                    "</details>",
                  ].join("\n"),
                },
              ],
              role: "assistant",
              timestamp: Date.now(),
            },
          ],
        });

        await page.goto(`${suite.server.baseUrl}chat`);
        const markdown = page.locator(".chat-group.assistant .chat-text", {
          hasText: "Alignment check",
        });
        await markdown.waitFor();

        const geometry = await markdown.evaluate((root) => {
          const textStart = (selector: string) => {
            const element = root.querySelector(selector);
            const text = element?.firstChild;
            if (!element || !text) {
              throw new Error(`Missing text for ${selector}`);
            }
            const range = document.createRange();
            range.selectNodeContents(text);
            return range.getBoundingClientRect().x;
          };
          const checkbox = root.querySelector(".task-list-item-checkbox");
          const details = root.querySelector("details[open]");
          const summary = root.querySelector("details[open] > summary");
          if (!checkbox || !details || !summary) {
            throw new Error("Missing task-list or disclosure markup");
          }
          const detailsStyle = getComputedStyle(details);
          const summaryStyle = getComputedStyle(summary);
          return {
            bodyTextX: textStart("details > p"),
            borderInlineStartWidth: detailsStyle.borderInlineStartWidth,
            checkboxX: checkbox.getBoundingClientRect().x,
            collapsedSummaryTextX: textStart("details:not([open]) > summary"),
            summaryMarginBottom: summaryStyle.marginBottom,
            summaryTextX: textStart("details[open] > summary"),
          };
        });

        expect(Math.abs(geometry.checkboxX - geometry.summaryTextX)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.checkboxX - geometry.collapsedSummaryTextX)).toBeLessThanOrEqual(
          1,
        );
        expect(geometry.bodyTextX).toBeGreaterThan(geometry.summaryTextX);
        expect(parseFloat(geometry.borderInlineStartWidth)).toBeGreaterThan(0);
        expect(parseFloat(geometry.summaryMarginBottom)).toBeGreaterThan(0);
      },
    );
  });
});
