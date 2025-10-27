import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

type Props = {
  width?: number; // cuboid width (X)
  height?: number; // cuboid height (Y)
  depth?: number; // cuboid depth (Z)
  size?: number; // viewport size in px
  rotationSpeed?: number; // degrees per second
};

const deg2rad = (deg: number) => (deg * Math.PI) / 180;

export default function WireframeCuboid({
  width = 120,
  height = 100,
  depth = 60,
  size = 300,
  rotationSpeed = 30,
}: Props) {

  const [angle, setAngle] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // animation loop using requestAnimationFrame so it works without native modules
  useEffect(() => {
    function tick(now: number) {
      if (!lastRef.current) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000; // seconds
      lastRef.current = now;
      setAngle((a) => (a + rotationSpeed * dt) % 360);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [rotationSpeed]);

  // compute projected 2D points in a memo
    const points = React.useMemo(() => {
        const rad = deg2rad(angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const w = width / 2;
        const h = height / 2;
        const d = depth / 2;

        const verts: [number, number, number][] = [
            [-w, -h, -d],
            [w, -h, -d],
            [w, h, -d],
            [-w, h, -d],
            [-w, -h, d],
            [w, -h, d],
            [w, h, d],
            [-w, h, d],
        ];

        const angleX = 20;
        const angleY = angle;
        const angleZ = 0;

        const radY = deg2rad(angleY);
        const radX = deg2rad(angleX);
        const radZ = deg2rad(angleZ);

        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const cosZ = Math.cos(radZ);
        const sinZ = Math.sin(radZ);

        const projected = verts.map(([x, y, z]) => {
            // Rotate around Y
            let xr = x * cosY + z * sinY;
            let yr = y;
            let zr = -x * sinY + z * cosY;

            // Rotate around X
            let yr2 = yr * cosX - zr * sinX;
            let zr2 = yr * sinX + zr * cosX;

            // Rotate around Z
            let xr2 = xr * cosZ - yr2 * sinZ;
            let yr3 = xr * sinZ + yr2 * cosZ;

            return [xr2, yr3];
        });

        const padding = 16;
        const cx = size / 2;
        const cy = size / 2;

        // 🔧 Fixed scale: fit the largest possible cube size once
        const maxDim = Math.max(width, height, depth);
        // const maxDimX = Math.max(width, depth);
        const scale = (size - padding * 2) / (maxDim*1.3);

        const screen = projected.map(([x, y]) => [
            x * scale + cx,
            y * scale + cy,
        ]);

        return screen;
    }, [width, height, depth, angle, size]);

  // cube edges
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0], // back face
    [4, 5], [5, 6], [6, 7], [7, 4], // front face
    [0, 4], [1, 5], [2, 6], [3, 7], // connecting edges
  ];

  return (
    // <View>
      <Svg style={{
        // backgroundColor: 'red'
      }} width={size} height={size} >
        {edges.map(([a, b], i) => {
          const [x1, y1] = points[a];
          const [x2, y2] = points[b];
          return (
            <Line
              key={`e-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}

              stroke={i===1?'#D030C8' : i===0 ? '#D0B830' : i===9 ? '#30D0D0': 'white'}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    // </View>
  );
}