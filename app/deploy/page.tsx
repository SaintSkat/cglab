'use client'
import { FormEvent } from "react";

interface FetchOptions extends RequestInit {
    timeout?: number;
}

async function fetchWithTimeout(resource: RequestInfo, options: FetchOptions = {}): Promise<Response> {
    const { timeout = 8000 } = options; // Задаем таймаут по умолчанию 8 секунд
    const controller = new AbortController();
    const { signal } = controller;

    const fetchOptions: RequestInit = { ...options, signal };

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(resource, fetchOptions);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

export default function Deploy(){
    async function onSubmit(event:FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const formData = new FormData(event.currentTarget)
        const response = await fetchWithTimeout(`${process.env.DEPLOYMENT_SERVER}/api/ubuntu/deploy`, {
            method: 'POST',
            body: formData,
            timeout: 300000
        })

        const data = await response.body
        console.log(data)
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <form onSubmit={onSubmit}>
                <input type="text" name="source" placeholder="input git repository" required={true}/>
                <button type="submit">Deploy</button>
            </form>
        </main>
    );
}