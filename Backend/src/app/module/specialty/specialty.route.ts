import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { multerUpload } from "../../config/multer";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SpecialtyController } from "./specialty.controller";
import { SpecialtyValidation } from "./specialty.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    multerUpload.single("file"),
    (req, res, next) => {
        if (req.body.data) {
            try {
                req.body = JSON.parse(req.body.data);
            } catch (e) {
                // Keep req.body as is
            }
        }
        next();
    },
    validateRequest(SpecialtyValidation.createSpecialtyZodSchema),
    SpecialtyController.createSpecialty
);

router.get("/", SpecialtyController.getAllSpecialties);

router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), SpecialtyController.deleteSpecialty);

export const SpecialtyRoutes = router;
