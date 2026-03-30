"use client";
import { useState, useRef } from "react";
import Image from "next/image";

export default function ImageUpload({ value, onChange, label }: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">
          {label}
        </label>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        className="border border-dark-border bg-dark hover:border-gold/30 transition-colors cursor-pointer flex items-center justify-center overflow-hidden relative"
        style={{ minHeight: "160px" }}
      >
        {value ? (
          <Image src={value} alt="Upload" fill className="object-cover" sizes="400px" />
        ) : (
          <div className="text-center py-8 px-4">
            <p className="text-cream-muted text-sm">{uploading ? "Uploading..." : "Click to upload image"}</p>
            <p className="text-cream-muted/40 text-xs mt-1">JPEG, PNG, or WebP — max 5MB</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-dark/70 flex items-center justify-center">
            <p className="text-gold text-sm">Uploading...</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="text-red-400 text-xs mt-1 hover:text-red-300"
        >
          Remove image
        </button>
      )}
    </div>
  );
}
