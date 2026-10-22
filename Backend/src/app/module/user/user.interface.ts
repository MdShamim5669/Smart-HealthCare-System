import { Gender, Role } from "../../../generated/prisma";

export interface ICreateDoctorPayload {
    password?: string;
    doctor: {
        name: string;
        email: string;
        contactNumber?: string;
        address?: string;
        registrationNumber?: string;
        experience?: number;
        gender: Gender;
        apointmentFee: number;
        qualification?: string;
        currentWorkingPlace?: string;
        designation?: string;
        specialties?: string[];
    };
}

export interface ICreateAdminPayload {
    password?: string;
    role?: Role;
    admin: {
        name: string;
        email: string;
        contactNumber?: string;
    };
}
