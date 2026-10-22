import { PaymentStatus } from "../../../generated/prisma";

export interface IInitiatePaymentPayload {
    appointmentId: string;
    gateway?: "STRIPE" | "SSLCOMMERZ";
}


export interface IPaymentFilterRequest {
    searchTerm?: string;
    status?: PaymentStatus;
    appointmentId?: string;
    transactionId?: string;
}
