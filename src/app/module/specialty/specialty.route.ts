import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { multerUpload } from "../../config/multer";
import { checkAuth, parseBodyData, validateRequest } from "../../middleware";
import { SpecialtyController } from "./specialty.controller";
import { SpecialtyValidation } from "./specialty.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    multerUpload.single("file"),
    parseBodyData,
    validateRequest(SpecialtyValidation.createSpecialtyZodSchema),
    SpecialtyController.createSpecialty
);


router.get("/", SpecialtyController.getAllSpecialties);

router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), SpecialtyController.deleteSpecialty);

export const SpecialtyRoutes = router;
