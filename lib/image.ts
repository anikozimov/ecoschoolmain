/** Rasmni 1600px gacha kichraytirib, JPEG (80%) qiladi — yuklash tez va arzon bo‘lishi uchun */
export async function compressImage(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Rasmni o‘qib bo‘lmadi."));
    });
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Rasmni qayta ishlash imkoni bo‘lmadi.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Rasmni kichraytirib bo‘lmadi."))),
        "image/jpeg",
        0.8
      );
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
