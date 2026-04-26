// WireframeCuboid.tsx
import React, { useEffect } from "react";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import {
    useSharedValue,
    useDerivedValue,
    withTiming,
    useFrameCallback,
    Easing,
    SharedValue,
} from "react-native-reanimated";

const deg2rad = (deg: number) => (deg * Math.PI) / 180;

// We define all 12 edges with their corresponding colors
// Notice the missing [0, 4] edge has been added here!
const EDGES = [
    { a: 0, b: 1, color: "white" },
    { a: 3, b: 2, color: "white" },
    { a: 4, b: 5, color: "white" },
    { a: 0, b: 3, color: "white" },
    { a: 1, b: 2, color: "white" },
    { a: 4, b: 7, color: "white" },
    { a: 1, b: 5, color: "white" },
    { a: 3, b: 7, color: "white" },
    { a: 0, b: 4, color: "white" },   // Missing edge added
    { a: 7, b: 6, color: "#D0B830" }, // Yellow
    { a: 5, b: 6, color: "#D030C8" }, // Magenta
    { a: 2, b: 6, color: "#30D0D0" }  // Cyan
];

function projectAll(
    ax: number, ay: number, az: number,
    ww: number, hh: number, dd: number,
    size: number, globalScale: number
): number[][] {
    'worklet';
    const cosY = Math.cos(ay), sinY = Math.sin(ay);
    const cosX = Math.cos(ax), sinX = Math.sin(ax);
    const cosZ = Math.cos(az), sinZ = Math.sin(az);
    const hw = ww / 2, hv = hh / 2, hd = dd / 2;
    const verts: [number, number, number][] = [
        [-hw, -hv, -hd], [hw, -hv, -hd], [hw, hv, -hd], [-hw, hv, -hd],
        [-hw, -hv, hd], [hw, -hv, hd], [hw, hv, hd], [-hw, hv, hd],
    ];

    // Apply globalScale multiplier here
    const scale = ((size - 32) / (Math.max(ww, hh, dd) * 1.3)) * globalScale;
    const cx = size / 2, cy = size / 2;

    return verts.map(([x, y, z]) => {
        const xr = x * cosY + z * sinY;
        const yr = y;
        const zr = -x * sinY + z * cosY;

        const yr2 = yr * cosX - zr * sinX;
        const zr2 = yr * sinX + zr * cosX;

        const xr2 = xr * cosZ - yr2 * sinZ;
        const yr3 = xr * sinZ + yr2 * cosZ;

        // Return 3D coords [x2d, y2d, z_depth] so we can use Z for sorting
        return [xr2 * scale + cx, yr3 * scale + cy, zr2];
    });
}

// A sub-component to handle a specific depth index layer dynamically
function DynamicEdge({ index, sortedEdges }: { index: number, sortedEdges: SharedValue<any[]> }) {
    const path = useDerivedValue(() => {
        const edge = sortedEdges.value[index];
        const p = Skia.Path.Make();
        if (edge) {
            p.moveTo(edge.p1x, edge.p1y);
            p.lineTo(edge.p2x, edge.p2y);
        }
        return p;
    });

    const color = useDerivedValue(() => {
        return sortedEdges.value[index]?.color || "transparent";
    });

    return <Path path={path} color={color} style="stroke" strokeWidth={3} strokeCap="round" />;
}

