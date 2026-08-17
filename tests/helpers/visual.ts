import { expect, type Page, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { loadAllPageImages } from "./storefront";

interface ComparePagesOptions {
  readonly fullPage?: boolean;
  readonly maxDiffPixelRatio?: number;
  readonly name: string;
}

interface CompareBuffersOptions {
  readonly actualBuffer: Buffer;
  readonly maskAreas?: readonly VisualMaskArea[];
  readonly maxDiffPixelRatio: number;
  readonly name: string;
  readonly referenceBuffer: Buffer;
  readonly testInfo: TestInfo;
}

export interface VisualMaskArea {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

async function compareBuffers({
  actualBuffer,
  maskAreas = [],
  maxDiffPixelRatio,
  name,
  referenceBuffer,
  testInfo,
}: CompareBuffersOptions): Promise<void> {
  const actual = PNG.sync.read(actualBuffer);
  const reference = PNG.sync.read(referenceBuffer);

  await testInfo.attach(`${name}-actual`, {
    body: actualBuffer,
    contentType: "image/png",
  });
  await testInfo.attach(`${name}-reference`, {
    body: referenceBuffer,
    contentType: "image/png",
  });

  expect(
    { width: actual.width, height: actual.height },
    `${name} screenshot dimensions`,
  ).toEqual({ width: reference.width, height: reference.height });

  for (const area of maskAreas) {
    const left = Math.max(0, Math.floor(area.x));
    const top = Math.max(0, Math.floor(area.y));
    const right = Math.min(actual.width, Math.ceil(area.x + area.width));
    const bottom = Math.min(actual.height, Math.ceil(area.y + area.height));

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const offset = (y * actual.width + x) * 4;
        for (const image of [actual, reference]) {
          image.data[offset] = 255;
          image.data[offset + 1] = 0;
          image.data[offset + 2] = 255;
          image.data[offset + 3] = 255;
        }
      }
    }
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const differentPixels = pixelmatch(
    actual.data,
    reference.data,
    diff.data,
    actual.width,
    actual.height,
    { includeAA: false, threshold: 0.15 },
  );
  const differenceRatio = differentPixels / (actual.width * actual.height);

  if (differenceRatio > maxDiffPixelRatio) {
    await testInfo.attach(`${name}-diff`, {
      body: PNG.sync.write(diff),
      contentType: "image/png",
    });
  }

  expect(
    differenceRatio,
    `${name} differs from its visual source by ${(differenceRatio * 100).toFixed(3)}% of pixels`,
  ).toBeLessThanOrEqual(maxDiffPixelRatio);
}

export async function comparePages(
  actualPage: Page,
  referencePage: Page,
  testInfo: TestInfo,
  {
    fullPage = false,
    maxDiffPixelRatio = 0.005,
    name,
  }: ComparePagesOptions,
): Promise<void> {
  if (fullPage) {
    await Promise.all([
      loadAllPageImages(actualPage),
      loadAllPageImages(referencePage),
    ]);
  }

  const [actualBuffer, referenceBuffer] = await Promise.all([
    actualPage.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage,
    }),
    referencePage.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage,
    }),
  ]);
  await compareBuffers({
    actualBuffer,
    maxDiffPixelRatio,
    name,
    referenceBuffer,
    testInfo,
  });
}

export async function compareScreenshotToSuppliedReference(
  actualBuffer: Buffer,
  referenceFilename: string,
  testInfo: TestInfo,
  maxDiffPixelRatio = 0.005,
  maskAreas: readonly VisualMaskArea[] = [],
): Promise<void> {
  const referenceBuffer = await readFile(
    resolve(process.cwd(), "reference-static", "screenshots", referenceFilename),
  );

  await compareBuffers({
    actualBuffer,
    maskAreas,
    maxDiffPixelRatio,
    name: referenceFilename.replace(/\.png$/i, ""),
    referenceBuffer,
    testInfo,
  });
}
