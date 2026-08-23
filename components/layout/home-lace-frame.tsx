"use client";

type HomeLaceFrameProps = {
  visible?: boolean;
};

/** Marco rectangular a pantalla completa: esquinas al borde del panel home. */
export function HomeLaceFrame({ visible = true }: HomeLaceFrameProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[15] overflow-hidden transition-opacity ease-[cubic-bezier(0.33,1,0.68,1)] duration-[380ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      <img
        src="/frames/home-lace-frame.png?v=6"
        alt=""
        className="block h-full w-full object-fill object-center"
        draggable={false}
      />
    </div>
  );
}
