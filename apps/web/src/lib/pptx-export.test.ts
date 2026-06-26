import { describe, expect, it, vi } from "vitest";
import { composeScreenDeck, pptxDownloadName, type DeckBuilder } from "./pptx-export";

describe("pptx export", () => {
  it("derives a safe .pptx filename", () => {
    expect(pptxDownloadName("Operations Dashboard")).toBe("operations-dashboard.pptx");
    expect(pptxDownloadName("###")).toBe("screen.pptx");
  });

  it("composes one slide with a title and the screenshot when present", () => {
    const addText = vi.fn();
    const addImage = vi.fn();
    const deck: DeckBuilder = { addSlide: () => ({ addText, addImage }) };

    composeScreenDeck(deck, { title: "Dashboard", imageDataUrl: "data:image/png;base64,AAA" });

    expect(addText).toHaveBeenCalledWith("Dashboard", expect.objectContaining({ bold: true }));
    expect(addImage).toHaveBeenCalledWith(
      expect.objectContaining({ data: "data:image/png;base64,AAA" }),
    );
  });

  it("falls back to a note when there is no screenshot", () => {
    const addText = vi.fn();
    const addImage = vi.fn();
    const deck: DeckBuilder = { addSlide: () => ({ addText, addImage }) };

    composeScreenDeck(deck, { title: "Dashboard" });

    expect(addImage).not.toHaveBeenCalled();
    expect(addText).toHaveBeenCalledTimes(2);
  });
});
