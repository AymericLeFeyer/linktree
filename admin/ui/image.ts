const MAX_SIDE = 1280;
/** Ces formats sont envoyés tels quels : les réencoder les dégraderait (animation, vectoriel). */
const AS_IS = ["image/gif", "image/svg+xml"];

export interface PreparedImage {
  name: string;
  /** Contenu en base64, sans préfixe `data:`. */
  data: string;
}

/**
 * Réduit une image raster à 1280 px max et la convertit en WebP : des pages de
 * liens légères, et des commits qui ne pèsent pas des Mo.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (AS_IS.includes(file.type)) {
    return { name: file.name, data: await toBase64(file) };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) throw new Error("Conversion de l'image impossible.");
  const stem = file.name.replace(/\.[^.]+$/, "") || "image";
  return { name: `${stem}.webp`, data: await toBase64(blob) };
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
