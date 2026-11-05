export type Insumo = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inventory: {
    current_stock: number;
    minimum_stock: number;
    expiration_date: string;
  };
  unit: string;
  location: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  restored_at?: string | null;
};

export type InsumoForm = {
  id: string;
  name: string;
  description: string;
  category: string;
  currentStock: string;
  minimumStock: string;
  expirationDate: string;
  unit: string;
  location: string;
  status?: boolean;
};

export const emptyInsumoForm: InsumoForm = {
  id: '',
  name: '',
  description: '',
  category: '',
  currentStock: '',
  minimumStock: '',
  expirationDate: '',
  unit: '',
  location: '',
  status: true,
};