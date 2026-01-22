"use client";

import React, { useState, useRef, JSX } from "react";
import { FaUpload, FaFlask, FaMicroscope, FaVial } from "react-icons/fa";
import { toast, Toaster } from "sonner";
import Image from "next/image";

type ExamType = "Medicina Interna" | "Cultivos";

export default function HomePage() {
  const [files, setFiles] = useState<Record<ExamType, File[]>>({
    "Medicina Interna": [],
    "Cultivos": [],
  });
  const [loading, setLoading] = useState(false);

  const fileInputRefs: Record<ExamType, React.RefObject<HTMLInputElement | null>> = {
    "Medicina Interna": useRef<HTMLInputElement>(null),
    "Cultivos": useRef<HTMLInputElement>(null),
  };

  const handleAddFiles = (type: ExamType, fileList: FileList | null) => {
    if (!fileList) return;
    const valid = Array.from(fileList).filter(f => /\.pdf$/i.test(f.name));
    setFiles(prev => ({ ...prev, [type]: [...prev[type], ...valid] }));
  };

  const handleClear = (type: ExamType) => {
    setFiles(prev => ({ ...prev, [type]: [] }));
  };

  const handleGenerate = async (type: ExamType) => {
    const selectedFiles = files[type];
    if (!selectedFiles.length) {
      toast.warning(`Selecciona archivos para ${type}`);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    selectedFiles.forEach(f => formData.append("files", f));

    try {
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type.replace(/\s+/g, "_")}_Flujograma.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type}: Flujograma generado`);
    } catch {
      toast.error(`Error al generar el flujograma de ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const icons: Record<ExamType, JSX.Element> = {
    "Medicina Interna": <FaVial className="text-red-600 text-5xl" />,
    "Cultivos": <FaMicroscope className="text-green-600 text-5xl" />,
  };

  return (
<main className="bg-gray-100 min-h-screen flex flex-col">
  {/* Header */}
  <header className="bg-blue-900 text-white py-4 flex items-center justify-center gap-6">
    <Image src="/gatosaludando.gif" alt="" width={64} height={64} unoptimized />
    <h1 className="text-4xl font-bold">LabFluxHPH</h1>
    <Image src="/gatosaludando.gif" alt="" width={64} height={64} unoptimized />
  </header>

  {/* Grid of Exam Cards */}
  <section className="flex-grow flex justify-center items-start">
    <div className="max-w-6xl w-full mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 justify-items-center">
      {Object.keys(files).map((type) => {
        const examType = type as ExamType;
        return (
          <div
            key={examType}
            className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center text-center w-full max-w-sm"
          >
            <div className="mb-3">{icons[examType]}</div>
            <h2 className="text-lg font-semibold mb-3">{examType}</h2>

            <input
              ref={fileInputRefs[examType]}
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                handleAddFiles(examType, e.target.files);
                e.target.value = "";
              }}
            />

            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 w-full cursor-pointer hover:border-blue-500 transition"
              onClick={() => fileInputRefs[examType].current?.click()}
            >
              <p className="text-gray-500 flex flex-col items-center gap-2">
                <FaUpload className="text-blue-600" /> Seleccionar PDFs
              </p>
            </div>

            {files[examType].length > 0 && (
              <div className="mt-3 w-full space-y-1 text-sm text-gray-700">
                {files[examType].map((f, idx) => (
                  <div key={idx} className="flex justify-between bg-blue-50 px-3 py-1 rounded-lg">
                    <span>{f.name}</span>
                    <span className="text-gray-500">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => handleGenerate(examType)}
                disabled={loading}
                className="bg-blue-900 text-white px-4 py-2 rounded-xl hover:bg-blue-800 transition disabled:opacity-60"
              >
                Generar
              </button>
              <button
                onClick={() => handleClear(examType)}
                className="bg-gray-500 text-white px-4 py-2 rounded-xl hover:bg-gray-400 transition"
              >
                Limpiar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </section>

  {/* Footer */}
  <footer className="bg-gray-200 text-gray-700 py-4 text-center mt-auto">
    <p>
      &copy; {new Date().getFullYear()}{" "}
      <a href="https://www.tallar.cl" className="hover:text-purple-600">
        Rodrigo Tallar
      </a>
    </p>
  </footer>

  <Toaster position="top-right" richColors />
</main>
  );
}