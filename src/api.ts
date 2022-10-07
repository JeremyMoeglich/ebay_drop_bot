import eBayApi from "ebay-api/lib";
import { pipe } from "functional-utilities";
import { z } from "zod";
import { item_schema, order_schema } from "./schemas";
import { promises as fs } from "fs";

export async function get_recent_orders(ebay: eBayApi, day_offset: number) {
    const time_offset = day_offset * 24 * 60 * 60 * 1000;
    const start_time = new Date(Date.now() - time_offset);
    const data = await ebay.sell.fulfillment.getOrders({
        filter: [`lastmodifieddate:[${start_time.toISOString()}..]`].join(","),
    });
    return z.array(order_schema).parse(data.orders);
}

export async function get_valid_orders(ebay: eBayApi, day_offset: number) {
    return (await get_recent_orders(ebay, day_offset)).filter(
        (order) =>
            order.orderPaymentStatus === "PAID" &&
            pipe(
                order.lineItems[0]?.title?.toLowerCase()?.includes("sky"),
                (v) => {
                    if (v === undefined) {
                        return false;
                    }
                    return !v;
                }
            ) &&
            !!order.lineItems[0]?.sku
    );
}

export async function get_item(ebay: eBayApi, sku: string) {
    return item_schema.parse(await ebay.sell.inventory.getInventoryItem(sku));
}
