import eBayApi from "ebay-api/lib";
import { authenticate_oauth } from "./oauth";
import { ContentLanguage } from "ebay-api/lib/enums";
import { chunk } from "lodash-es";
import { promises as fs } from "fs";
import { read_or_undefined } from "../utils";

export async function get_client() {
    const ebay = eBayApi.fromEnv();
    const language = "de-DE";
    ebay.config.acceptLanguage = language;
    ebay.config.contentLanguage = ContentLanguage[language.replace("-", "_")];
    await authenticate_oauth(ebay);
    {
        const already_migrated = (
            (await read_or_undefined("migrated_products.txt")) ?? ""
        )
            .split("\n")
            .map((x) => x.trim());
        const listings = (await fs.readFile("watched_products.txt", "utf-8"))
            .split("\n")
            .map((line) => line.trim())
            .filter(
                (line) => line.length > 0 && !already_migrated.includes(line)
            );
        const chunks = chunk(
            listings.map((id) => ({
                listingId: id,
            })),
            5
        );
        for (const chunk of chunks) {
            await ebay.sell.inventory.bulkMigrateListing({
                requests: chunk,
            });
        }
        await fs.writeFile(
            "migrated_products.txt",
            [...new Set([...already_migrated, ...listings])].join("\n")
        );
    }
    return ebay;
}
