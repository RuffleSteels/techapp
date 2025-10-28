// WireframeCuboid.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import Svg, { Line } from "react-native-svg";

const deg2rad = (deg: number) => (deg * Math.PI) / 180;

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
                                        }) {
    const [angle, setAngle] = useState({ x: 20, y: 0, z: 0 });
    const raf = useRef<number>();

    useEffect(() => {
        let last = performance.now();
        const tick = (now: number) => {
            const dt = (now - last) / 1000;
            last = now;

            setAngle((a) => {
                // Normal rotation
                let newAngle = {
                    x: (a.x + rotationSpeedX * dt) % 360,
                    y: (a.y + rotationSpeedY * dt) % 360,
                    z: (a.z + rotationSpeedZ * dt) % 360,
                };

                // If target angles exist, blend toward them as well
                if (
                    targetAngleX !== undefined &&
                    targetAngleY !== undefined &&
                    targetAngleZ !== undefined
                ) {
                    const ease = 0.05; // blending rate per frame
                    newAngle = {
                        x: newAngle.x + (targetAngleX - newAngle.x) * ease,
                        y: newAngle.y + (targetAngleY - newAngle.y) * ease,
                        z: newAngle.z + (targetAngleZ - newAngle.z) * ease,
                    };
                }
                return newAngle;
            });

            raf.current = requestAnimationFrame(tick);
        };

        raf.current = requestAnimationFrame(tick);
        return () => raf.current && cancelAnimationFrame(raf.current);
    }, [
        rotationSpeedX,
        rotationSpeedY,
        rotationSpeedZ,
        targetAngleX,
        targetAngleY,
        targetAngleZ,
    ]);

    const points = useMemo(() => {
        const radX = deg2rad(angle.x);
        const radY = deg2rad(angle.y);
        const radZ = deg2rad(angle.z);
        const cosY = Math.cos(radY),
            sinY = Math.sin(radY);
        const cosX = Math.cos(radX),
            sinX = Math.sin(radX);
        const cosZ = Math.cos(radZ),
            sinZ = Math.sin(radZ);

        const w = width / 2,
            h = height / 2,
            d = depth / 2;
        const verts = [
            [-w, -h, -d],
            [w, -h, -d],
            [w, h, -d],
            [-w, h, -d],
            [-w, -h, d],
            [w, -h, d],
            [w, h, d],
            [-w, h, d],
        ];

        const projected = verts.map(([x, y, z]) => {
            // Y rotation
            let xr = x * cosY + z * sinY;
            let yr = y;
            let zr = -x * sinY + z * cosY;
            // X rotation
            let yr2 = yr * cosX - zr * sinX;
            let zr2 = yr * sinX + zr * cosX;
            // Z rotation
            let xr2 = xr * cosZ - yr2 * sinZ;
            let yr3 = xr * sinZ + yr2 * cosZ;
            return [xr2, yr3];
        });

        const cx = size / 2,
            cy = size / 2;
        const scale = (size - 32) / (Math.max(width, height, depth) * 1.3);
        return projected.map(([x, y]) => [x * scale + cx, y * scale + cy]);
    }, [angle, width, height, depth, size]);

    const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
    ];

    return (
        <Svg style={{
            zIndex: 100
        }} width={size} height={size}>
            {edges.map(([a, b], i) => {
                const [x1, y1] = points[a];
                const [x2, y2] = points[b];
                return (
                    <Line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="white"
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                );
            })}
        </Svg>
    );
}