import imageCompression from 'browser-image-compression';

export const compressImageFile = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Compression error:", error);
    return file; // Fallback to original
  }
};

export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to convert URL to base64", e);
    return url; // Fallback to original URL
  }
};

export const applyWatermark = async (base64: string, text: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      
      // Calculate new dimensions (max 1200px)
      const MAX_SIZE = 1200;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const fontSize = Math.max(20, width / 30);
      ctx.font = `italic ${fontSize}px "Libre Baskerville", serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillText(text, width - 20, height - 20);
      
      // Compress to ensure it's under ~800KB base64 (which is ~600KB binary)
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Rough estimation: 1 character in base64 is 1 byte. 800KB = 800,000 bytes.
      while (dataUrl.length > 800000 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      
      resolve(dataUrl);
    };
    img.onerror = () => {
      // If the image fails to load (e.g., unsupported format like HEIC without transcoding),
      // we resolve with the original base64, but it might fail later.
      resolve(base64);
    };
    img.src = base64;
  });
};

export const sanitizeForPDF = (text: string) => {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // En and em dashes
    .replace(/[\u2026]/g, '...')     // Ellipsis
    .replace(/[\u0152]/g, 'OE')      // OE ligature
    .replace(/[\u0153]/g, 'oe')      // oe ligature
    .replace(/[\u0178]/g, 'Y')       // Y with diaeresis
    .replace(/[\u20AC]/g, 'EUR')     // Euro symbol
    .replace(/[^\x00-\xFF\r\n]/g, '') // Keep basic Latin and Latin-1
    .trim();
};

export const getUrlHash = (url: string) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};
