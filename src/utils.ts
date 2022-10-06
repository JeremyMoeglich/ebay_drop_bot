import { promises as fs } from "fs";


export async function file_exists(path: string) {
    try {
        await fs.access(path);
        return true;
    } catch (e) {
        return false;
    }
}

export async function read_or_undefined(path: string) {
    if (await file_exists(path)) {
        return fs.readFile(path, "utf8");
    } else {
        return undefined;
    }
}

export function unordered_equal<T>(a: T[], b: T[]) {
    const set = new Set(a);
    for (const item of b) {
        if (!set.has(item)) {
            return false;
        }
    }
    const set2 = new Set(b);
    for (const item of a) {
        if (!set2.has(item)) {
            return false;
        }
    }
    return true;
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}