import { z } from "zod";

const cost_schema = z
    .object({
        value: z.string(),
        currency: z.string(),
    })
    .strict();

const language_schema = z.string().length(2);
const payment_status_schema = z.union([
    z.literal("PAID"),
    z.literal("FAILED"),
    z.literal("PENDING"),
]);
const order_payment_status_schema = z.union([
    payment_status_schema,
    z.literal("FULLY_REFUNDED"),
    z.literal("PARTIALLY_REFUNDED"),
]);
const fulfillment_status_schema = z.union([
    z.literal("FULFILLED"),
    z.literal("IN_PROGRESS"),
    z.literal("NOT_STARTED"),
]);

export const order_schema = z
    .object({
        orderId: z.string(),
        legacyOrderId: z.string(),
        creationDate: z.string(),
        lastModifiedDate: z.string(),
        orderFulfillmentStatus: fulfillment_status_schema,
        orderPaymentStatus: order_payment_status_schema,
        sellerId: z.string(),
        buyer: z
            .object({
                username: z.string(),
                taxAddress: z
                    .object({
                        postalCode: z.string(),
                        countryCode: language_schema,
                        stateOrProvince: z.string().optional(),
                    })
                    .strict(),
            })
            .strict(),
        pricingSummary: z
            .object({
                priceSubtotal: cost_schema,
                deliveryCost: cost_schema,
                total: cost_schema,
            })
            .strict(),
        cancelStatus: z
            .object({
                cancelState: z.string(),
                cancelRequests: z.array(z.unknown()),
                cancelledDate: z.string().optional(),
            })
            .strict(),
        paymentSummary: z
            .object({
                totalDueSeller: cost_schema,
                refunds: z.array(z.unknown()),
                payments: z.array(
                    z
                        .object({
                            paymentMethod: z.string(),
                            paymentReferenceId: z.string(),
                            paymentDate: z.string(),
                            amount: cost_schema,
                            paymentStatus: z.string(),
                            paymentHolds: z
                                .array(
                                    z
                                        .object({
                                            holdReason: z.string(),
                                            holdAmount: cost_schema,
                                            holdState: z.string(),
                                            expectedReleaseDate: z
                                                .string()
                                                .optional(),
                                        })
                                        .strict()
                                )
                                .optional(),
                        })
                        .strict()
                ),
            })
            .strict(),
        fulfillmentStartInstructions: z.array(
            z
                .object({
                    fulfillmentInstructionsType: z.string(),
                    minEstimatedDeliveryDate: z.string(),
                    maxEstimatedDeliveryDate: z.string(),
                    ebaySupportedFulfillment: z.boolean(),
                    shippingStep: z
                        .object({
                            shipTo: z
                                .object({
                                    fullName: z.string(),
                                    contactAddress: z
                                        .object({
                                            addressLine1: z.string(),
                                            addressLine2: z.string().optional(),
                                            city: z.string(),
                                            postalCode: z.string(),
                                            countryCode: language_schema,
                                            stateOrProvince: z
                                                .string()
                                                .optional(),
                                        })
                                        .strict(),
                                    primaryPhone: z
                                        .object({
                                            phoneNumber: z.string(),
                                        })
                                        .strict(),
                                    email: z.string().email().optional(),
                                })
                                .strict(),
                            shippingCarrierCode: z.string().optional(),
                            shippingServiceCode: z.string(),
                        })
                        .strict(),
                })
                .strict()
        ),
        fulfillmentHrefs: z.array(z.string()),
        lineItems: z.array(
            z
                .object({
                    sku: z.string().optional(),
                    lineItemId: z.string(),
                    legacyItemId: z.string(),
                    title: z.string(),
                    lineItemCost: cost_schema,
                    quantity: z.number().int(),
                    soldFormat: z.string(),
                    listingMarketplaceId: z.string(),
                    purchaseMarketplaceId: z.string(),
                    lineItemFulfillmentStatus: fulfillment_status_schema,
                    total: cost_schema,
                    deliveryCost: z
                        .object({
                            shippingCost: cost_schema,
                        })
                        .strict(),
                    appliedPromotions: z.array(z.unknown()),
                    taxes: z.array(z.unknown()),
                    properties: z
                        .object({
                            buyerProtection: z.boolean(),
                            soldViaAdCampaign: z.boolean().optional(),
                            fromBestOffer: z.boolean().optional(),
                        })
                        .strict(),
                    lineItemFulfillmentInstructions: z
                        .object({
                            minEstimatedDeliveryDate: z.string(),
                            maxEstimatedDeliveryDate: z.string(),
                            shipByDate: z.string(),
                            guaranteedDelivery: z.boolean(),
                        })
                        .strict(),
                    itemLocation: z
                        .object({
                            location: z.string(),
                            countryCode: language_schema,
                            postalCode: z.string(),
                        })
                        .strict(),
                    refunds: z.unknown(),
                })
                .strict()
        ),
        salesRecordReference: z.string(),
        totalFeeBasisAmount: cost_schema,
        totalMarketplaceFee: cost_schema,
        buyerCheckoutNotes: z.string().optional(),
    })
    .strict();

export type Order = z.infer<typeof order_schema>;

export const item_schema = z
    .object({
        sku: z.string(),
        locale: z.string(),
        product: z
            .object({
                title: z.string(),
                aspects: z.record(z.string(), z.array(z.string())),
                ean: z.array(z.string()),
                imageUrls: z.array(z.string()),
            })
            .strict(),
        condition: z.string(),
        packageWeightAndSize: z
            .object({
                weight: z
                    .object({
                        value: z.number(),
                        unit: z.string(),
                    })
                    .strict()
                    .optional(),
                packageType: z.string().optional(),
            })
            .strict(),
        availability: z
            .object({
                shipToLocationAvailability: z
                    .object({
                        allocationByFormat: z.unknown().optional(),
                        quantity: z.number().int(),
                    })
                    .strict(),
            })
            .strict(),
    })
    .strict();

export type Item = z.infer<typeof item_schema>;
