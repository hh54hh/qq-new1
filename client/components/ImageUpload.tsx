import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (files: File[]) => void;
  onImageRemove?: (index: number) => void;
  images?: string[];
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  preview?: boolean;
  multiple?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onImageRemove,
  images = [],
  maxFiles = 5,
  maxSize = 5,
  acceptedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  className = "",
  preview = true,
  multiple = true,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return `نوع الملف غير مدعوم. الأنواع المقبولة: ${acceptedTypes.map((type) => type.split("/")[1]).join(", ")}`;
      }
      if (file.size > maxSize * 1024 * 1024) {
        return `حجم الملف كبير جداً. الحد الأقصى: ${maxSize}MB`;
      }
      return null;
    },
    [acceptedTypes, maxSize],
  );

  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      const newErrors: string[] = [];
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      // Check total files limit
      if (images.length + fileArray.length > maxFiles) {
        newErrors.push(`لا يمكن رفع أكثر من ${maxFiles} صور`);
        setErrors(newErrors);
        return;
      }

      setUploading(true);

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          newErrors.push(error);
        } else {
          validFiles.push(file);
          if (preview) {
            const previewUrl = await createPreview(file);
            newPreviews.push(previewUrl);
          }
        }
      }

      if (newErrors.length > 0) {
        setErrors(newErrors);
      } else {
        setErrors([]);
      }

      if (validFiles.length > 0) {
        if (preview) {
          setPreviews((prev) => [...prev, ...newPreviews]);
        }
        onImageSelect(validFiles);
      }

      setUploading(false);
    },
    [
      images.length,
      maxFiles,
      validateFile,
      preview,
      createPreview,
      onImageSelect,
    ],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      if (onImageRemove) {
        onImageRemove(index);
      }
      // Remove from previews if using local previews
      if (preview && previews.length > index) {
        setPreviews((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [onImageRemove, preview, previews.length],
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const displayImages = preview && previews.length > 0 ? previews : images;

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${
            isDragOver
              ? "border-golden-400 bg-golden-400/10"
              : "border-gray-600 hover:border-golden-400/50"
          }
          ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <div className="w-8 h-8 border-2 border-golden-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400" />
          )}

          <div>
            <p className="text-sm font-medium text-gray-300">
              {uploading ? "جاري الرفع..." : "اسحب الصور هنا أو انقر للاختيار"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              الأنواع المقبولة:{" "}
              {acceptedTypes.map((type) => type.split("/")[1]).join(", ")}
              <br />
              الحد الأقصى: {maxSize}MB لكل ملف ({maxFiles} صور كحد أقصى)
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-400">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Previews */}
      {displayImages.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">
              الصور المختارة ({displayImages.length}/{maxFiles})
            </h4>
            {displayImages.length === maxFiles && (
              <span className="text-xs text-yellow-400">
                تم الوصول للحد الأقصى
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {displayImages.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                  <img
                    src={image}
                    alt={`صورة ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Remove Button */}
                {onImageRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {/* Loading Overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ))}

            {/* Add More Button */}
            {displayImages.length < maxFiles && (
              <button
                onClick={openFileDialog}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-600 hover:border-golden-400/50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-golden-400 transition-colors"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs">إضافة</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
