import status from "http-status";
import { AppointmentStatus, Role } from "../../../generated/prisma";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreatePrescriptionPayload, IUpdatePrescriptionPayload } from "./prescription.interface";

const prescriptionInclude = {
    doctor: { select: { id: true, name: true, email: true, designation: true } },
    patient: { select: { id: true, name: true, email: true } },
    appointment: { select: { id: true, status: true, scheduleId: true } },
};

// Doctor writes a prescription for one of their own completed appointments (one per appointment)
const createPrescription = async (payload: ICreatePrescriptionPayload, user: IRequestUser) => {
    const doctorData = await prisma.doctor.findFirst({
        where: { email: user.email, isDeleted: false },
    });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
    }

    const appointmentData = await prisma.appointment.findUnique({
        where: { id: payload.appointmentId },
        include: { prescription: true },
    });

    if (!appointmentData) {
        throw new AppError(status.NOT_FOUND, "Appointment not found");
    }

    if (appointmentData.doctorId !== doctorData.id) {
        throw new AppError(status.FORBIDDEN, "This is not your appointment");
    }

    if (appointmentData.status !== AppointmentStatus.COMPLETED) {
        throw new AppError(status.BAD_REQUEST, "A prescription can only be given for a completed appointment");
    }

    if (appointmentData.prescription) {
        throw new AppError(status.CONFLICT, "A prescription already exists for this appointment");
    }

    return await prisma.prescription.create({
        data: {
            appointmentId: appointmentData.id,
            doctorId: doctorData.id,
            patientId: appointmentData.patientId,
            followUpDate: payload.followUpDate,
            instructions: payload.instructions,
        },
        include: prescriptionInclude,
    });
};

// Patients see prescriptions written for them, doctors see the ones they wrote
const getMyPrescriptions = async (user: IRequestUser) => {
    if (user.role === Role.PATIENT) {
        const patientData = await prisma.patient.findUnique({ where: { email: user.email } });

        if (!patientData) {
            throw new AppError(status.NOT_FOUND, "Patient profile not found");
        }

        return await prisma.prescription.findMany({
            where: { patientId: patientData.id },
            include: prescriptionInclude,
            orderBy: { createdAt: "desc" },
        });
    }

    const doctorData = await prisma.doctor.findUnique({ where: { email: user.email } });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
    }

    return await prisma.prescription.findMany({
        where: { doctorId: doctorData.id },
        include: prescriptionInclude,
        orderBy: { createdAt: "desc" },
    });
};

const getAllPrescriptions = async () => {
    return await prisma.prescription.findMany({
        include: prescriptionInclude,
        orderBy: { createdAt: "desc" },
    });
};

const getPrescriptionById = async (prescriptionId: string, user: IRequestUser) => {
    const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: prescriptionInclude,
    });

    if (!prescription) {
        throw new AppError(status.NOT_FOUND, "Prescription not found");
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    if (!isAdmin) {
        const ownerEmail = user.role === Role.DOCTOR ? prescription.doctor.email : prescription.patient.email;

        if (ownerEmail !== user.email) {
            throw new AppError(status.FORBIDDEN, "You do not have access to this prescription");
        }
    }

    return prescription;
};

// Only the doctor who wrote it can edit it
const updatePrescription = async (prescriptionId: string, payload: IUpdatePrescriptionPayload, user: IRequestUser) => {
    const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: { doctor: true },
    });

    if (!prescription) {
        throw new AppError(status.NOT_FOUND, "Prescription not found");
    }

    if (prescription.doctor.email !== user.email) {
        throw new AppError(status.FORBIDDEN, "This is not your prescription");
    }

    return await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
            followUpDate: payload.followUpDate,
            instructions: payload.instructions,
        },
        include: prescriptionInclude,
    });
};

export const PrescriptionService = {
    createPrescription,
    getMyPrescriptions,
    getAllPrescriptions,
    getPrescriptionById,
    updatePrescription,
};
