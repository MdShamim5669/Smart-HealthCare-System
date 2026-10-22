import { PaymentStatus } from "../../../generated/prisma";

export interface IInitiatePaymentPayload {
    appointmentId: string;
}

export interface IPaymentFilterRequest {
    searchTerm?: string;
    status?: PaymentStatus;
    appointmentId?: string;
    transactionId?: string;
}
