import eBayApi from "ebay-api";
import open from "open";

async function input(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        stdin.resume();
        stdout.write(prompt);
        stdin.once("data", (data) => {
            resolve(data.toString().trim());
        });
    });
}

export async function authenticate_authnauth(client: eBayApi): Promise<void> {
    const { url, sessionId } = await client.authNAuth.getSessionIdAndAuthUrl("http://localhost:3000");
    console.log(`Open this url (if not opened automatically): ${url}`);
    await open(url);
    await input("Press enter when you have authenticated");
    await client.authNAuth.obtainToken(sessionId);
}
