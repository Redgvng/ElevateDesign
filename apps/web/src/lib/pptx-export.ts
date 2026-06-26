import PptxGenJS from "pptxgenjs";

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "screen"
  );
}

export function pptxDownloadName(title: string): string {
  return `${slug(title)}.pptx`;
}

export type ScreenDeckInput = {
  title: string;
  /** PNG/JPEG data URL of the screen screenshot, when available. */
  imageDataUrl?: string;
};

/** Minimal slide interface — lets us compose and unit-test without the real lib. */
export type DeckSlide = {
  addText(text: string, opts: Record<string, unknown>): void;
  addImage(opts: Record<string, unknown>): void;
};
export type DeckBuilder = {
  addSlide(): DeckSlide;
};

/**
 * Composes a single-slide deck for a screen: a title and, when available, the
 * screenshot. Pure given the injected builder, so it is unit-testable without
 * the heavy PPTX library.
 */
export function composeScreenDeck(deck: DeckBuilder, input: ScreenDeckInput): void {
  const slide = deck.addSlide();
  slide.addText(input.title, { x: 0.4, y: 0.3, fontSize: 24, bold: true });
  if (input.imageDataUrl) {
    slide.addImage({ data: input.imageDataUrl, x: 0.4, y: 1.1, w: 9.2, h: 5.2 });
  } else {
    slide.addText("No screenshot available for this version.", {
      x: 0.4,
      y: 1.2,
      fontSize: 12,
      color: "6B7280",
    });
  }
}

export async function buildScreenPptxBlob(input: ScreenDeckInput): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "ODC", width: 10, height: 7.5 });
  pptx.layout = "ODC";
  composeScreenDeck(pptx as unknown as DeckBuilder, input);
  return (await pptx.write({ outputType: "blob" })) as Blob;
}
