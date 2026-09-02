"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRetoNumero } from "@/lib/format-reto-numero";
import { RETO_DESCRIPCION_CLASS } from "@/lib/reto-descripcion";

export type ObraEnviadaState = {
  videoUid: string;
  previewUrl?: string;
  titulo: string;
};

type ParticiparSubmitScreenProps = {
  open: boolean;
  onClose: () => void;
  onUploadSuccess?: (obra: ObraEnviadaState) => void;
  retoId: string;
  retoTitulo: string;
  retoNumero: string;
  retoDescripcion: string;
  codigo: string;
  maxVideoDurationSeconds: number;
};

async function simularSubida(onProgress: (percent: number) => void) {
  for (let percent = 0; percent <= 100; percent += 10) {
    onProgress(percent);
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
}

const fieldClass =
  "w-full border border-white/25 bg-transparent px-4 py-3 text-sm font-normal uppercase tracking-wide text-white outline-none placeholder:text-white/40 focus:border-white/60";

const uploadZoneClass =
  "flex h-full min-h-[5.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-white/30 px-3 py-4 text-center transition-colors hover:border-white/55 hover:bg-white/[0.03] md:min-h-[7.5rem] md:py-5";

export function ParticiparSubmitScreen({
  open,
  onClose,
  retoId,
  retoTitulo,
  retoNumero,
  retoDescripcion,
  codigo,
  maxVideoDurationSeconds,
  onUploadSuccess,
}: ParticiparSubmitScreenProps) {
  const [tituloObra, setTituloObra] = useState("");
  const [descripcionObra, setDescripcionObra] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setTituloObra("");
    setDescripcionObra("");
    setVideoFile(null);
    setImageFiles([]);
    setUploading(false);
    setProgress(0);
    setError(null);
    setSuccess(false);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, uploading, onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!tituloObra.trim()) {
      setError("Añade un título a tu obra.");
      return;
    }

    if (!videoFile) {
      setError("Selecciona un vídeo para participar.");
      return;
    }

    if (!videoFile.type.startsWith("video/")) {
      setError("El archivo de vídeo no es válido.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      await simularSubida(setProgress);

      onUploadSuccess?.({
        videoUid: `sim-${Date.now()}`,
        previewUrl: URL.createObjectURL(videoFile),
        titulo: tituloObra.trim(),
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo completar la participación.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Participar en el reto"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 bg-black"
        style={{ height: "var(--safe-top)" }}
      />

      <header className="flex shrink-0 items-center justify-between gap-4 px-[clamp(28px,6.5vw,52px)] pb-4 pt-[max(1rem,var(--safe-top))] md:pb-5 md:pt-[max(1.1rem,var(--safe-top))]">
        <p className="ui-btn-text text-white/55">
          Código: {codigo.trim() || "—"}
        </p>
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          className="ui-btn-text font-normal tracking-wide text-white/80 transition-opacity hover:text-white disabled:opacity-40"
        >
          [CERRAR]
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-2 md:flex-row md:overflow-hidden md:pt-0">
        <section className="shrink-0 px-[clamp(28px,6.5vw,52px)] pb-3 pt-6 max-md:justify-start md:flex md:min-h-0 md:flex-1 md:flex-col md:justify-center md:py-8 md:w-1/2 md:pt-8">
          <div className="mx-auto w-full max-w-md space-y-3 md:space-y-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="reto-heading-titulo min-w-0 truncate text-white">
                {retoTitulo}
              </h2>
              <span className="reto-heading-text shrink-0 whitespace-nowrap text-white">
                #{formatRetoNumero(retoNumero)}
              </span>
            </div>
            <p className={`${RETO_DESCRIPCION_CLASS} text-white/80`}>
              {retoDescripcion}
            </p>
          </div>
        </section>

        <section className="shrink-0 px-[clamp(28px,6.5vw,52px)] pb-[max(1.75rem,var(--safe-bottom))] pt-10 max-md:mt-2 md:mt-0 md:flex md:min-h-0 md:flex-1 md:items-center md:justify-center md:overflow-y-auto md:py-8 md:w-1/2 md:pt-8">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-md flex-col gap-4 md:gap-5"
          >
            {success ? (
              <p className="border border-white/30 px-4 py-3 text-sm uppercase tracking-wide text-white">
                Obra enviada. Permanecerá oculta hasta que finalice el reto.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="participar-titulo" className="ui-btn-text text-white/70">
                    Título de tu obra
                  </label>
                  <input
                    id="participar-titulo"
                    type="text"
                    value={tituloObra}
                    onChange={(event) => setTituloObra(event.target.value)}
                    disabled={uploading}
                    placeholder="TÍTULO"
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="participar-descripcion"
                    className="ui-btn-text text-white/70"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="participar-descripcion"
                    value={descripcionObra}
                    onChange={(event) => setDescripcionObra(event.target.value)}
                    disabled={uploading}
                    rows={3}
                    placeholder="DESCRIPCIÓN DE TU PIEZA"
                    className={`${fieldClass} resize-none normal-case md:min-h-[6.5rem]`}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex min-w-0 flex-col gap-2">
                    <span className="ui-btn-text text-white/70">Vídeo</span>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(event) =>
                        setVideoFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => videoInputRef.current?.click()}
                      className={uploadZoneClass}
                    >
                      <span className="ui-btn-text text-white">
                        {videoFile ? videoFile.name : "[ SUBIR VÍDEO ]"}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-white/45">
                        Máx. {maxVideoDurationSeconds}s. La miniatura se genera
                        del vídeo.
                      </span>
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-col gap-2">
                    <span className="ui-btn-text text-white/70">Imágenes</span>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={uploading}
                      onChange={(event) =>
                        setImageFiles(Array.from(event.target.files ?? []))
                      }
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => imageInputRef.current?.click()}
                      className={uploadZoneClass}
                    >
                      <span className="ui-btn-text text-white">
                        {imageFiles.length > 0
                          ? `${imageFiles.length} imagen${imageFiles.length === 1 ? "" : "es"}`
                          : "[ SUBIR IMÁGENES ]"}
                      </span>
                      <span className="text-xs uppercase leading-snug tracking-wide text-white/45">
                        Opcional. Imágenes del proceso: bocetos, referencias,
                        rodaje o montaje.
                      </span>
                    </button>
                  </div>
                </div>

                {uploading ? (
                  <div className="space-y-2">
                    <div className="h-1 overflow-hidden bg-white/15">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-white/55">
                      Preparando obra… {progress}%
                    </p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={uploading}
                  className="ui-btn-text self-end py-3 tracking-wide text-white transition-opacity hover:opacity-70 disabled:opacity-40"
                >
                  [PARTICIPAR]
                </button>
              </>
            )}

            {error ? (
              <p className="border border-red-400/50 px-4 py-3 text-sm uppercase tracking-wide text-red-300">
                {error}
              </p>
            ) : null}
          </form>
        </section>
      </div>

    </div>
  );
}
