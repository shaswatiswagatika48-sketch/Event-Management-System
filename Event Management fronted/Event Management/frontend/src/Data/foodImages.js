import alfredoPasta from "../assets/food/alfredo-pasta.jpg";
import brownie from "../assets/food/brownie.jpg";
import butterNaan from "../assets/food/butter-naan.jpg";
import frenchFries from "../assets/food/french-fries.jpg";
import gulabJamun from "../assets/food/gulab-jamun.jpg";
import loadedVegSandwich from "../assets/food/loaded-veg-sandwich.jpg";
import margheritaPizza from "../assets/food/margherita-pizza.jpg";
import masalaDosa from "../assets/food/masala-dosa.jpg";
import paneerButterMasala from "../assets/food/paneer-butter-masala.jpg";
import paneerSandwich from "../assets/food/paneer-sandwich.jpg";
import paneerTikka from "../assets/food/paneer-tikka.jpg";
import periPeriFries from "../assets/food/peri-peri-fries.jpg";
import vegBiryani from "../assets/food/veg-biryani.jpg";
import vegBurger from "../assets/food/veg-burger.jpg";
import vegNoodles from "../assets/food/veg-noodles.jpg";
import whiteSaucePasta from "../assets/food/white-sauce-pasta.jpg";
import freshLimeSoda from "../assets/beverages/fresh-lime-soda.svg";
import mangoShake from "../assets/beverages/mango-shake.svg";
import refreshingDrink from "../assets/beverages/refreshing-drink.svg";

const defaultFoodImages = {
  "chocolate brownie": {
    src: brownie,
  },
  "creamy alfredo pasta": {
    src: alfredoPasta,
  },
  "margherita pizza": {
    src: margheritaPizza,
  },
  "loaded veg sandwich": {
    src: loadedVegSandwich,
  },
  "peri peri fries": {
    src: periPeriFries,
  },
  "french fries": {
    src: frenchFries,
  },
  "paneer sandwich": {
    src: paneerSandwich,
    credit: "Vegan Feast Catering",
    source: "https://commons.wikimedia.org/wiki/File:Pita_Paneer_Sandwich_(3649500472).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  "paneer tikka": {
    src: paneerTikka,
    credit: "YKanchan07",
    source: "https://commons.wikimedia.org/wiki/File:Hot_and_spicy_Paneer_tikka.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "veg burger": {
    src: vegBurger,
    credit: "Thamizhpparithi Maari",
    source: "https://commons.wikimedia.org/wiki/File:Vegetable_Burger_of_Salem.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "veg noodles": {
    src: vegNoodles,
    credit: "Sheena Aloner",
    source: "https://commons.wikimedia.org/wiki/File:Vegetable_Noodles.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "white sauce pasta": {
    src: whiteSaucePasta,
  },
  "butter naan": {
    src: butterNaan,
    credit: "Charles Haynes",
    source: "https://commons.wikimedia.org/wiki/File:Butter_Naan.jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
  "gulab jamun": {
    src: gulabJamun,
    credit: "Ulrike Zimmermann",
    source: "https://commons.wikimedia.org/wiki/File:Gulab_Jamun-3052.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "paneer butter masala": {
    src: paneerButterMasala,
    credit: "Gannu03",
    source: "https://commons.wikimedia.org/wiki/File:Paneer_Butter_Masala_3.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "veg biryani": {
    src: vegBiryani,
    credit: "Phadke09",
    source: "https://commons.wikimedia.org/wiki/File:Vegetable_Biryani_IMG_001.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "masala dosa": {
    src: masalaDosa,
  },
};

const foodImageKeywords = [
  [["pizza"], defaultFoodImages["margherita pizza"]],
  [["biryani", "pulao"], defaultFoodImages["veg biryani"]],
  [["paneer tikka", "tikka", "kebab", "kabab"], defaultFoodImages["paneer tikka"]],
  [["paneer", "masala", "curry"], defaultFoodImages["paneer butter masala"]],
  [["pasta", "macaroni", "spaghetti"], defaultFoodImages["creamy alfredo pasta"]],
  [["sandwich", "wrap", "roll"], defaultFoodImages["loaded veg sandwich"]],
  [["burger"], defaultFoodImages["veg burger"]],
  [["noodle", "chow mein"], defaultFoodImages["veg noodles"]],
  [["fries", "french fry", "potato"], defaultFoodImages["french fries"]],
  [["dosa"], defaultFoodImages["masala dosa"]],
  [["naan", "roti", "paratha", "flatbread"], defaultFoodImages["butter naan"]],
  [["brownie", "cake", "chocolate"], defaultFoodImages["chocolate brownie"]],
  [["gulab jamun", "dessert", "sweet"], defaultFoodImages["gulab jamun"]],
];

const foodImageCategories = {
  starter: defaultFoodImages["paneer tikka"],
  appetizer: defaultFoodImages["paneer tikka"],
  snack: defaultFoodImages["french fries"],
  "main course": defaultFoodImages["veg biryani"],
  dessert: defaultFoodImages["gulab jamun"],
  sweet: defaultFoodImages["gulab jamun"],
};

const getDefaultFoodPhoto = (item) => {
  const name = item?.name?.trim().toLowerCase() || "";
  const namedPhoto = defaultFoodImages[name];
  if (namedPhoto) return namedPhoto;

  const keywordPhoto = foodImageKeywords.find(([keywords]) =>
    keywords.some((keyword) => name.includes(keyword))
  )?.[1];
  if (keywordPhoto) return keywordPhoto;

  const category = item?.category?.trim().toLowerCase() || "";
  if (category.includes("beverage") || category.includes("drink")) {
    return { src: "" };
  }

  const categoryPhoto = Object.entries(foodImageCategories).find(([key]) =>
    category.includes(key)
  )?.[1];

  return categoryPhoto || defaultFoodImages["paneer tikka"];
};

export const getFoodPhoto = (item) => {
  if (item?.image) {
    return { src: item.image };
  }

  return getDefaultFoodPhoto(item);
};

export const getBeveragePhoto = (item) => {
  if (item?.image) {
    return { src: item.image };
  }

  const name = item?.name?.trim().toLowerCase() || "";
  if (name.includes("lime") || name.includes("lemon") || name.includes("soda")) {
    return { src: freshLimeSoda };
  }
  if (name.includes("mango") || name.includes("shake") || name.includes("smoothie")) {
    return { src: mangoShake };
  }

  return { src: refreshingDrink };
};
