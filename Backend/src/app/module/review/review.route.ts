import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.PATIENT),
    validateRequest(ReviewValidation.createReviewZodSchema),
    ReviewController.createReview
);

router.get("/my-reviews", checkAuth(Role.PATIENT, Role.DOCTOR), ReviewController.getMyReviews);

// Public: anyone can read the reviews of a doctor
router.get("/doctor/:doctorId", ReviewController.getDoctorReviews);

router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), ReviewController.getAllReviews);

router.patch(
    "/:id",
    checkAuth(Role.PATIENT),
    validateRequest(ReviewValidation.updateReviewZodSchema),
    ReviewController.updateReview
);

router.delete("/:id", checkAuth(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN), ReviewController.deleteReview);

export const ReviewRoutes = router;
