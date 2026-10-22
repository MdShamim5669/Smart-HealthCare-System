export interface IBookAppointmentPayload {
    doctorId: string;
    scheduleId: string;
    gateway?: "STRIPE" | "SSLCOMMERZ";
}

