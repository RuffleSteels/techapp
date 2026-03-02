// WireframeCuboid.tsx
import React, { useEffect, useRef } from "react";
import Svg, { Line } from "react-native-svg";

const deg2rad = (deg: number) => (deg * Math.PI) / 180;

const EDGES: [number, number, string][] = [
    // X-axis edges (width) - yellow
    [0, 1, 'white'], [3, 2, 'white'], [4, 5, 'white'], [7, 6, '#D0B830'],
    // Y-axis edges (height) - cyan
    [0, 3, 'white'], [1, 2, 'white'], [4, 7, 'white'], [5, 6, '#D030C8'],
    // Z-axis edges (depth) - magenta
    [0, 4, 'white'], [1, 5, 'white'], [2, 6, '#30D0D0'], [3, 7, 'white'],
];

function computePoints(
    angle: { x: number; y: number; z: number },
    width: number,
    height: number,
    depth: number,
    size: number
): number[][] {
    const radX = deg2rad(angle.x);
    const radY = deg2rad(angle.y);
    const radZ = deg2rad(angle.z);
    const cosY = Math.cos(radY), sinY = Math.sin(radY);
    const cosX = Math.cos(radX), sinX = Math.sin(radX);
    const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);

    const w = width / 2, h = height / 2, d = depth / 2;
    const verts = [
        [-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d],
        [-w, -h, d],  [w, -h, d],  [w, h, d],  [-w, h, d],
    ];

    const projected = verts.map(([x, y, z]) => {
        let xr  =  x * cosY + z * sinY;
        let yr  =  y;
        let zr  = -x * sinY + z * cosY;
        let yr2 =  yr * cosX - zr * sinX;
        let zr2 =  yr * sinX + zr * cosX;
        let xr2 =  xr * cosZ - yr2 * sinZ;
        let yr3 =  xr * sinZ + yr2 * cosZ;
        return [xr2, yr3];
    });

    const cx = size / 2, cy = size / 2;
    const scale = (size - 32) / (Math.max(width, height, depth) * 1.3);
    return projected.map(([x, y]) => [x * scale + cx, y * scale + cy]);
}

export default function WireframeCuboid({
                                            width = 120,
                                            height = 100,
                                            depth = 60,
                                            size = 300,
                                            rotationSpeedX = 0,
                                            rotationSpeedY = 0,
                                            rotationSpeedZ = 0,
                                            targetAngleX,
                                            targetAngleY,
                                            targetAngleZ,
                                        }: {
    width?: number;
    height?: number;
    depth?: number;
    size?: number;
    rotationSpeedX?: number;
    rotationSpeedY?: number;
    rotationSpeedZ?: number;
    targetAngleX?: number | undefined;
    targetAngleY?: number | undefined;
    targetAngleZ?: number | undefined;
}) {
    // Store angle in a ref — no re-renders from angle changes
    const angleRef = useRef({ x: 20, y: 0, z: 0 });

    // Store the computed line coords in a ref so we can update the SVG imperatively
    const lineRefs = useRef<(React.ElementRef<typeof Line> | null)[]>([]);

    const speedRef = useRef({ rotationSpeedX, rotationSpeedY, rotationSpeedZ });
    const targetRef = useRef({ targetAngleX, targetAngleY, targetAngleZ });

    // Keep speed/target refs up to date without restarting the loop
    useEffect(() => {
        speedRef.current = { rotationSpeedX, rotationSpeedY, rotationSpeedZ };
    }, [rotationSpeedX, rotationSpeedY, rotationSpeedZ]);

    useEffect(() => {
        targetRef.current = { targetAngleX, targetAngleY, targetAngleZ };
    }, [targetAngleX, targetAngleY, targetAngleZ]);

    useEffect(() => {
        let raf: number;
        let last = performance.now();

        const tick = (now: number) => {
            const dt = (now - last) / 1000;
            last = now;

            const { rotationSpeedX, rotationSpeedY, rotationSpeedZ } = speedRef.current;
            const { targetAngleX, targetAngleY, targetAngleZ } = targetRef.current;
            const a = angleRef.current;

            let newAngle = {
                x: (a.x + rotationSpeedX * dt) % 360,
                y: (a.y + rotationSpeedY * dt) % 360,
                z: (a.z + rotationSpeedZ * dt) % 360,
            };

            if (
                targetAngleX !== undefined &&
                targetAngleY !== undefined &&
                targetAngleZ !== undefined
            ) {
                const ease = 0.05;
                newAngle = {
                    x: newAngle.x + (targetAngleX - newAngle.x) * ease,
                    y: newAngle.y + (targetAngleY - newAngle.y) * ease,
                    z: newAngle.z + (targetAngleZ - newAngle.z) * ease,
                };
            }

            angleRef.current = newAngle;

            // Compute new points and update SVG line elements imperatively
            const points = computePoints(newAngle, width, height, depth, size);
            EDGES.forEach(([a, b, _color], i) => {
                const lineEl = lineRefs.current[i];
                if (lineEl) {
                    const [x1, y1] = points[a];
                    const [x2, y2] = points[b];
                    // react-native-svg supports setNativeProps for perf updates
                    lineEl.setNativeProps({ x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2) });
                }
            });

            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // Only restart if the shape dimensions change — speed/target use refs
    }, [width, height, depth, size]);

    // Compute initial points for first render
    const initialPoints = computePoints(angleRef.current, width, height, depth, size);

    return (
        <Svg style={{ zIndex: 100, overflow: 'visible' }} width={size} height={size}>
            {EDGES.map(([a, b, color], i) => {
                const [x1, y1] = initialPoints[a];
                const [x2, y2] = initialPoints[b];
                return (
                    <Line
                        ref={(el) => { lineRefs.current[i] = el; }}
                        key={i}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={color}
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                );
            })}
        </Svg>
    );
}

