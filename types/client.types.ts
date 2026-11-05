export type FarmPlot = {
  farm_name: string;
  hectareas: number;
  type_crop: string;
};

export type Address = {
  department: string;
  province: string;
  district: string;
  especifics?: {
    settlement_type: string;
    settlement_name: string;
    street_type: string;
    street_name: string;
    reference: string;
  };
  settlement_type?: string;
  settlement_name?: string;
  street_type?: string;
  street_name?: string;
  reference?: string;
};

export type Client = {
  id: string;
  first_name?: string;
  last_name?: string;
  document_type?: string;
  document_number?: string;
  firstName?: string;
  lastName?: string;
  documentType?: string;
  documentNumber?: string;
  phone?: string | string[];
  email?: string;
  registration_date?: string;
  registrationDate?: string;
  status?: boolean;
  estado?: string;
  farm_plot?: FarmPlot | FarmPlot[];
  address?: Address;
};

export type ClientPayload = Partial<Client> & {
  id?: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  phone: string | string[];
  email: string;
  registrationDate: string;
  farmName: string;
  hectareas: string;
  typeCrop: string;
  department: string;
  province: string;
  district: string;
  settlementType: string;
  settlementName: string;
  streetType: string;
  streetName: string;
  reference: string;
};
