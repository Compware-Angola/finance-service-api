export interface AppyPayTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface AppyPayPayloadInput {
  amount: number;
  currency: string;
  description: string;
  dueDate: string;
  referenceNumber: string;
  notify?: {
    name?: string;
    telephone?: string;
    email?: string;
    smsNotification?: boolean;
    emailNotification?: boolean;
  };
}

export interface AppyPayNotifyPayload {
  name?: string;
  telephone?: string;
  email?: string;
  smsNotification?: boolean;
  emailNotification?: boolean;
}

export interface AppyPayPayload {
  amount: number;
  currency: string;
  description: string;
  paymentMethod: string;
  paymentInfo: {
    dueDate: string;
    referenceNumber: string;
  };
  merchantTransactionId: string;
  notify?: AppyPayNotifyPayload;
}

export interface AppyPayReferenceInfo {
  referenceNumber?: string;
  entity?: string;
}

export interface AppyPayResponseStatus {
  successful?: boolean;
  status?: string;
  reference?: AppyPayReferenceInfo;
}

export interface AppyPayChargeResponse {
  id?: string;
  responseStatus?: AppyPayResponseStatus;
  [key: string]: unknown;
}
