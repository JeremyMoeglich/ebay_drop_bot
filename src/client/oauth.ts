import open from "open";
import { error } from "functional-utilities";
import eBayApi from "ebay-api";
import { promises as fs } from "fs";
import { proxy_listen } from "../proxy_listen";
import { AuthToken } from "ebay-api/lib/auth/oAuth2";
import { file_exists, read_or_undefined, unordered_equal } from "../utils";



export async function authenticate_oauth(ebay: eBayApi): Promise<void> {
    const env_type =
        (process.env.EBAY_SANDBOX ??
            error("Environment variable EBAY_SANDBOX not set")) === "true"
            ? "sandbox"
            : "production";
    const scopes = [
        "https://api.ebay.com/oauth/api_scope",
        "https://api.ebay.com/oauth/api_scope/sell.inventory",
        "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
        "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
        "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
        "https://api.ebay.com/oauth/api_scope/sell.marketing.readonly",
        "https://api.ebay.com/oauth/api_scope/sell.analytics.readonly",
        "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
    ];
    ebay.oAuth2.setScope(scopes);
    const token_file = `${env_type}_token.json`;
    const scopes_file = `${env_type}_scopes.json`;
    if (
        unordered_equal(
            JSON.parse((await read_or_undefined(scopes_file)) ?? "[]"),
            scopes
        ) &&
        (await file_exists(token_file))
    ) {
        console.log("Using existing token");
        const token: AuthToken = JSON.parse(
            await fs.readFile(token_file, "utf8")
        );
        ebay.oAuth2.setCredentials(token);
    } else {
        console.log("Requesting new token");
        const endroute = "/ebayoauth/success";
        const proxy_listen_promise = proxy_listen(endroute);
        const url = ebay.oAuth2.generateAuthUrl();
        console.log(`Open this url (if not opened automatically): ${url}`);
        await open(url);
        const req = await proxy_listen_promise;
        const code = req.query.code ?? error("No code found");
        const token: AuthToken = await ebay.oAuth2.getToken(code);
        ebay.oAuth2.setCredentials(token);
        await fs.writeFile(token_file, JSON.stringify(token));
        await fs.writeFile(scopes_file, JSON.stringify(scopes));
    }
    ebay.on("refreshAuthToken", async (token) => {
        console.log("refreshing token");
        await fs.writeFile(token_file, JSON.stringify(token));
    });
}
