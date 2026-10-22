import Stripe from "stripe";
import config from "./index";

export const stripe = new Stripe(config.stripe.secret_key as string, {
    apiVersion: "2025-02-24.acacia" as any,
});
