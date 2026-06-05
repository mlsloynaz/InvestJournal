/**
 * Converts dark UI / chart screenshots to a light-background variant for the app.
 * @param {import('sharp').Sharp} sharp
 * @param {string} inputPath
 * @param {string} outputPath
 */
export async function convertImageToLightMode(sharp, inputPath, outputPath) {
  const img = sharp(inputPath);
  const { channels } = await img.stats();
  const mean =
    channels.reduce((sum, ch) => sum + ch.mean, 0) / Math.max(channels.length, 1);

  let pipeline = img.flatten({ background: { r: 255, g: 255, b: 255 } });

  if (mean < 140) {
    pipeline = pipeline
      .negate({ alpha: false })
      .modulate({ brightness: 1.05, saturation: 0.85 })
      .linear(0.92, 12);
  } else {
    pipeline = pipeline.modulate({ brightness: 1.08 });
  }

  await pipeline.png({ compressionLevel: 8 }).toFile(outputPath);
}
