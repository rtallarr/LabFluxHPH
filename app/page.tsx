"use client";

import { useState, useRef } from "react";
import { FaGithub } from "react-icons/fa";
import Image from "next/image";

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter(
      (f) => /\.pdf$/i.test(f.name) || /\.zip$/i.test(f.name)
    );

    if (files.length + valid.length > 8) {
      setStatus("⚠ No puedes subir más de 8 archivos.");
      return;
    }

    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    setFiles([]);
    setStatus("");
    setProgress(0);
  };

  const handleGenerate = async () => {
    if (!files.length) {
      setStatus("⚠ Selecciona al menos un archivo (PDF o ZIP).");
      return;
    }

    setLoading(true);
    setStatus("");
    setProgress(0);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Server error");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "LabFluxHPH.docx";
      a.click();
      URL.revokeObjectURL(url);

      setStatus("✅ Flujograma generado. Revisa tu descarga.");
    } catch {
      setStatus("❌ Error al generar el flujograma.");
    } finally {
      setLoading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 flex items-center justify-center gap-6">
        <Image src="/gatosaludando.gif" alt="" width={64} height={64} unoptimized />
        <h1 className="text-4xl font-bold">LabFluxHPH</h1>
        <Image src="/gatosaludando.gif" alt="" width={64} height={64} unoptimized />
        <a
          href="https://github.com/rtallarr/LabFluxHPH"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-7 top-6 text-white text-2xl hover:text-gray-300"
        >
          <FaGithub size={30} />
        </a>
      </header>

      {/* Main Card */}
      <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-lg transition-all">
        <p className="text-gray-700 text-center mb-6">
          Sube 1 o más PDFs con resultados de laboratorio y recibe tu flujograma listo.
        </p>

        {/* Hidden input */}
        <input
          ref={fileInputRef}
          id="fileInput"
          type="file"
          multiple
          accept=".pdf,.zip"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Dropzone */}
        <div
          className="border-2 border-dashed border-gray-400 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-600 transition-all duration-300"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className="text-blue-400 text-5xl mb-4">📄</div>
          <div className="text-gray-600 font-semibold">
            Arrastra archivos aquí o haz clic para seleccionarlos
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center px-4 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Seleccionar archivos
          </button>
        </div>

        {/* File list */}
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {file.name} · {(file.size / 1024).toFixed(1)} KB
              <button
                onClick={() => removeFile(idx)}
                className="ml-1 text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Status + Progress */}
        <div className="mt-6 text-center space-y-3">
          {loading && (
            <Image src="/loading.gif" alt="Cargando..." width={32} height={32} unoptimized />
          )}
          <div className="text-gray-700 min-h-6">{status}</div>

          {progress > 0 && (
            <div className="w-full">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 mt-1">{progress}%</div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-900 text-white px-6 py-2 rounded-2xl font-medium hover:bg-blue-800 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Generar flujograma
            </button>
            <button
              onClick={clearAll}
              className="bg-gray-500 text-white px-6 py-2 rounded-2xl font-medium hover:bg-gray-400 transition-all duration-200"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <footer className="bg-gray-200 text-gray-700 py-4 mt-8 text-center mt-auto">
        <p>Comentarios, sugerencias y problemas dejarlos en <a href="https://github.com/rtallarr/LabFluxHPH/issues" className="underline hover:text-purple-600">github</a></p>
        <p>&copy; {new Date().getFullYear()} <a href="https://www.tallar.cl" className="hover:text-purple-600">Rodrigo Tallar</a> y Cristóbal Fuentes</p>
      </footer>

    </div>
  );
}
