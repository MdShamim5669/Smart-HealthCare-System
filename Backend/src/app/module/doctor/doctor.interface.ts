import { Gender } from "../../../generated/prisma";

export interface IUpdateDoctorPayload {
    name?: string;
    contactNumber?: string;
    address?: string;
    registrationNumber?: string;
    experience?: number;
    gender?: Gender;
    apointmentFee?: number;
    qualification?: string;
    currentWorkingPlace?: string;
    designation?: string;
    profilePhoto?: string;
    specialties?: string[];
}

export interface IDoctorFilterRequest {
    searchTerm?: string;
    email?: string;
    contactNumber?: string;
    gender?: Gender;
    specialties?: string;
}
