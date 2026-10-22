import status from "http-status";
import { uuidv7 } from "uuidv7";
import { AppointmentStatus, PaymentStatus, Prisma, Role } from "../../../generated/prisma";
import config from "../../config";
import { stripe } from "../../config/stripe";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { SSLCommerzService } from "../payment/sslcommerz.service";
import { IBookAppointmentPayload } from "./appointment.interface";


// Atomically claims a schedule slot. If another patient already holds it, nothing is updated
// and we reject, which prevents two patients from booking the same slot.
const reserveSlot = async (tx: Prisma.TransactionClient, doctorId: string, scheduleId: string) => {
    const reserved = await tx.doctorSchedules.updateMany({
        where: { doctorId, scheduleId, isBooked: false },
        data: { isBooked: true },
    });

    if (reserved.count === 0) {
        throw new AppError(status.CONFLICT, "This schedule slot is already booked");
    }
};

const doctorTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    [AppointmentStatus.SCHEDULED]: [AppointmentStatus.INPROGRESS, AppointmentStatus.CANCELED],
    [AppointmentStatus.INPROGRESS]: [AppointmentStatus.COMPLETED],
    [AppointmentStatus.COMPLETED]: [],
    [AppointmentStatus.CANCELED]: [],
};

const patientTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CANCELED],
    [AppointmentStatus.INPROGRESS]: [],
    [AppointmentStatus.COMPLETED]: [],
    [AppointmentStatus.CANCELED]: [],
};

// Pay Now Book Appointment
const bookAppointment = async (payload: IBookAppointmentPayload, user: IRequestUser) => {
    const patientData = await prisma.patient.findUniqueOrThrow({
        where: { email: user.email },
    });

    const doctorData = await prisma.doctor.findUniqueOrThrow({
        where: { id: payload.doctorId },
    });

    const doctorSchedule = await prisma.doctorSchedules.findUniqueOrThrow({
        where: {
            doctorId_scheduleId: {
                doctorId: payload.doctorId,
                scheduleId: payload.scheduleId,
            },
        },
    });

    if (doctorSchedule.isBooked) {
        throw new AppError(status.CONFLICT, "This schedule slot is already booked");
    }

    const videoCallingId = String(uuidv7());
    const transactionId = String(uuidv7());

    const result = await prisma.$transaction(async (tx) => {
        await reserveSlot(tx, payload.doctorId, payload.scheduleId);

        const appointmentData = await tx.appointment.create({
            data: {
                doctorId: payload.doctorId,
                patientId: patientData.id,
                scheduleId: payload.scheduleId,
                videoCallingId,
            },
        });

        const paymentData = await tx.payment.create({
            data: {
                appointmentId: appointmentData.id,
                amount: doctorData.apointmentFee,
                transactionId,
            },
        });

        // Link doctor schedule to appointment
        await tx.doctorSchedules.update({
            where: {
                doctorId_scheduleId: {
                    doctorId: payload.doctorId,
                    scheduleId: payload.scheduleId,
                },
            },
            data: {
                appointmentId: appointmentData.id,
            },
        });

        return { appointmentData, paymentData };
    });

    let paymentSessionUrl: string | null = null;

    if (payload.gateway === "SSLCOMMERZ") {
        try {
            const sslResult = await SSLCommerzService.initPayment({
                total_amount: doctorData.apointmentFee,
                tran_id: transactionId,
                appointmentId: result.appointmentData.id,
                cus_name: patientData.name,
                cus_email: patientData.email,
                cus_phone: patientData.contactNumber,
                cus_address: patientData.address || "Dhaka, Bangladesh",
            });
            paymentSessionUrl = sslResult.paymentUrl;
        } catch (sslErr) {

            paymentSessionUrl = `${config.frontend_url}/payment/checkout/${result.paymentData.id}?gateway=sslcommerz`;
        }
    } else {
        // Create Stripe Checkout Session (BDT currency)
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: "bdt",
                            product_data: {
                                name: `Appointment with Dr. ${doctorData.name}`,
                                description: `Consultation fee for appointment`,
                            },
                            unit_amount: Math.round(doctorData.apointmentFee * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: "payment",
                success_url: `${config.frontend_url}/payment/success?appointmentId=${result.appointmentData.id}`,
                cancel_url: `${config.frontend_url}/payment/cancel?appointmentId=${result.appointmentData.id}`,
                metadata: {
                    appointmentId: result.appointmentData.id,
                    transactionId,
                },
            });
            paymentSessionUrl = session.url;
        } catch (stripeErr) {
            // If Stripe fails in dev, provide standard fallback URL
            paymentSessionUrl = `${config.frontend_url}/payment/checkout/${result.paymentData.id}`;
        }
    }

    return {
        ...result,
        paymentUrl: paymentSessionUrl,
    };
};


