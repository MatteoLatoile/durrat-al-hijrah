export type WatermarkPosition =
  | 'center'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

const POSITION_CYCLE: WatermarkPosition[] = [
  'center',
  'top-right',
  'top-left',
  'bottom-right',
  'bottom-left'
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Impossible de charger l'image: ${src}`));
    image.src = src;
  });
}

function loadFileImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const img = await loadImage(String(reader.result));
        resolve(img);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

function getOutputType(file: File) {
  if (
    file.type === 'image/png' ||
    file.type === 'image/webp' ||
    file.type === 'image/jpeg'
  ) {
    return file.type;
  }

  return 'image/jpeg';
}

function getExtension(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

function computePlacement(
  position: WatermarkPosition,
  imageWidth: number,
  imageHeight: number,
  watermarkWidth: number,
  watermarkHeight: number
) {
  const margin = Math.max(18, Math.round(Math.min(imageWidth, imageHeight) * 0.03));

  switch (position) {
    case 'center':
      return {
        x: Math.round((imageWidth - watermarkWidth) / 2),
        y: Math.round((imageHeight - watermarkHeight) / 2)
      };

    case 'top-right':
      return {
        x: imageWidth - watermarkWidth - margin,
        y: margin
      };

    case 'top-left':
      return {
        x: margin,
        y: margin
      };

    case 'bottom-right':
      return {
        x: imageWidth - watermarkWidth - margin,
        y: imageHeight - watermarkHeight - margin
      };

    case 'bottom-left':
      return {
        x: margin,
        y: imageHeight - watermarkHeight - margin
      };
  }
}

export function getWatermarkPosition(index: number): WatermarkPosition {
  return POSITION_CYCLE[index % POSITION_CYCLE.length];
}

export async function addWatermarkToImage(
  file: File,
  index: number,
  watermarkPath = '/filigrane.png'
): Promise<File> {
  const [sourceImage, watermarkImage] = await Promise.all([
    loadFileImage(file),
    loadImage(watermarkPath)
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth || sourceImage.width;
  canvas.height = sourceImage.naturalHeight || sourceImage.height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas non disponible pour le filigrane');
  }

  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  const baseSize = Math.min(canvas.width, canvas.height);

  const maxTargetWidth = Math.max(140, Math.round(baseSize * 0.28));
  const scale = maxTargetWidth / watermarkImage.width;

  const watermarkWidth = Math.round(watermarkImage.width * scale);
  const watermarkHeight = Math.round(watermarkImage.height * scale);

  const position = getWatermarkPosition(index);
  const {x, y} = computePlacement(
    position,
    canvas.width,
    canvas.height,
    watermarkWidth,
    watermarkHeight
  );

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
  ctx.restore();

  const outputType = getOutputType(file);
  const quality = outputType === 'image/jpeg' || outputType === 'image/webp'
    ? 0.92
    : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Impossible de generer l image filigranee'));
        return;
      }

      resolve(result);
    }, outputType, quality);
  });

  const extension = getExtension(outputType);
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return new File(
    [blob],
    `${baseName}-wm.${extension}`,
    {
      type: outputType,
      lastModified: Date.now()
    }
  );
}