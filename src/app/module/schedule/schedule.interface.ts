export interface ICreateSchedulePayload {
    startDate: string; // ISO date string or YYYY-MM-DD
    endDate: string;
    startTime: string; // HH:mm (e.g. "09:00")
    endTime: string;   // HH:mm (e.g. "17:00")
}

export interface IScheduleFilterRequest {
    startDate?: string;
    endDate?: string;
}
