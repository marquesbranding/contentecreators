export interface PendingWhatsappContactDto {
  clickedAt: string;
  confirmationId: string;
  creatorDisplayName: string;
  creatorProfileId: string;
}

export interface ConfirmWhatsappContactResult {
  creatorProfileId: string;
  whatsappContactCount: number;
}