export default function WireframeCuboid({
                                            width = 120, height = 100, depth = 60, size = 300,
                                            rotationSpeedX = 0, rotationSpeedY = 0, rotationSpeedZ = 0,
                                            targetAngleX, targetAngleY, targetAngleZ,
                                            globalScale = 1, // <--- New prop
                                        }: {
    width?: number; height?: number; depth?: number; size?: number;
    rotationSpeedX?: number; rotationSpeedY?: number; rotationSpeedZ?: number;
    targetAngleX?: number; targetAngleY?: number; targetAngleZ?: number;
    globalScale?: number;
}) {
    const angleX = useSharedValue(deg2rad(20));
    const angleY = useSharedValue(0);
    const angleZ = useSharedValue(0);
    const speedX = useSharedValue(0);
    const speedY = useSharedValue(0);
    const speedZ = useSharedValue(0);
    const hasTarget = useSharedValue(false);
    const tgtX = useSharedValue(0);
    const tgtY = useSharedValue(0);
    const tgtZ = useSharedValue(0);
    const w = useSharedValue(width);
    const h = useSharedValue(height);
    const d = useSharedValue(depth);
    const scaleVal = useSharedValue(globalScale); // <--- Shared value for scale

    useEffect(() => {
        speedX.value = deg2rad(rotationSpeedX);
        speedY.value = deg2rad(rotationSpeedY);
        speedZ.value = deg2rad(rotationSpeedZ);
    }, [rotationSpeedX, rotationSpeedY, rotationSpeedZ]);

    useEffect(() => {
        if (targetAngleX !== undefined && targetAngleY !== undefined && targetAngleZ !== undefined) {
            tgtX.value = deg2rad(targetAngleX);
            tgtY.value = deg2rad(targetAngleY);
            tgtZ.value = deg2rad(targetAngleZ);
            hasTarget.value = true;
        } else {
            hasTarget.value = false;
        }
    }, [targetAngleX, targetAngleY, targetAngleZ]);

    useEffect(() => {
        w.value = withTiming(width, { duration: 400, easing: Easing.out(Easing.cubic) });
        h.value = withTiming(height, { duration: 400, easing: Easing.out(Easing.cubic) });
        d.value = withTiming(depth, { duration: 400, easing: Easing.out(Easing.cubic) });
    }, [width, height, depth]);

    // Animate scale changes smoothly
    useEffect(() => {
        scaleVal.value = withTiming(globalScale, { duration: 400, easing: Easing.out(Easing.cubic) });
    }, [globalScale]);

    useFrameCallback((frameInfo) => {
        'worklet';
        const dt = (frameInfo.timeSincePreviousFrame ?? 16) / 1000;
        angleX.value += speedX.value * dt;
        angleY.value += speedY.value * dt;
        angleZ.value += speedZ.value * dt;
        if (hasTarget.value) {
            const ease = 0.05;
            angleX.value += (tgtX.value - angleX.value) * ease;
            angleY.value += (tgtY.value - angleY.value) * ease;
            angleZ.value += (tgtZ.value - angleZ.value) * ease;
        }
    });

    // 1. Calculate projected points AND z-depths
    // 2. Map edges to their coordinates + average z-depth
    // 3. Sort edges back-to-front
    const sortedEdges = useDerivedValue(() => {
        const pts = projectAll(
            angleX.value, angleY.value, angleZ.value,
            w.value, h.value, d.value,
            size, scaleVal.value
        );

        const edgesWithDepth = EDGES.map(edge => {
            const z1 = pts[edge.a][2];
            const z2 = pts[edge.b][2];
            return {
                ...edge,
                z: (z1 + z2) / 2, // Average Z depth of the edge
                p1x: pts[edge.a][0], p1y: pts[edge.a][1],
                p2x: pts[edge.b][0], p2y: pts[edge.b][1],
            };
        });

        // Sort by Z (Painter's Algorithm).
        // Smaller Z is further away, larger Z is closer to the screen.
        edgesWithDepth.sort((e1, e2) => e2.z - e1.z);
        return edgesWithDepth;
    });

    return (
        <Canvas style={{ zIndex: 100, width: size, height: size }}>
            {/* Map 12 discrete depth layers (0 = furthest, 11 = closest) */}
            {Array.from({ length: 12 }).map((_, i) => (
                <DynamicEdge key={i} index={i} sortedEdges={sortedEdges} />
            ))}
        </Canvas>
    );
}