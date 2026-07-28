"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarObra, type GuardarObraState } from "@/app/subir/actions";
import { StreamPlayer } from "@/components/video/stream-player";

type UploadFormProps = {
  retoId: string;
  maxDurationSeconds: number;
};

type UploadStep = "form" | "uploading" | "done";

function subirArchivo(
  uploadURL: string,
  file: File,
  onProgress: (percent: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Cloudflare rechazó la subida del vídeo."));
    };

    xhr.onerror = () => reject(new Error("Error de red durante la subida."));
    xhr.open("POST", uploadURL);
    xhr.send(formData);
  });
}

export function UploadForm({ retoId, maxDurationSeconds }: UploadFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>("form");
  const [titulo, setTitulo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUid, setUploadedUid] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Selecciona un archivo de vídeo.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("El archivo debe ser un vídeo.");
      return;
    }

    setStep("uploading");
    setProgress(0);

    try {
      const uploadResponse = await fetch("/api/stream/upload-url", {
        method: "POST",
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error ?? "No se pudo preparar la subida.");
      }

      await subirArchivo(uploadData.uploadURL, file, setProgress);

      const formData = new FormData();
      formData.set("id_reto", retoId);
      formData.set("titulo", titulo);
      formData.set("id_cloudflare", uploadData.uid);

      const result: GuardarObraState = await guardarObra(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      setUploadedUid(uploadData.uid);
      setStep("done");
      router.refresh();
    } catch (uploadError) {
      setStep("form");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo completar la subida."
      );
    }
  }

  if (step === "done" && uploadedUid) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Vídeo subido correctamente. Permanecerá oculto hasta que finalice el reto.
        </p>
        <StreamPlayer videoUid={uploadedUid} title={titulo} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="titulo" className="text-sm font-medium">
          Título de tu obra
        </label>
        <input
          id="titulo"
          type="text"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Mi interpretación del reto"
          disabled={step === "uploading"}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="video" className="text-sm font-medium">
          Vídeo
        </label>
        <input
          id="video"
          type="file"
          accept="video/*"
          required
          disabled={step === "uploading"}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
        <p className="text-xs text-zinc-500">
          Máximo {maxDurationSeconds} segundos. Se sube directamente a Cloudflare Stream.
        </p>
      </div>

      {step === "uploading" && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Subiendo vídeo... {progress}%
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={step === "uploading"}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {step === "uploading" ? "Subiendo..." : "Subir vídeo"}
      </button>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}
    </form>
  );
}
