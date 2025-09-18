import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { TextureLoader } from "three";
import type { Mesh, Texture } from "three";
import albumCovers from "~/pages/cover-flow/images.json";

type CardProps = {
  texture: Texture;
  index: number;
  activeIndex: number;
};

function Card({ texture, index, activeIndex }: CardProps) {
  const ref = useRef<Mesh>(null!);
  const materialRef = useRef<any>(null!);

  useFrame(() => {
    const distance = index - activeIndex;
    const targetX = distance * 2.5;
    const targetZ = -Math.abs(distance);
    const targetRotY = -distance * 0.3;
    const targetScale = distance === 0 ? 1.2 : 1;

    ref.current.position.x += (targetX - ref.current.position.x) * 0.1;
    ref.current.position.z += (targetZ - ref.current.position.z) * 0.1;
    ref.current.rotation.y += (targetRotY - ref.current.rotation.y) * 0.1;
    ref.current.scale.x += (targetScale - ref.current.scale.x) * 0.1;
    ref.current.scale.y += (targetScale - ref.current.scale.y) * 0.1;
    ref.current.scale.z += (targetScale - ref.current.scale.z) * 0.1;

    const targetColor = index === activeIndex ? 1 : 0.6;
    if (materialRef.current) {
      const currentColor = materialRef.current.color.r;
      const newColor = currentColor + (targetColor - currentColor) * 0.1;
      materialRef.current.color.setRGB(newColor, newColor, newColor);
    }
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial ref={materialRef} map={texture} />
    </mesh>
  );
}

export default function CoverflowThreeJS() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);

  const textures = useMemo(
    () => albumCovers.map((src) => new TextureLoader().load(src)),
    [],
  );

  useEffect(() => {
    const el = document.getElementById("coverflow-container");
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setActiveIndex((prev) =>
        Math.min(
          Math.max(prev + Math.sign(e.deltaY), 0),
          albumCovers.length - 1,
        ),
      );
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStart(e.touches[0].clientX);
    setTouchStartTime(Date.now());
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStart === null || touchStartTime === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const deltaX = touchStart - touchEnd;
    const deltaTime = Date.now() - touchStartTime;

    const speed = deltaX / deltaTime;
    let moveBy = 0;
    if (Math.abs(deltaX) > 20) {
      moveBy = Math.min(Math.floor(Math.abs(speed) * 5), 3);
      moveBy = deltaX > 0 ? moveBy : -moveBy;
    }

    setActiveIndex((prev) =>
      Math.min(Math.max(prev + moveBy, 0), albumCovers.length - 1),
    );

    setTouchStart(null);
    setTouchStartTime(null);
  };

  return (
    <div className="w-full h-dvh bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
      <div
        id="coverflow-container"
        className="w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} />
          {textures.map((texture, i) => (
            <Card
              key={i}
              texture={texture}
              index={i}
              activeIndex={activeIndex}
            />
          ))}
        </Canvas>
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 text-white text-sm z-10"
        style={{
          bottom: "clamp(8px, 1.5vw, 40px)",
          fontSize: "clamp(12px, 1.2vw, 24px)",
        }}
      >
        <p>
          Scroll / Swipe to navigate • {activeIndex + 1} of {albumCovers.length}
        </p>
      </div>
    </div>
  );
}
