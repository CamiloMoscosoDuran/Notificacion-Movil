export type FormulaIngredient = {
  supply_id: string;
  supply_name: string;
  quantity_required: number;
  percentage: number;
};

export type FormulaInventory = { gallon_type: number; stock_quantity: number; last_update?: string };

export type Formula = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  standard_batch: number;
  unit: string;
  production_time?: number;
  preparation_cost?: number;
  suggested_price?: number;
  status: boolean;
  recipe?: { version: string; ingredients: FormulaIngredient[] };
  formula_inventory?: FormulaInventory[] | FormulaInventory;
};

export type FormulaFormValues = {
  name: string; description: string; standard_batch: string; unit: string;
  production_time: string; preparation_cost: string; suggested_price: string;
  status: boolean; recipe_version: string; ingredients: FormulaIngredient[];
  gallon_type: string; stock_quantity: string;
};

export const createEmptyFormulaForm = (): FormulaFormValues => ({
  name: '', description: '', standard_batch: '', unit: 'L', production_time: '0',
  preparation_cost: '0', suggested_price: '0', status: true, recipe_version: '1.0',
  ingredients: [{ supply_id: '', supply_name: '', quantity_required: 0, percentage: 0 }],
  gallon_type: '1', stock_quantity: '0',
});
