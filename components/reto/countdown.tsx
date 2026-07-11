"use client";

import { useEffect, useState } from "react";

function calcularTiempoRestante(fechaFin: string) {
  const diferencia = new Date(fechaFin).getTime() - Date.now();

  if (diferencia <= 0) {
    return { finalizado: true, dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  const segundos = Math.floor(diferencia / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  return {
    finalizado: false,
    dias,
    horas: horas % 24,
    minutos: minutos % 60,
    segundos: segundos % 60,
  };
}

function formatearUnidad(valor: number) {
  return valor.toString().padStart(2, "0");
}

export function Countdown({ fechaFin }: { fechaFin: string }) {
  const [tiempo, setTiempo] = useState(() => calcularTiempoRestante(fechaFin));

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTiempo(calcularTiempoRestante(fechaFin));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [fechaFin]);

  if (tiempo.finalizado) {
    return (
      <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
        El reto ha finalizado
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4">
      {[
        { label: "Días", value: tiempo.dias },
        { label: "Horas", value: tiempo.horas },
        { label: "Min", value: tiempo.minutos },
        { label: "Seg", value: tiempo.segundos },
      ].map((unidad) => (
        <div
          key={unidad.label}
          className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white px-3 py-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <span className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
            {unidad.label === "Días"
              ? unidad.value
              : formatearUnidad(unidad.value)}
          </span>
          <span className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
            {unidad.label}
          </span>
        </div>
      ))}
    </div>
  );
}
