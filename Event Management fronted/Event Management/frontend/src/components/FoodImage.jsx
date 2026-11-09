import { useEffect, useState } from "react";
import { getAssetUrl } from "../api";
import { getBeveragePhoto, getFoodPhoto } from "../Data/foodImages";

export default function FoodImage({
  item,
  className,
  creditPlacement = "overlay",
  showCredit = true,
  kind = "food",
}) {
  const getPhoto = kind === "beverage" ? getBeveragePhoto : getFoodPhoto;
  const photo = getPhoto(item);
  const fallbackPhoto = item?.image
    ? getPhoto({ ...item, image: "" })
    : null;
  const [usingFallback, setUsingFallback] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = getAssetUrl(
    usingFallback ? fallbackPhoto?.src : photo.src
  );
  const visiblePhoto = usingFallback ? fallbackPhoto : photo;

  useEffect(() => {
    setUsingFallback(false);
    setImageFailed(false);
  }, [kind, photo.src]);

  return (
    <div className={className}>
      {imageSrc && !imageFailed ? (
        <img
          src={imageSrc}
          alt={item.name}
          loading="lazy"
          onError={() => {
            if (
              !usingFallback &&
              fallbackPhoto?.src &&
              fallbackPhoto.src !== photo.src
            ) {
              setUsingFallback(true);
            } else {
              setImageFailed(true);
            }
          }}
        />
      ) : (
        <span aria-hidden="true">🍽️</span>
      )}
      {showCredit && visiblePhoto?.credit && (
        <div
          className={`food-image-credit ${
            creditPlacement === "inline" ? "food-image-credit-inline" : ""
          }`}
        >
          <a href={visiblePhoto.source} target="_blank" rel="noreferrer">
            Photo: {visiblePhoto.credit}
          </a>
          <a href={visiblePhoto.licenseUrl} target="_blank" rel="noreferrer">
            {visiblePhoto.license}
          </a>
        </div>
      )}
    </div>
  );
}
