export interface PrinterObjectsList {
    objects: string[];
}

export enum PrinterObjectTypes {
    Toolhead = 'toolhead',
    Extruder = 'extruder',
    Heaters = 'heaters',
    HeaterBed = 'heater_bed',
    Probe = 'probe',
}