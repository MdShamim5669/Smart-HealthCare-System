import status from "http-status";
import Stripe from "stripe";
import { AppointmentStatus, PaymentStatus, Role } from "../../../generated/prisma";
import config from "../../config";
import { stripe } from "../../config/stripe";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { EmailUtils } from "../../utils/email";
import { QueryBuilder } from "../../utils/QueryBuilder";

const paymentInclude = {
    appointment: {
        include: {
            doctor: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    contactNumber: true,
                    apointmentFee: true,
                },
            },
            patient: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    contactNumber: true,
                },
            },
            schedule: true,
        },
    },
};

/**
 * Handle Stripe Webhook Events
 */
const handleStripeWebhook = async (payload: Buffer, signature: string) => {
    let event: Stripe.Event;

    const webhookSecret = config.stripe.webhook_secret;
    if (!webhookSecret) {
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Stripe webhook secret is not configured");
    }

    try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
        throw new AppError(status.BAD_REQUEST, `Webhook Signature Verification Failed: ${err.message}`);
    }


    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const appointmentId = session.metadata?.appointmentId;
        const transactionId = session.metadata?.transactionId;

        if (!appointmentId) {
            return { received: true, note: "No appointmentId in metadata" };
        }

        // Idempotency Check: check if already marked PAID
        const existingAppointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { payment: true, patient: true, doctor: true, schedule: true },
        });

        if (!existingAppointment) {
            return { received: true, note: "Appointment not found" };
        }

        if (existingAppointment.paymentStatus === PaymentStatus.PAID) {
            return { received: true, note: "Appointment is already marked PAID" };
        }

        // Atomically update Payment and Appointment
        await prisma.$transaction(async (tx) => {
            await tx.payment.updateMany({
                where: { appointmentId },
                data: {
                    status: PaymentStatus.PAID,
                    paymentGatewayData: session as any,
                },
            });

            await tx.appointment.update({
                where: { id: appointmentId },
                data: {
                    paymentStatus: PaymentStatus.PAID,
                },
            });
        });

        // Trigger confirmation email asynchronously
        try {
            await EmailUtils.sendAppointmentConfirmationEmail(existingAppointment.patient.email, {
                patientName: existingAppointment.patient.name,
                doctorName: existingAppointment.doctor.name,
                appointmentDate: new Date(existingAppointment.schedule.startDate).toLocaleDateString(),
                startTime: new Date(existingAppointment.schedule.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                endTime: new Date(existingAppointment.schedule.endDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                paymentStatus: PaymentStatus.PAID,
                videoCallingId: existingAppointment.videoCallingId,
            });
        } catch (emailErr) {
            console.warn("Failed to send appointment confirmation email after payment:", emailErr);
        }
    }

    return { received: true };
};

/**
 * Initiate Stripe Checkout session for an unpaid appointment
 */
const initiatePayment = async (appointmentId: string, user: IRequestUser) => {
    const appointmentData = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: { doctor: true, payment: true, patient: true },
    });

    if (user.role === Role.PATIENT && appointmentData.patient.email !== user.email) {
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
                        description: `Medical consultation with Dr. ${appointmentData.doctor.name}`,
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

    return {
        paymentUrl: session.url,
    };
};

/**
 * Get single payment by ID with ownership verification
 */
const getPaymentById = async (id: string, user: IRequestUser) => {
    const payment = await prisma.payment.findUnique({
        where: { id },
        include: paymentInclude,
    });

    if (!payment) {
        throw new AppError(status.NOT_FOUND, "Payment record not found");
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    if (!isAdmin) {
        const isPatientOwner = payment.appointment.patient.email === user.email;
        const isDoctorOwner = payment.appointment.doctor.email === user.email;
        if (!isPatientOwner && !isDoctorOwner) {
            throw new AppError(status.FORBIDDEN, "You do not have permission to view this payment");
        }
    }

    return payment;
};

/**
 * Get payments of the authenticated user
 */
const getMyPayments = async (user: IRequestUser, query: Record<string, any> = {}) => {
    const whereCondition: any = {};

    if (user.role === Role.PATIENT) {
        const patient = await prisma.patient.findUniqueOrThrow({
            where: { email: user.email },
        });
        whereCondition.appointment = { patientId: patient.id };
    } else if (user.role === Role.DOCTOR) {
        const doctor = await prisma.doctor.findUniqueOrThrow({
            where: { email: user.email },
        });
        whereCondition.appointment = { doctorId: doctor.id };
    }

    const queryBuilder = new QueryBuilder(prisma.payment, query)
        .where(whereCondition)
        .search(["transactionId"])
        .sort("createdAt", "desc")
        .paginate()
        .include(paymentInclude);

    return await queryBuilder.execute();
};

/**
 * Get all payments (Admin / Super Admin)
 */
const getAllPayments = async (query: Record<string, any> = {}) => {
    const queryBuilder = new QueryBuilder(prisma.payment, query)
        .search(["transactionId"])
        .sort("createdAt", "desc")
        .paginate()
        .include(paymentInclude);

    return await queryBuilder.execute();
};

/**
 * Auto-cancel unpaid appointments older than 30 minutes
 */
const autoCancelUnpaidAppointments = async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const unpaidAppointments = await prisma.appointment.findMany({
        where: {
            status: AppointmentStatus.SCHEDULED,
            paymentStatus: PaymentStatus.UNPAID,
            createdAt: { lte: thirtyMinutesAgo },
        },
        include: {
            patient: true,
            doctor: true,
            schedule: true,
        },
    });

    if (unpaidAppointments.length === 0) {
        return { canceledCount: 0 };
    }

    const appointmentIds = unpaidAppointments.map((app) => app.id);

    await prisma.$transaction(async (tx) => {
        // 1. Mark appointments as CANCELED
        await tx.appointment.updateMany({
            where: { id: { in: appointmentIds } },
            data: { status: AppointmentStatus.CANCELED },
        });

        // 2. Remove unpaid payment records
        await tx.payment.deleteMany({
            where: { appointmentId: { in: appointmentIds } },
        });

        // 3. Free up doctor schedule slots
        for (const unpaid of unpaidAppointments) {
            await tx.doctorSchedules.updateMany({
                where: {
                    doctorId: unpaid.doctorId,
                    scheduleId: unpaid.scheduleId,
                },
                data: {
                    isBooked: false,
                    appointmentId: null,
                },
            });
        }
    });

    // Notify patients asynchronously
    for (const unpaid of unpaidAppointments) {
        try {
            await EmailUtils.sendAppointmentCancellationEmail(unpaid.patient.email, {
                patientName: unpaid.patient.name,
                doctorName: unpaid.doctor.name,
                appointmentDate: new Date(unpaid.schedule.startDate).toLocaleDateString(),
                reason: "Appointment auto-canceled due to payment expiration (unpaid for over 30 minutes).",
            });
        } catch (err) {
            console.warn(`Failed to send cancellation email for appointment ${unpaid.id}:`, err);
        }
    }

    return { canceledCount: unpaidAppointments.length };
};

export const PaymentService = {
    handleStripeWebhook,
    initiatePayment,
    getPaymentById,
    getMyPayments,
    getAllPayments,
    autoCancelUnpaidAppointments,
};
