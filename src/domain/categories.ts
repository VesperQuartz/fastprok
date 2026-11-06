export const CATEGORY_IDS = [
  "office-furniture",
  "office-supplies",
  "computer-peripherals",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const CATEGORIES: ReadonlyArray<{ id: CategoryId; label: string }> = [
  { id: "office-furniture", label: "Office furniture" },
  { id: "office-supplies", label: "Stationery & office supplies" },
  { id: "computer-peripherals", label: "Computer peripherals" },
];

export const categoryLabel = (id: CategoryId) =>
  CATEGORIES.find((category) => category.id === id)?.label ?? id;

const CATEGORY_KEYWORDS: ReadonlyArray<{ id: CategoryId; keywords: ReadonlyArray<string> }> = [
  {
    id: "office-furniture",
    keywords: [
      "chair",
      "chairs",
      "desk",
      "desks",
      "table",
      "tables",
      "cabinet",
      "cabinets",
      "shelf",
      "shelves",
      "sofa",
      "furniture",
      "ergonomic",
      "workstation",
    ],
  },
  {
    id: "office-supplies",
    keywords: [
      "pen",
      "pens",
      "paper",
      "ream",
      "reams",
      "notebook",
      "notebooks",
      "toner",
      "ink",
      "stationery",
      "stapler",
      "folder",
      "folders",
      "envelope",
      "envelopes",
      "whiteboard",
    ],
  },
  {
    id: "computer-peripherals",
    keywords: [
      "mouse",
      "mice",
      "keyboard",
      "keyboards",
      "monitor",
      "monitors",
      "laptop",
      "laptops",
      "webcam",
      "headset",
      "headphones",
      "dock",
      "docking",
      "usb",
      "cable",
      "charger",
      "printer",
      "peripheral",
    ],
  },
];

export const categoryFromText = (text: string): CategoryId | null => {
  const normalized = text.toLowerCase();

  for (const category of CATEGORY_KEYWORDS) {
    if (category.keywords.some((keyword) => normalized.includes(keyword))) {
      return category.id;
    }
  }

  return null;
};
