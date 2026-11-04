import { getAssetUrl } from "../api";
import { getFoodPhoto } from "../Data/foodImages";

export default function FoodImage({ item, className, creditPlacement = "overlay" }) {
  const photo = getFoodPhoto(item);

  return (
    <div className={className}>
      {photo.src ? (
        <img src={getAssetUrl(photo.src)} alt={item.name} loading="lazy" />
      ) : (
        <span aria-hidden="true">🍽️</span>
      )}
      {photo.credit && (
        <div
          className={`food-image-credit ${
            creditPlacement === "inline" ? "food-image-credit-inline" : ""
          }`}
        >
          <a href={photo.source} target="_blank" rel="noreferrer">
            Photo: {photo.credit}
          </a>
          <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
            {photo.license}
          </a>
        </div>
      )}
    </div>
  );
}
