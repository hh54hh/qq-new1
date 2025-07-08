import { RequestHandler } from "express";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getCurrentUserId } from "../../shared/supabase";

// Create uploads directory if it doesn't exist
const uploadsDir = join(process.cwd(), "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

export const uploadImage: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: "المصادقة مطلوبة" });
    }

    // Get the file from form data
    const files = req.files as any;
    if (!files || !files.image) {
      return res.status(400).json({ error: "لم يتم رفع ملف" });
    }

    const file = Array.isArray(files.image) ? files.image[0] : files.image;

    // Validate file type
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "يجب أن يكون الملف صورة" });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ error: "حجم الملف كبير جداً (الحد الأقصى 5MB)" });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${userId}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Save file
    await new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.write(file.data);
      writeStream.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Return file URL
    const fileUrl = `/uploads/${fileName}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "خطأ في رفع الملف" });
  }
};

export const uploadProfileImage = uploadImage;
