import React, { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { driveThumb, driveUploadEnabled, uploadImageToDrive } from "../../api/driveUpload";

const PhotoField = ({ value = [], onChange, max = 3, disabled, onError }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(0);

  const handleFiles = async (e) => {
    const files = [...e.target.files].slice(0, max - value.length);
    e.target.value = "";
    if (!files.length) return;
    setUploading(files.length);
    const urls = [];
    for (const file of files) {
      const r = await uploadImageToDrive(file);
      if (r.success) urls.push(r.url); else onError?.(r.message);
      setUploading((n) => n - 1);
    }
    if (urls.length) onChange([...value, ...urls]);
  };

  const canAdd = !disabled && value.length + uploading < max;

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((url) => (
        <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <a href={url} target="_blank" rel="noreferrer">
            <img src={driveThumb(url, 200)} alt="" className="w-full h-full object-cover" />
          </a>
          {!disabled && (
            <button type="button" onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white" title="Bỏ ảnh">
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      {Array.from({ length: uploading }).map((_, i) => (
        <div key={i} className="w-20 h-20 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 animate-pulse">
          Đang tải…
        </div>
      ))}
      {canAdd && (
        <button type="button" disabled={!driveUploadEnabled} onClick={() => inputRef.current?.click()}
          title={driveUploadEnabled ? "Thêm ảnh" : "Chưa cấu hình upload Google Drive"}
          className="w-20 h-20 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <Camera size={18} /> Thêm ảnh
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      {!driveUploadEnabled && !disabled && (
        <p className="w-full text-xs text-amber-600">Chưa cấu hình upload Google Drive (VITE_DRIVE_UPLOAD_URL / VITE_DRIVE_UPLOAD_TOKEN).</p>
      )}
    </div>
  );
};

export default PhotoField;
