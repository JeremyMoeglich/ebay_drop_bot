import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { promises as fs } from "fs";
import { get_valid_orders } from "./api";
import { get_client } from "./client/client";
import { generate_email } from "./email/generate_email";
import { send_emails } from "./email/send_email";
import { firestore, init_firebase } from "./firestore_vars";
import { file_exists, sleep } from "./utils";

//import { SellInventoryItem } from "ebay-api/lib/types";

// async function update_product(
//     ebay: eBayApi,
//     sku: string,
//     data: Partial<SellInventoryItem>
// ) {
//     const item: {
//         sku: string;
//         locale: string;
//     } & SellInventoryItem = await ebay.sell.inventory.getInventoryItem(sku);
//     const new_data = { ...item, ...data };
//     await ebay.sell.inventory.createOrReplaceInventoryItem(sku, new_data);
// }

const previous_orders_path = "previous_orders.txt";
let previous_orders: string[] = [];

const activity = collection(firestore, "activity");
const activity_document = doc(activity, "ebay_dropship");
const minute_delay = 5;
const day_lookback = 1;

(async () => {
    await init_firebase();
    try {
        previous_orders = file_exists(previous_orders_path)
            ? (await fs.readFile(previous_orders_path, "utf8"))
                  .split("\n")
                  .map((x) => x.trim())
                  .filter((x) => x.length > 0)
            : [];
        const ebay = await get_client();

        previous_orders = previous_orders.concat(
            (await get_valid_orders(ebay, day_lookback)).map((x) => x.orderId)
        );
        console.log("Started");
        while (true) {
            const new_orders = (
                await get_valid_orders(ebay, day_lookback)
            ).filter((x) => !previous_orders.includes(x.orderId));
            await setDoc(activity_document, {
                last: new Date(),
                delay: minute_delay,
                active: true,
            });
            if (new_orders.length !== 0) {
                console.log(`Got ${new_orders.length} new orders`);
                const new_order_ids = new_orders.map((x) => x.orderId);
                previous_orders = previous_orders.concat(new_order_ids);
                await fs.writeFile(
                    previous_orders_path,
                    [...new Set(previous_orders)].join("\n")
                );
                const generated_emails = await Promise.all(
                    new_orders.map(async (order) => generate_email(ebay, order))
                );
                await send_emails(generated_emails);
            }
            await sleep(minute_delay * 60 * 1000);
        }
    } finally {
        await setDoc(activity_document, {
            last: new Date(),
            delay: minute_delay,
            active: false,
        });
    }
})();
