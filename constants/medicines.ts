/**
 * Common medicine names for autocomplete suggestions
 */
export const commonMedicines: string[] = [
    'Metformin',
    'Amlodipine',
    'Atorvastatin',
    'Aspirin',
    'Metoprolol',
    'Losartan',
    'Omeprazole',
    'Pantoprazole',
    'Lisinopril',
    'Levothyroxine',
    'Ramipril',
    'Telmisartan',
    'Clopidogrel',
    'Rosuvastatin',
    'Glycomet',
    'Ecosprin',
    'Telma',
    'Thyronorm',
    'Stamlo',
    'Pan-D',
    'Shelcal',
    'Crocin',
    'Dolo',
    'Combiflam',
    'Montair',
    'Cetirizine',
    'Allegra',
    'Azithromycin',
    'Amoxicillin',
    'Ciprofloxacin',
    'Paracetamol',
    'Ibuprofen',
    'Diclofenac',
    'Ranitidine',
    'Domperidone',
    'Calcium + D3',
    'Vitamin B12',
    'Vitamin D',
    'Iron + Folic Acid',
    'Multivitamin',
];

export const medicineUnits = ['mg', 'ml', 'tablet', 'drops'] as const;
export type MedicineUnit = (typeof medicineUnits)[number];

export const frequencyOptions = ['daily', 'weekdays', 'custom'] as const;
export type Frequency = (typeof frequencyOptions)[number];

export const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const dayValues = [0, 1, 2, 3, 4, 5, 6] as const; // Sunday = 0
