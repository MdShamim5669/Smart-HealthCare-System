import status from "http-status";
import { AppointmentStatus, Prisma, Role } from "../../../generated/prisma";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreateReviewPayload, IUpdateReviewPayload } from "./review.interface";

// Recalculates the doctor's average rating from all of their reviews
const refreshDoctorRating = async (tx: Prisma.TransactionClient, doctorId: string) => {
    const result = await tx.review.aggregate({
        where: { doctorId },
        _avg: { rating: true },
    });

    await tx.doctor.update({
        where: { id: doctorId },
        data: { averageRating: Number((result._avg.rating ?? 0).toFixed(1)) },
    });
};

const getPatientOrThrow = async (user: IRequestUser) => {
    const patientData = await prisma.patient.findUnique({ where: { email: user.email } });

    if (!patientData) {
        throw new AppError(status.NOT_FOUND, "Patient profile not found");
    }

    return patientData;
};

// Patient writes a review for one of their own completed appointments (one per appointment)
const createReview = async (payload: ICreateReviewPayload, user: IRequestUser) => {
    const patientData = await getPatientOrThrow(user);

    const appointmentData = await prisma.appointment.findUnique({
        where: { id: payload.appointmentId },
        include: { review: true },
    });

    if (!appointmentData) {
        throw new AppError(status.NOT_FOUND, "Appointment not found");
    }

    if (appointmentData.patientId !== patientData.id) {
        throw new AppError(status.FORBIDDEN, "This is not your appointment");
    }

    if (appointmentData.status !== AppointmentStatus.COMPLETED) {
        throw new AppError(status.BAD_REQUEST, "A review can only be given for a completed appointment");
    }

    if (appointmentData.review) {
        throw new AppError(status.CONFLICT, "A review already exists for this appointment");
    }

    return await prisma.$transaction(async (tx) => {
        const newReview = await tx.review.create({
            data: {
                appointmentId: appointmentData.id,
                patientId: patientData.id,
                doctorId: appointmentData.doctorId,
                rating: payload.rating,
                comment: payload.comment,
            },
            include: {
                doctor: { select: { id: true, name: true, designation: true } },
                patient: { select: { id: true, name: true } },
            },
        });

        await refreshDoctorRating(tx, appointmentData.doctorId);

        return newReview;
    });
};

// Patients see reviews they wrote; doctors see reviews they received
const getMyReviews = async (user: IRequestUser) => {
    if (user.role === Role.PATIENT) {
        const patientData = await getPatientOrThrow(user);

        return await prisma.review.findMany({
            where: { patientId: patientData.id },
            include: { doctor: { select: { id: true, name: true, designation: true } } },
            orderBy: { createdAt: "desc" },
        });
    }

    const doctorData = await prisma.doctor.findUnique({ where: { email: user.email } });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
    }

    return await prisma.review.findMany({
        where: { doctorId: doctorData.id },
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
    });
};

// Public: anyone can view the reviews of a doctor
const getDoctorReviews = async (doctorId: string) => {
    const doctorData = await prisma.doctor.findFirst({
        where: { id: doctorId, isDeleted: false },
        select: { id: true, name: true, averageRating: true },
    });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor not found");
    }

    const reviews = await prisma.review.findMany({
        where: { doctorId },
        select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            patient: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return {
        doctor: doctorData,
        reviews,
    };
};

const getAllReviews = async () => {
    return await prisma.review.findMany({
        include: {
            doctor: { select: { id: true, name: true } },
            patient: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
};

// Only the patient who wrote the review can edit it
const updateReview = async (reviewId: string, payload: IUpdateReviewPayload, user: IRequestUser) => {
    const patientData = await getPatientOrThrow(user);

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
        throw new AppError(status.NOT_FOUND, "Review not found");
    }

    if (review.patientId !== patientData.id) {
        throw new AppError(status.FORBIDDEN, "This is not your review");
    }

    return await prisma.$transaction(async (tx) => {
        const updated = await tx.review.update({
            where: { id: reviewId },
            data: {
                rating: payload.rating,
                comment: payload.comment,
            },
        });

        await refreshDoctorRating(tx, review.doctorId);

        return updated;
    });
};

// The patient who wrote it, or an admin / super admin, can delete a review
const deleteReview = async (reviewId: string, user: IRequestUser) => {
    const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: { patient: true },
    });

    if (!review) {
        throw new AppError(status.NOT_FOUND, "Review not found");
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    if (!isAdmin && review.patient.email !== user.email) {
        throw new AppError(status.FORBIDDEN, "You do not have permission to delete this review");
    }

    return await prisma.$transaction(async (tx) => {
        const deleted = await tx.review.delete({
            where: { id: reviewId },
        });

        await refreshDoctorRating(tx, review.doctorId);

        return deleted;
    });
};

export const ReviewService = {
    createReview,
    getMyReviews,
    getDoctorReviews,
    getAllReviews,
    updateReview,
    deleteReview,
};
