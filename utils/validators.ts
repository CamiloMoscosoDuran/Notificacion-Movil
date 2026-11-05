import type { ClientPayload } from '../types/client.types';
import type { InsumoForm } from '../types/insumo.types';

// ─── Patterns ──────────────────────────────────────────────────────────────
export const SUPPLY_ID_PATTERN = /^SUP[0-9]{3,}$/;
const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/;
const POSITIVE_NUMBER = /^\d+(\.\d+)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_PATTERN = /^[a-zA-Z0-9]{1}[a-zA-Z0-9.]{1}[a-zA-Z0-9.]*$/; // al menos 2 chars alfanuméricos
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{9}$/;

// ─── Insumo / Supply ───────────────────────────────────────────────────────
export function validateInsumo(form: InsumoForm): string | null {
  if (form.id.trim() && !SUPPLY_ID_PATTERN.test(form.id.trim())) {
    return 'El ID debe tener el formato SUP000 (por ejemplo, SUP001).';
  }
  if (!form.name.trim()) return 'El nombre es obligatorio.';
  if (form.name.trim().length < 10) return 'El nombre debe tener al menos 10 caracteres.';
  if (!form.description.trim()) return 'La descripción es obligatoria.';
  if (form.description.trim().length < 10) return 'La descripción debe tener al menos 10 caracteres.';
  if (!form.category.trim()) return 'La categoría es obligatoria.';
  if (!form.unit.trim()) return 'Debes seleccionar una unidad.';
  if (!form.location.trim()) return 'La ubicación es obligatoria.';
  if (form.location.trim().length < 10) return 'La ubicación debe tener al menos 10 caracteres.';

  if (!POSITIVE_NUMBER.test(form.minimumStock) || Number(form.minimumStock) <= 0) {
    return 'El stock mínimo debe ser un número positivo mayor que 0.';
  }
  if (!POSITIVE_NUMBER.test(form.currentStock) || Number(form.currentStock) < 0) {
    return 'El stock actual debe ser un número positivo mayor o igual a 0.';
  }
  if (Number(form.currentStock) < Number(form.minimumStock)) {
    return 'El stock actual no puede ser menor que el stock mínimo.';
  }
  if (!DATE_PATTERN.test(form.expirationDate)) {
    return 'La fecha de vencimiento debe tener el formato AAAA-MM-DD.';
  }
  return null;
}

// ─── Formula ────────────────────────────────────────────────────────────────
export type FormulaFormValidation = {
  name: string;
  description: string;
  standardBatch: string;
  unit: string;
  productionTime: string;
  suggestedPrice: string;
  recipeVersion: string;
  ingredients: { supply_id: string; quantity_required: string | number; percentage: string | number }[];
  gallonType: string;
  stockQuantity: string;
};

export function validateFormula(form: FormulaFormValidation): string | null {
  // Nombre: solo letras, mínimo 10
  if (!form.name.trim()) return 'El nombre es obligatorio.';
  if (!ONLY_LETTERS.test(form.name.trim())) return 'El nombre solo puede contener letras.';
  if (form.name.trim().length < 10) return 'El nombre debe tener más de 10 caracteres.';

  // Descripción: solo letras, mínimo 10
  if (!form.description.trim()) return 'La descripción es obligatoria.';
  if (!ONLY_LETTERS.test(form.description.trim())) return 'La descripción solo puede contener letras.';
  if (form.description.trim().length < 10) return 'La descripción debe tener más de 10 caracteres.';

  // Lote estándar: número positivo > 0
  if (!POSITIVE_NUMBER.test(form.standardBatch) || Number(form.standardBatch) <= 0) {
    return 'El lote estándar debe ser un número positivo mayor que 0.';
  }

  // Unidad: obligatoria (litros, toneladas, kilogramos)
  if (!form.unit.trim()) return 'Debes seleccionar una unidad.';

  // Tiempo de producción: número positivo > 0
  if (!POSITIVE_NUMBER.test(form.productionTime) || Number(form.productionTime) <= 0) {
    return 'El tiempo de producción debe ser un número positivo mayor que 0.';
  }

  // Precio sugerido: número positivo > 0
  if (!POSITIVE_NUMBER.test(form.suggestedPrice) || Number(form.suggestedPrice) <= 0) {
    return 'El precio sugerido debe ser un número positivo mayor que 0.';
  }

  // Versión de receta: al menos 2 caracteres alfanuméricos
  if (!form.recipeVersion.trim()) return 'La versión de receta es obligatoria.';
  if (form.recipeVersion.trim().length < 2) return 'La versión de receta debe tener al menos 2 caracteres.';
  if (!VERSION_PATTERN.test(form.recipeVersion.trim())) {
    return 'La versión de receta solo puede contener letras y números (ej: 1.0, v2, A1).';
  }

  // Ingredientes
  for (let i = 0; i < form.ingredients.length; i++) {
    const ing = form.ingredients[i];
    if (!ing.supply_id.trim()) {
      return `Selecciona un insumo para el ingrediente ${i + 1}.`;
    }
    const qty = String(ing.quantity_required);
    if (!POSITIVE_NUMBER.test(qty) || Number(qty) <= 0) {
      return `La cantidad requerida del ingrediente ${i + 1} debe ser un número positivo mayor que 0.`;
    }
    const pct = String(ing.percentage);
    if (!POSITIVE_NUMBER.test(pct) || Number(pct) <= 0) {
      return `El porcentaje del ingrediente ${i + 1} debe ser un número positivo mayor que 0.`;
    }
  }

  // Tipo de galón: obligatorio (1 o 20)
  if (!form.gallonType || (form.gallonType !== '1' && form.gallonType !== '20')) {
    return 'Debes seleccionar el tipo de galón (1 Litro o 20 Litros).';
  }

  // Stock de fórmula: número >= 0
  if (!POSITIVE_NUMBER.test(form.stockQuantity) || Number(form.stockQuantity) < 0) {
    return 'La cantidad en stock debe ser un número positivo mayor o igual a 0.';
  }

  return null;
}