// Pay Later Book Appointment
const bookAppointmentWithPayLater = async (payload: IBookAppointmentPayload, user: IRequestUser) => {
    const patientData = await prisma.patient.findUniqueOrThrow({
        where: { email: user.email },
    });

    const doctorData = await prisma.doctor.findUniqueOrThrow({
        where: { id: payload.doctorId },
    });

    const doctorSchedule = await prisma.doctorSchedules.findUniqueOrThrow({
        where: {
            doctorId_scheduleId: {
                doctorId: payload.doctorId,
                scheduleId: payload.scheduleId,
            },
        },
    });

    if (doctorSchedule.isBooked) {
        throw new AppError(status.CONFLICT, "This schedule slot is already booked");
    }

    const videoCallingId = String(uuidv7());
    const transactionId = String(uuidv7());

    return await prisma.$transaction(async (tx) => {
        await reserveSlot(tx, payload.doctorId, payload.scheduleId);

        const appointmentData = await tx.appointment.create({
            data: {
                doctorId: payload.doctorId,
                patientId: patientData.id,
                scheduleId: payload.scheduleId,
                videoCallingId,
            },
        });

        const paymentData = await tx.payment.create({
            data: {
                appointmentId: appointmentData.id,
                amount: doctorData.apointmentFee,
                transactionId,
            },
        });

        await tx.doctorSchedules.update({
            where: {
                doctorId_scheduleId: {
                    doctorId: payload.doctorId,
                    scheduleId: payload.scheduleId,
                },
            },
            data: {
                appointmentId: appointmentData.id,
            },
        });

        return { appointmentData, paymentData };
    });
};

const initiatePayment = async (appointmentId: string, user: IRequestUser) => {
    const appointmentData = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: { doctor: true, payment: true, patient: true },
    });

    if (appointmentData.patient.email !== user.email) {
        throw new AppError(status.FORBIDDEN, "This is not your appointment");
    }

    if (appointmentData.paymentStatus === PaymentStatus.PAID) {
        throw new AppError(status.BAD_REQUEST, "Appointment is already paid");
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "bdt",
                    product_data: {
                        name: `Appointment with Dr. ${appointmentData.doctor.name}`,
                    },
                    unit_amount: Math.round(appointmentData.doctor.apointmentFee * 100),
                },
                quantity: 1,
            },
        ],
        mode: "payment",
        success_url: `${config.frontend_url}/payment/success?appointmentId=${appointmentData.id}`,
        cancel_url: `${config.frontend_url}/payment/cancel?appointmentId=${appointmentData.id}`,
        metadata: {
            appointmentId: appointmentData.id,
            transactionId: appointmentData.payment?.transactionId ?? "",
        },
    });

    return { paymentUrl: session.url };
};

const changeAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus, user: IRequestUser) => {
    const appointmentData = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: { doctor: true, patient: true },
    });

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    if (!isAdmin) {
        if (user.role === Role.DOCTOR && appointmentData.doctor.email !== user.email) {
            throw new AppError(status.FORBIDDEN, "This is not your appointment");
        }

        if (user.role === Role.PATIENT && appointmentData.patient.email !== user.email) {
            throw new AppError(status.FORBIDDEN, "This is not your appointment");
        }

        const transitions = user.role === Role.DOCTOR ? doctorTransitions : patientTransitions;

        if (!transitions[appointmentData.status].includes(newStatus)) {
            throw new AppError(
                status.BAD_REQUEST,
                `You cannot change an appointment from ${appointmentData.status} to ${newStatus}`
            );
        }
    }

    return await prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
            where: { id: appointmentId },
            data: { status: newStatus },
        });

        // A canceled appointment gives its slot back
        if (newStatus === AppointmentStatus.CANCELED && appointmentData.status !== AppointmentStatus.CANCELED) {
            await tx.doctorSchedules.updateMany({
                where: {
                    doctorId: appointmentData.doctorId,
                    scheduleId: appointmentData.scheduleId,
                },
                data: {
                    isBooked: false,
                },
            });
        }

        return updated;
    });
};

const getMyAppointments = async (user: IRequestUser) => {
    if (user.role === Role.PATIENT) {
        const patientData = await prisma.patient.findUniqueOrThrow({ where: { email: user.email } });
        return await prisma.appointment.findMany({
            where: { patientId: patientData.id },
            include: { doctor: true, schedule: true, payment: true },
            orderBy: { createdAt: "desc" },
        });
    }

    const doctorData = await prisma.doctor.findUniqueOrThrow({ where: { email: user.email } });
    return await prisma.appointment.findMany({
        where: { doctorId: doctorData.id },
        include: { patient: true, schedule: true, payment: true },
        orderBy: { createdAt: "desc" },
    });
};

const getMySingleAppointment = async (id: string, user: IRequestUser) => {
    const appointment = await prisma.appointment.findUniqueOrThrow({
        where: { id },
        include: { doctor: true, patient: true, schedule: true, payment: true, prescription: true, review: true },
    });

    const isOwner =
        (user.role === Role.PATIENT && appointment.patient.email === user.email) ||
        (user.role === Role.DOCTOR && appointment.doctor.email === user.email) ||
        user.role === Role.ADMIN ||
        user.role === Role.SUPER_ADMIN;

    if (!isOwner) {
        throw new AppError(status.FORBIDDEN, "You do not have access to this appointment");
    }

    return appointment;
};

const getAllAppointments = async () => {
    return await prisma.appointment.findMany({
        include: { doctor: true, patient: true, schedule: true, payment: true },
        orderBy: { createdAt: "desc" },
    });
};

// Cron: cancel unpaid appointments older than 30 minutes
const cancelUnpaidAppointments = async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const unpaidAppointments = await prisma.appointment.findMany({
        where: {
            status: AppointmentStatus.SCHEDULED,
            paymentStatus: PaymentStatus.UNPAID,
            createdAt: { lte: thirtyMinutesAgo },
        },
    });

    if (unpaidAppointments.length === 0) {
        return;
    }

    const appointmentToCancel = unpaidAppointments.map((a) => a.id);

    await prisma.$transaction(async (tx) => {
        await tx.appointment.updateMany({
            where: { id: { in: appointmentToCancel } },
            data: { status: AppointmentStatus.CANCELED },
        });

        await tx.payment.deleteMany({
            where: { appointmentId: { in: appointmentToCancel } },
        });

        for (const unpaid of unpaidAppointments) {
            await tx.doctorSchedules.updateMany({
                where: {
                    doctorId: unpaid.doctorId,
                    scheduleId: unpaid.scheduleId,
                },
                data: { isBooked: false },
            });
        }
    });

    console.log(`Auto-canceled ${unpaidAppointments.length} unpaid appointments and freed their slots.`);
};

export const AppointmentService = {
    bookAppointment,
    bookAppointmentWithPayLater,
    initiatePayment,
    changeAppointmentStatus,
    getMyAppointments,
    getMySingleAppointment,
    getAllAppointments,
    cancelUnpaidAppointments,
};
