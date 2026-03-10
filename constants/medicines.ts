/**
 * Common medicine names for autocomplete suggestions
 */
export const commonMedicines: string[] = [
  "Metformin",
  "Amlodipine",
  "Atorvastatin",
  "Aspirin",
  "Metoprolol",
  "Losartan",
  "Omeprazole",
  "Pantoprazole",
  "Lisinopril",
  "Levothyroxine",
  "Ramipril",
  "Telmisartan",
  "Clopidogrel",
  "Rosuvastatin",
  "Glycomet",
  "Ecosprin",
  "Telma",
  "Thyronorm",
  "Stamlo",
  "Pan-D",
  "Shelcal",
  "Crocin",
  "Dolo",
  "Combiflam",
  "Montair",
  "Cetirizine",
  "Allegra",
  "Azithromycin",
  "Amoxicillin",
  "Ciprofloxacin",
  "Paracetamol",
  "Ibuprofen",
  "Diclofenac",
  "Ranitidine",
  "Domperidone",
  "Calcium + D3",
  "Vitamin B12",
  "Vitamin D",
  "Iron + Folic Acid",
  "Multivitamin",
];

export const medicineUnits = ["tablet", "mg", "ml", "drops"] as const;
export type MedicineUnit = (typeof medicineUnits)[number];

export const frequencyOptions = [
  "daily",
  "weekly",
  "weekdays",
  "custom",
] as const;
export type Frequency = (typeof frequencyOptions)[number];

export const dayLabels = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
export const dayValues = [0, 1, 2, 3, 4, 5, 6] as const; // Sunday = 0

export const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  weekdays: "Weekdays",
  custom: "Custom",
};
