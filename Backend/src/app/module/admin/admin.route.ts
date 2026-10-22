import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AdminController.getAllAdmins);

router.get("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AdminController.getAdminById);

router.patch(
    "/:id",
    checkAuth(Role.SUPER_ADMIN),
    validateRequest(AdminValidation.updateAdminZodSchema),
    AdminController.updateAdmin
);

router.delete("/:id", checkAuth(Role.SUPER_ADMIN), AdminController.deleteAdmin);

export const AdminRoutes = router;
