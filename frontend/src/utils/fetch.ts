import {User} from "firebase/auth";

export async function fetchWithJWT(url: string, user: User | null, options?: RequestInit) {
    const token = await user?.getIdToken();
    if (!token) {
        throw new Error('Could not get token');
    }
    return fetch(url, {
        ...options,
        headers: {
            ...options?.headers,
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function fetchWithJWTParsed<T>(url: string, user: User | null, options?: RequestInit): Promise<T> {
    const response = await fetchWithJWT(url, user, options);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
    }
    return response.json() as Promise<T>;
}