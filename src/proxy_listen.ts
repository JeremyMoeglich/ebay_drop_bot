import { error } from "functional-utilities";
import WebSocket from "ws";

interface RequestData {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    headers: Record<string, string>;
    body: string;
    query: Record<string, string>;
}

export async function proxy_listen(path: string): Promise<RequestData> {
    return new Promise((resolve, reject) => {
        const url = process.env.PROXY_URL ?? error("No proxy url found");
        const secret =
            process.env.PROXY_SECRET ?? error("No proxy secret found");
        const websocket = new WebSocket(`${url}?secret=${secret}`);
        websocket.on("message", (data) => {
            const obj: RequestData = JSON.parse(data.toString());
            if (obj.path === path) {
                websocket.close();
                resolve(obj);
            }
        });
        websocket.on("error", (err) => {
            reject(err);
        });
        websocket.on("close", () => {
            reject(new Error("Connection closed"));
        });
    });
}
