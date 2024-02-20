export interface PrinterData {
    temperature: Record<string, HeaterTemperature>;
    state: PrinterState;
}

export enum HeaterTypes {
    Toolhead = 'tool0',
    Bed = 'bed',
}

export interface HeaterTemperature {
    actual: number;
    offset: number;
    target: number;
}

export interface PrinterState {
    text: string;
    flags: PrinterStateFlags;
}

export interface PrinterStateFlags {
    operational: boolean;
    paused: boolean;
    printing: boolean;
    cancelling: boolean;
    pausing: boolean;
    error: boolean;
    ready: boolean;
    closedOrError: boolean;
}