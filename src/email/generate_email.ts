import eBayApi from "ebay-api/lib";
import { error, pipe } from "functional-utilities";
import { get_item } from "../api";
import { Order } from "../schemas";
import { Email } from "./send_email";
import { minify } from "html-minifier";

export async function generate_email(
    ebay: eBayApi,
    order: Order
): Promise<Email> {
    if (order.lineItems.length !== 1) {
        throw new Error("Order must have exactly one line item");
    }
    const item = order.lineItems[0];
    const ebay_item = await get_item(
        ebay,
        item.sku ?? error(`Item ${item.title} has no SKU`)
    );
    const erp = pipe(ebay_item.product.aspects.ERP, (erps) => {
        if (erps.length !== 1) {
            throw new Error("Item must have exactly one ERP");
        }
        return erps[0];
    });
    const instructions = pipe(
        order.fulfillmentStartInstructions,
        (instructions) => {
            if (instructions.length !== 1) {
                throw new Error(
                    "Order must have exactly one fulfillment start instruction"
                );
            }
            return instructions[0];
        }
    );
    const shipTo = instructions.shippingStep.shipTo;
    const article = {
        id: erp,
        name: item.title,
        amount: item.quantity,
    };
    const anschrift = {
        name: shipTo.fullName,
        street: shipTo.contactAddress.addressLine2
            ? /*html*/ `
                <li>${shipTo.contactAddress.addressLine1}</li>
                <li>${shipTo.contactAddress.addressLine2}</li>
            `
            : /*html*/ `
                <li>${shipTo.contactAddress.addressLine1}</li>
            `,
        city: `${shipTo.contactAddress.postalCode} ${shipTo.contactAddress.city}`,
        country:
            shipTo.contactAddress.countryCode === "DE"
                ? "Deutschland"
                : shipTo.contactAddress.countryCode,
        phone: shipTo.primaryPhone.phoneNumber,
    };
    const html = /*html*/ `
        <body style="font-family: Arial, Helvetica, sans-serif; font-size: 15px">
            <p>Hallo,</p>
            <p>bitte den folgenden Artikel an den Kunden rausschicken.</p>
            <h1>Bestellung von ${anschrift.name}</h1>
            <div>
                <h2>Artikel</h2>
                <div style="padding-left: 10px">
                    <p style="margin: 0;">${article.id}</p>
                    ${
                        article.amount > 1
                            ? /*html*/ `<p style="color: red; font-weight: bold; margin: 0;">${article.amount} St??ck bestellt!</p><p>${article.name}</p>`
                            : /*html*/ `<p style="margin: 0;">${article.amount}x ${article.name}</p>`
                    }
                </div>
            </div>
            <div>
                <h2>Anschrift</h2>
                <div style="padding-left: 10px">
                    <p style="margin: 0;">${anschrift.name}</p>
                    ${anschrift.street}
                    <p style="margin: 0;">${anschrift.city}</p>
                    <p style="margin: 0;">${anschrift.country}</p>
                    <p style="margin: 0;">${anschrift.phone}</p>
                </div>
            </div>
            ${
                order.buyerCheckoutNotes
                    ? /*html*/ `
                        <div>
                            <h2>Kundenanmerkungen</h2>
                            <p>${order.buyerCheckoutNotes}</p>
                        </div>
                    `
                    : ""
            }
            <p>
                Dies ist eine automatische Bestell-Email. Bei Notwendigkeit bitte ??ber
                Skype melden.
            </p>
            <p style="color: rgb(52, 79, 226); font-weight: bold;">Viele Gr????e Jeremy</p>
            <p>
                TAGARO Medienshop - M??glich & M??glich GbR / Gro??er Sandweg 32 / 59065
                Hamm<br />
                Telefon 02381 987 46 99 / Fax 0321 21 11 65 58
            </p>
        </body>
    `;
    const subject = `Neue TAGARO eBay Bestellung - ${anschrift.name} - Artikelnr. ${article.id}`;
    return {
        to: ["tagaro.medien@web.de", "tarnold@atelmo.com"],
        //to: "jeremy@moeglich.dev",
        subject,
        body: minify(html, {
            collapseWhitespace: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeEmptyElements: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
        }),
        source: `Ebay Bestellung ${anschrift.name} - ${order.orderId}`,
    };
}
