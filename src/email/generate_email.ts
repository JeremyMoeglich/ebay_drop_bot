import eBayApi from "ebay-api/lib";
import { error, pipe } from "functional-utilities";
import { get_item } from "../api";
import { Order } from "../schemas";
import { Email } from "./send_email";

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
                <ul style="list-style-type: none; padding-left: 10px">
                    <li>${article.id}</li>
                    ${
                        article.amount > 1
                            ? /*html*/ `<li style="color: red; font-weight: bold;">${article.amount} Stück bestellt!</li><li>${article.name}</li>`
                            : /*html*/ `<li>${article.amount}x ${article.name}</li>`
                    }
                    
                </ul>
            </div>
            <div>
                <h2>Anschrift</h2>
                <ul style="list-style-type: none; padding-left: 10px">
                    <li>${anschrift.name}</li>
                    ${anschrift.street}
                    <li>${anschrift.city}</li>
                    <li>${anschrift.country}</li>
                    <li>${anschrift.phone}</li>
                </ul>
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
                Dies ist eine automatische Bestell-Email. Bei Notwendigkeit bitte über
                Skype melden.
            </p>
            <p style="color: rgb(52, 79, 226); font-weight: bold;">Viele Grüße Jeremy</p>
            <p>
                TAGARO Medienshop - Möglich & Möglich GbR / Großer Sandweg 32 / 59065
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
        body: html,
        source: `Ebay Bestellung ${anschrift.name} - ${order.orderId}`,
    };
}
