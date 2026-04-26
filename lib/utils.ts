import AsyncStorage from "@react-native-async-storage/async-storage";
import { RoomMode } from "./types";

export const loadData = async (type: string) => {
    try {
        const json = await AsyncStorage.getItem(type);
        return json ? JSON.parse(json) : null;
    } catch (e) {
        console.error('Failed to load profile', e);
        return null;
    }
};

export const saveData = async (name: string, data: any) => {
    try {
        await AsyncStorage.setItem(name, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save profile', e);
    }
};

export function fToH(f: number): number {
    const PI = Math.PI;
    const area = PI * (0.115 ** 2 - 0.03 ** 2);
    const height = 0.185;
    const A_sleeve = PI * (0.118 ** 2 - 0.115 ** 2);
    const c = 343.0;
    const r_hole = 0.0125;
    const N = 5;
    const L_eff = 0.05 + 1.6 * 0.0125;
    const A_hole = PI * r_hole * r_hole;
    const C = c / (2.0 * PI);
    const K = (N * A_hole) / L_eff;
    const V = (C * C * K) / (f * f);
    const h = (V - area * height) / (area + A_sleeve);
    return h * 1000.0; // meters → mm
}

export function hToF(h_mm: number): number {
    const PI = Math.PI;
    const area = PI * (0.115 ** 2 - 0.03 ** 2);
    const height = 0.185;
    const A_sleeve = PI * (0.118 ** 2 - 0.115 ** 2);
    const c = 343.0;
    const r_hole = 0.0125;
    const N = 5;
    const L_eff = 0.05 + 1.6 * 0.0125;
    const A_hole = PI * r_hole * r_hole;
    const C = c / (2.0 * PI);
    const K = (N * A_hole) / L_eff;
    const h = h_mm / 1000.0;
    const V = h * (area + A_sleeve) + area * height;
    const f = (C * Math.sqrt(K)) / Math.sqrt(V);
    return f;
}

export function toDisplay(freq: number): string {
    return (-2.143121 * Math.sqrt(fToH(Math.min(120.7, freq))) + 127.883136).toFixed(1)
}

export function fromDisplay(predicted: number): number {
    return parseFloat(hToF(((predicted - 127.883136) / -2.143121)**2).toFixed(1));
}

export function findTop3ModesInRange(
    length: number, width: number, height: number,
    range: [number, number],
    speedOfSound = 343
): RoomMode[] {
    const [minF, maxF] = range;
    const modes: RoomMode[] = [];

    for (let nx = 0; nx <= 10; nx++) {
        for (let ny = 0; ny <= 10; ny++) {
            for (let nz = 0; nz <= 10; nz++) {
                if (nx === 0 && ny === 0 && nz === 0) continue;

                const freq =
                    (speedOfSound / 2) *
                    Math.sqrt((nx / length) ** 2 + (ny / width) ** 2 + (nz / height) ** 2);

                if (freq < minF || freq > maxF) continue;

                const bounces = nx + ny + nz;
                const activeAxes = [nx, ny, nz].filter((v) => v > 0).length;
                const type =
                    activeAxes === 1 ? "axial" : activeAxes === 2 ? "tangential" : "oblique";

                modes.push({ nx, ny, nz, frequency: freq, bounces, type });
            }
        }
    }

    const typeWeight = { axial: 1, tangential: 2, oblique: 3 };

    const sorted = modes.sort((a, b) => {
        if (a.bounces !== b.bounces) return a.bounces - b.bounces;
        if (typeWeight[a.type] !== typeWeight[b.type])
            return typeWeight[a.type] - typeWeight[b.type];
        return a.frequency - b.frequency;
    });

    const unique: RoomMode[] = [];
    for (const mode of sorted) {
        if (!unique.some((m) => Math.abs(m.frequency - mode.frequency) < 0.1))
            unique.push(mode);
        if (unique.length >= 3) break;
    }

    return unique;
}
