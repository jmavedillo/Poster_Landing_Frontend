import { readdir } from "node:fs/promises";
import path from "node:path";
import { PosterExamplesClient } from "./PosterExamplesClient";

const imagePattern = /\.(png|jpe?g|webp|avif)$/i;

export async function PosterExamples() {
  const examplesDirectory = path.join(process.cwd(), "app", "examples");

  let files: string[] = [];

  try {
    files = await readdir(examplesDirectory);
  } catch {
    files = [];
  }

  const images = files
    .filter((file) => imagePattern.test(file))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 12)
    .map((file) => {
      const encodedFileName = encodeURIComponent(file);

      return {
        id: file,
        src: `/api/example-image/${encodedFileName}`,
        alt: file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      };
    });

  return <PosterExamplesClient images={images} />;
}
