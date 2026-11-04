const defaultFoodImages = {
  "chocolate brownie": {
    src: "/food/brownie.jpg",
  },
  "creamy alfredo pasta": {
    src: "/food/alfredo-pasta.jpg",
  },
  "margherita pizza": {
    src: "/food/margherita-pizza.jpg",
  },
  "loaded veg sandwich": {
    src: "/food/loaded-veg-sandwich.jpg",
  },
  "peri peri fries": {
    src: "/food/peri-peri-fries.jpg",
  },
  "french fries": {
    src: "/food/french-fries.jpg",
  },
  "paneer sandwich": {
    src: "/food/paneer-sandwich.jpg",
    credit: "Vegan Feast Catering",
    source: "https://commons.wikimedia.org/wiki/File:Pita_Paneer_Sandwich_(3649500472).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  "paneer tikka": {
    src: "/food/paneer-tikka.jpg",
    credit: "YKanchan07",
    source: "https://commons.wikimedia.org/wiki/File:Hot_and_spicy_Paneer_tikka.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "veg burger": {
    src: "/food/veg-burger.jpg",
    credit: "Thamizhpparithi Maari",
    source: "https://commons.wikimedia.org/wiki/File:Vegetable_Burger_of_Salem.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "veg noodles": {
    src: "/food/veg-noodles.jpg",
    credit: "Sheena Aloner",
    source: "https://commons.wikimedia.org/wiki/File:Vegetable_Noodles.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "white sauce pasta": {
    src: "/food/white-sauce-pasta.jpg",
  },
  "butter naan": {
    src: "/food/butter-naan.jpg",
    credit: "Charles Haynes",
    source: "https://commons.wikimedia.org/wiki/File:Butter_Naan.jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
  "gulab jamun": {
    src: "/food/gulab-jamun.jpg",
    credit: "Ulrike Zimmermann",
    source: "https://commons.wikimedia.org/wiki/File:Gulab_Jamun-3052.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "paneer butter masala": {
    src: "/food/paneer-butter-masala.jpg",
    credit: "Gannu03",
    source: "https://commons.wikimedia.org/wiki/File:Paneer_Butter_Masala_3.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "veg biryani": {
    src: "/food/veg-biryani.jpg",
    credit: "Phadke09",
    source: "https://commons.wikimedia.org/wiki/File:Vegetable_Biryani_IMG_001.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "masala dosa": {
    src: "/food/masala-dosa.jpg",
  },
};

export const getFoodPhoto = (item) => {
  const fallback = defaultFoodImages[item?.name?.trim().toLowerCase()];
  if (item?.image) {
    return { src: item.image };
  }

  return fallback || { src: "" };
};
