import { error } from "functional-utilities";
import nodemailer from "nodemailer";
import { z } from "zod";
import hash from "object-hash";
import { read_or_undefined } from "../utils";
import { htmlToText } from "html-to-text";
import { w3cHtmlValidator } from "w3c-html-validator";
import { promises as fs } from "fs";
import { addDoc, collection } from "firebase/firestore";
import { firestore } from "../firestore_vars";

const email_schema = z
    .object({
        to: z.union([z.string().email(), z.array(z.string().email())]),
        subject: z.string(),
        body: z.string(),
        source: z.string(),
    })
    .strict();

export type Email = z.infer<typeof email_schema>;

export async function send_emails(emails: Email[]) {
    const previous_emails = z
        .array(email_schema)
        .parse(
            JSON.parse(
                (await read_or_undefined("previous_emails.json")) ?? "[]"
            )
        );
    {
        // validation
        if (emails.length === 0) {
            return;
        }

        for (const email of emails) {
            if (email.to === "") {
                throw new Error("Email to is empty");
            }
            if (email.subject === "") {
                throw new Error("Email subject is empty");
            }
            if (email.body === "") {
                throw new Error("Email body is empty");
            }
            if (email.source === "") {
                throw new Error("Email source is empty");
            }
            z.string().email().parse(email.to);
            {
                // html validation
                const result = await w3cHtmlValidator.validate({
                    html: email.body,
                });
                if (result.status !== 200) {
                    throw new Error(result.messages.join("\n"));
                }
            }
        }

        const email_hashes = new Set(
            previous_emails.map((email) => hash(email))
        );
        for (const email of emails) {
            if (email_hashes.has(hash(email))) {
                throw new Error("Email already sent");
            }
        }
    }

    const sender_email = process.env.EMAIL ?? error("No Email found in env");
    const email_log = collection(firestore, "email_log");
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? error("No email host found"),
        port: 465,
        secure: true,
        auth: {
            user: sender_email,
            pass: process.env.SMTP_PASSWORD ?? error("No email password found"),
        },
    });

    let sent_emails: Email[] = [];

    try {
        for (const email of emails) {
            for (const receiver in email.to instanceof Array
                ? email.to
                : [email.to]) {
                await transporter.sendMail({
                    from: sender_email,
                    to: receiver,
                    subject: email.subject,
                    html: email.body,
                    text: htmlToText(email.body),
                });
            }
            await addDoc(email_log, {
                email:
                    email.to instanceof Array ? email.to.join(", ") : email.to,
                source: email.source,
                title: email.subject,
                timestamp: new Date(),
            });
            console.log(
                "Sent email to",
                JSON.stringify(email.to),
                email.subject
            );
            sent_emails.push(email);
        }
    } finally {
        await transporter.close();
        await fs.writeFile(
            "previous_emails.json",
            JSON.stringify([...previous_emails, ...sent_emails])
        );
    }
}
