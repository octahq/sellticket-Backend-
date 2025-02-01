export enum TicketType {
  FREE = 'free',
  TOKEN_GATED = 'token-gated',
  PAID = 'paid',
}

export enum TokenGatingType {
  PAST_EVENT = 'past-event',
  CONTRACT_ADDRESS = 'contract-address',
}

export enum TicketStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RESOLD = 'resold',
  SCANNED = 'scanned',
  CHECKED_IN = 'checked-in',
  INVALIDATED = 'invalidated',
  CLAIMED = 'claimed',
}

export enum PurchaseStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ResaleStatus {
  LISTED = 'listed',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
}
