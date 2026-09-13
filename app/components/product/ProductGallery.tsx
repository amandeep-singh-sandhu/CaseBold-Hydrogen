import {Image} from '@shopify/hydrogen';

interface ProductGalleryProps {
  image?: any;
  fallbackImage?: any;
  title: string;
}

export function ProductGallery({
  image,
  fallbackImage,
  title,
}: ProductGalleryProps) {
  const activeImage = image || fallbackImage;

  return (
    <div className="aspect-square bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm flex items-center justify-center overflow-hidden">
      {activeImage ? (
        <Image
          data={activeImage}
          sizes="(min-width: 1024px) 50vw, 100vw"
          loading="eager"
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <span className="text-neutral-500 text-sm">No Image</span>
      )}
    </div>
  );
}
