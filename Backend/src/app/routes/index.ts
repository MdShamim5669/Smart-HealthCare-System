import { Router } from "express";
import { AdminRoutes } from "../module/admin/admin.route";
import { AppointmentRoutes } from "../module/appointment/appointment.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { DoctorRoutes } from "../module/doctor/doctor.route";
import { DoctorScheduleRoutes } from "../module/doctorSchedule/doctorSchedule.route";
import { PrescriptionRoutes } from "../module/prescription/prescription.route";
import { ReviewRoutes } from "../module/review/review.route";
import { ScheduleRoutes } from "../module/schedule/schedule.route";
import { SpecialtyRoutes } from "../module/specialty/specialty.route";
import { UserRoutes } from "../module/user/user.route";

const router = Router();

router.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "PH Healthcare API is active and healthy!",
        timestamp: new Date().toISOString(),
    });
});

const moduleRoutes = [
    { path: "/auth", route: AuthRoutes },
    { path: "/users", route: UserRoutes },
    { path: "/admins", route: AdminRoutes },
    { path: "/doctors", route: DoctorRoutes },
    { path: "/specialties", route: SpecialtyRoutes },
    { path: "/schedules", route: ScheduleRoutes },
    { path: "/doctor-schedules", route: DoctorScheduleRoutes },
    { path: "/appointments", route: AppointmentRoutes },
    { path: "/prescriptions", route: PrescriptionRoutes },
    { path: "/reviews", route: ReviewRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export const IndexRoutes = router;
export default IndexRoutes;
