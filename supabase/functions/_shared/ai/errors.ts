export type ErrorCode = 
  | 'invalid_request' 
  | 'unauthorized' 
  | 'forbidden' 
  | 'payment_required'
  | 'rate_limited' 
  | 'timeout' 
  | 'provider_unavailable'
  | 'invalid_json' 
  | 'validation_failed' 
  | 'unknown';

export class AIProviderError extends Error {
  public code: ErrorCode;
  public details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.details = details;
  }
}
