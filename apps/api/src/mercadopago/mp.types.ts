export type MpPaymentCreate = {
  transaction_amount: number;
  token: string;
  description: string;
  installments: number;
  payment_method_id: string;
  issuer_id: number;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
  notification_url?: string;
  external_reference?: string;
  additional_info?: {
    ip_address?: string;
  };
  three_d_secure_mode?: 'optional' | 'mandatory' | 'not_supported';
};

export type MpPaymentResponse = {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
};

export type MpPreapprovalCreate = {
  reason: string;
  external_reference: string;
  auto_recurring: {
    frequency: number;
    frequency_type: 'days' | 'months';
    transaction_amount: number;
    currency_id: string;
  };
  payer_email: string;
  card_token_id: string;
  notification_url?: string;
  status?: 'authorized';
};

export type MpPreapprovalResponse = {
  id: string;
  status: string;
  next_payment_date?: string | null;
};
