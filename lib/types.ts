export interface Device {
    id: number;
    name: string;
    currentDimension: Record<number | string, number>;
    frequency: number;
    currentMode: number;
    currentId: number;

}
export type Room = {
    name: string;
    length: number[];
    width: number[];
    height: number[];
    id: number;
};
export type Preset = {
    name: string;
    frequency: number;
    id: number;
};