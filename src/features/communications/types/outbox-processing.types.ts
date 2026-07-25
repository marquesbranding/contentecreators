export type OutboxEmailPayload = Record<
  string,
  string | number | boolean | null
>;

export type OutboxEmailTemplate =
  | "ONBOARDING_RECEIVED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SUSPENDED"
  | "RESTORED"
  | "BANNED";

export interface ClaimedEmailOutboxItem {
  attemptNumber: number;
  claimVersion: number;
  id: string;
  idempotencyKey: string;
  maxAttempts: number;
  payload: OutboxEmailPayload;
  recipientEmail: string;
  template: OutboxEmailTemplate;
  workerId: string;
}

export interface OutboxDeliveryMessage {
  idempotencyKey: string;
  outboxId: string;
  payload: OutboxEmailPayload;
  recipientEmail: string;
  template: OutboxEmailTemplate;
}

export type OutboxDeliveryResult =
  | {
      kind: "sent";
      providerMessageIdHash?: string;
      responseCode?: string;
    }
  | {
      errorCategory: string;
      errorCode?: string;
      kind: "failed";
      retryable?: boolean;
    };

export interface OutboxDeliveryPort {
  deliver(message: OutboxDeliveryMessage): Promise<OutboxDeliveryResult>;
}
