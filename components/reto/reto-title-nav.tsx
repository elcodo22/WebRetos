type RetoTitleNavProps = {
  numero: string;
  titulo: string;
};

export function RetoTitleNav({ numero, titulo }: RetoTitleNavProps) {
  return (
    <h1 className="flex min-w-0 max-w-[min(100%,42rem)] flex-wrap items-baseline justify-center gap-x-5 gap-y-2 px-2 text-center text-[32px] font-normal leading-none tracking-wide">
      <span className="shrink-0">#{numero}</span>
      <span className="min-w-0">{titulo}</span>
    </h1>
  );
}
