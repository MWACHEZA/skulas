export declare class NotificationWorker {
    private isRunning;
    private intervalId?;
    start(): void;
    stop(): void;
    private processQueue;
}
export declare const notificationWorker: NotificationWorker;
