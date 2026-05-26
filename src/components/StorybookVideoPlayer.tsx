// Public storybook cartoon video player component.

type VideoProps = {
  videoUrl: string;
  title?: string;
  description?: string;
  posterImageUrl?: string;
  mimeType?: string;
};

export default function StorybookVideoPlayer({
  video,
  fallbackPosterUrl,
}: {
  video: VideoProps;
  fallbackPosterUrl?: string;
}) {
  const poster = video.posterImageUrl || fallbackPosterUrl;

  return (
    <div className="flex flex-col gap-4">
      {/* Title + description */}
      {(video.title || video.description) && (
        <div className="flex flex-col gap-1">
          {video.title && (
            <h3 className="text-base font-black text-tiki-brown">{video.title}</h3>
          )}
          {video.description && (
            <p className="text-sm text-tiki-brown/65 leading-relaxed">{video.description}</p>
          )}
        </div>
      )}

      {/* Video player */}
      <div className="rounded-3xl overflow-hidden border border-tiki-brown/10 shadow-md bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={video.videoUrl}
          controls
          playsInline
          preload="metadata"
          poster={poster}
          className="w-full block"
          aria-label={video.title ? `Watch: ${video.title}` : "Storybook cartoon video"}
        />
      </div>
    </div>
  );
}
