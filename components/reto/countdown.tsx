"use client";

import { useEffect, useState } from "react";

function calcularTiempoRestante(fechaFin: string) {
  const diferencia = new Date(fechaFin).getTime() - Date.now();

  if (diferencia <= 0) {
    return { finalizado: true, dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  const totalSegundos = Math.floor(diferencia / 1000);
  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return { finalizado: false, dias, horas, minutos, segundos };
}

function pad(valor: number) {
  return valor.toString().padStart(2, "0");
}

export function CountdownCompact({ fechaFin }: { fechaFin: string }) {
  const [tiempo, setTiempo] = useState(() => calcularTiempoRestante(fechaFin));

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTiempo(calcularTiempoRestante(fechaFin));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [fechaFin]);

  const dias = pad(tiempo.finalizado ? 0 : tiempo.dias);
  const horas = pad(tiempo.finalizado ? 0 : tiempo.horas);
  const minutos = pad(tiempo.finalizado ? 0 : tiempo.minutos);
  const segundos = pad(tiempo.finalizado ? 0 : tiempo.segundos);

  return (
    <span className="inline-flex items-baseline gap-3 tabular-nums tracking-wide">
      <span>
        {dias}
        <span className="text-[28px]">d</span>
      </span>
      <span>
        {horas}
        <span className="text-[28px]">h</span>
      </span>
      <span>
        {minutos}
        <span className="text-[28px]">m</span>
      </span>
      <span>
        {segundos}
        <span className="text-[28px]">s</span>
      </span>
    </span>
  );
}
