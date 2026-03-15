import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const mimeTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(_: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await context.params;

  const joined = slug.join("/");
  const decoded = decodeURIComponent(joined);
  const safeName = path.basename(decoded);
  const extension = path.extname(safeName).toLowerCase();
  const mimeType = mimeTypeByExtension[extension];

  if (!mimeType) {
    return NextResponse.json({ message: "Unsupported file type." }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "app", "examples", safeName);

  try {
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ message: "Image not found." }, { status: 404 });
  }
}
