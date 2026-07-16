export declare const getSantaResponse: (schoolId: string, message: string, history: {
    role: "user" | "assistant";
    content: string;
}[]) => Promise<{
    response: string;
}>;
