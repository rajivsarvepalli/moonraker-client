export interface MoonrakerClientConfig {
    /**
     * The full moonraker base url (e.g. http://localhost:7334/).
     */
    moonrakerUrl: string;
    /**
     * Timeout value for http calls in milliseconds.
     */
    httpTimeout: number;

    /**
     * Disable retries for http calls.
     */
    disableRetries?: boolean;

    /**
     * The maximum queue size of the websocket message queue.
     * Defaults to 10,000.
     */
    websocketMessageQueueSize?: number;
}