// ─── Cliente / Customer ─────────────────────────────────────────────────────
export function validateClient(form: ClientPayload): string | null {
  // Nombre
  if (!form.firstName.trim()) return 'El nombre es obligatorio.';
  if (form.firstName.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!ONLY_LETTERS.test(form.firstName.trim())) return 'El nombre solo puede contener letras.';

  // Apellido
  if (!form.lastName.trim()) return 'El apellido es obligatorio.';
  if (form.lastName.trim().length < 3) return 'El apellido debe tener al menos 3 caracteres.';
  if (!ONLY_LETTERS.test(form.lastName.trim())) return 'El apellido solo puede contener letras.';

  // Tipo de documento
  if (!form.documentType || !['DNI', 'RUC', 'CE'].includes(form.documentType)) {
    return 'Debes seleccionar un tipo de documento: DNI, RUC o CE.';
  }

  // Número de documento según tipo
  const docNum = typeof form.documentNumber === 'string' ? form.documentNumber.trim() : '';
  if (!docNum) return 'El número de documento es obligatorio.';
  if (!/^\d+$/.test(docNum)) return 'El número de documento solo puede contener números.';
  if (form.documentType === 'DNI' && docNum.length !== 8) {
    return 'El DNI debe tener exactamente 8 dígitos.';
  }
  if (form.documentType === 'RUC' && docNum.length !== 11) {
    return 'El RUC debe tener exactamente 11 dígitos.';
  }
  if (form.documentType === 'CE' && docNum.length !== 9) {
    return 'El CE debe tener exactamente 9 dígitos.';
  }
  if (form.documentType !== 'DNI' && form.documentType !== 'RUC' && form.documentType !== 'CE' && docNum.length < 8) {
    return 'El número de documento debe tener al menos 8 dígitos.';
  }

  // El backend admite varios teléfonos y el formulario los representa separados por comas.
  const phones = (Array.isArray(form.phone) ? form.phone : String(form.phone ?? '').split(','))
    .map((phone) => phone.trim())
    .filter(Boolean);
  if (phones.length === 0) return 'El teléfono es obligatorio.';
  if (phones.some((phone) => !PHONE_PATTERN.test(phone))) {
    return 'Cada teléfono debe tener exactamente 9 dígitos.';
  }

  // Email
  const email = form.email?.trim() ?? '';
  if (!email) return 'El correo electrónico es obligatorio.';
  if (email.length < 10) return 'El correo debe tener al menos 10 caracteres.';
  if (!EMAIL_PATTERN.test(email)) return 'El correo electrónico no es válido (debe contener @).';

  // Farm plot
  if (!form.farmName?.trim()) return 'El nombre del predio es obligatorio.';
  if (form.farmName.trim().length < 3) return 'El nombre del predio debe tener al menos 3 caracteres.';
  if (!ONLY_LETTERS.test(form.farmName.trim())) return 'El nombre del predio solo puede contener letras.';

  const hect = String(form.hectareas ?? '').trim();
  if (!hect) return 'Las hectáreas son obligatorias.';
  if (!POSITIVE_NUMBER.test(hect) || Number(hect) <= 0) {
    return 'Las hectáreas deben ser un número positivo mayor que 0.';
  }

  if (!form.typeCrop?.trim()) return 'El tipo de cultivo es obligatorio.';
  if (form.typeCrop.trim().length < 10) return 'El tipo de cultivo debe tener más de 10 caracteres.';

  // Dirección
  if (!form.department?.trim()) return 'El departamento es obligatorio.';
  if (form.department.trim().length < 3) return 'El departamento debe tener al menos 3 caracteres.';
  if (!ONLY_LETTERS.test(form.department.trim())) return 'El departamento solo puede contener letras.';

  if (!form.province?.trim()) return 'La provincia es obligatoria.';
  if (form.province.trim().length < 3) return 'La provincia debe tener al menos 3 caracteres.';
  if (!ONLY_LETTERS.test(form.province.trim())) return 'La provincia solo puede contener letras.';

  if (!form.district?.trim()) return 'El distrito es obligatorio.';
  if (form.district.trim().length < 3) return 'El distrito debe tener al menos 3 caracteres.';
  if (!ONLY_LETTERS.test(form.district.trim())) return 'El distrito solo puede contener letras.';

  if (!form.settlementType?.trim()) return 'Debes seleccionar un tipo de asentamiento.';
  if (!form.settlementName?.trim()) return 'El nombre del asentamiento es obligatorio.';
  if (form.settlementName.trim().length < 5) return 'El nombre del asentamiento debe tener al menos 5 caracteres.';

  if (!form.streetType?.trim()) return 'Debes seleccionar un tipo de vía.';
  if (!form.streetName?.trim()) return 'El nombre de la vía es obligatorio.';
  if (form.streetName.trim().length < 5) return 'El nombre de la vía debe tener al menos 5 caracteres.';

  if (!form.reference?.trim()) return 'La referencia es obligatoria.';
  if (form.reference.trim().length < 10) return 'La referencia debe tener al menos 10 caracteres.';

  return null;
}
