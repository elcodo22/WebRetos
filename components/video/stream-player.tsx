type StreamPlayerProps = {
  videoUid: string;
  title?: string;
  className?: string;
};

export function StreamPlayer({ videoUid, title, className = "" }: StreamPlayerProps) {
  const src = `https://iframe.videodelivery.net/${videoUid}`;

  return (
    <div className={`overflow-hidden rounded-xl bg-black ${className}`}>
      <div className="relative aspect-video w-full">
        <iframe
          src={src}
          title={title ?? "Vídeo"}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
