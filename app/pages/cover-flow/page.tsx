import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { BackSide, Color, TextureLoader } from "three";
import type { Group, Mesh, MeshBasicMaterial, Texture } from "three";
import albumCovers from "~/pages/cover-flow/images.json";

const PLANE_WIDTH = 256;
const PLANE_HEIGHT = 256;
const SLIDE_SPACING_X = 80;
const NUM_SLIDES = albumCovers.length;
const ACTIVE_COLOR = new Color(0xffffff);
const INACTIVE_COLOR = new Color(0x555555);
const REFLECTION_COLOR = new Color(0x333333);

type CardProps = {
  texture: Texture;
};

const Card = forwardRef<Group, CardProps>(function Card({ texture }, ref) {
  return (
    <group ref={ref}>
      <mesh name="face">
        <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <mesh rotation={[Math.PI, 0, 0]} position={[0, -PLANE_HEIGHT - 1, 0]}>
        <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
        <meshBasicMaterial
          map={texture}
          color={REFLECTION_COLOR}
          transparent
          opacity={0.12}
          side={BackSide}
        />
      </mesh>
    </group>
  );
});

/** Mirrors the reference implementation's three-zone moveSlide() layout. */
function slideTarget(index: number, targetIndex: number) {
  let x = SLIDE_SPACING_X * (index - targetIndex);
  let z = 0;
  let rotationY = 0;

  if (index < targetIndex) {
    x -= PLANE_WIDTH * 0.6;
    z = PLANE_WIDTH;
    rotationY = 45 * (Math.PI / 180);
  } else if (index > targetIndex) {
    x += PLANE_WIDTH * 0.6;
    z = PLANE_WIDTH;
    rotationY = -45 * (Math.PI / 180);
  } else {
    x = 0;
    z = 0;
    rotationY = 0;
  }

  return { x, z: -z, rotationY };
}

function valueToIndex(value: number) {
  return Math.round(value * (NUM_SLIDES - 1));
}

function indexToValue(index: number) {
  return NUM_SLIDES > 1 ? index / (NUM_SLIDES - 1) : 0;
}

export default function CoverflowThreeJS() {
  const initialIndex = Math.floor(NUM_SLIDES / 2);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [sliderValue, setSliderValue] = useState(() =>
    indexToValue(initialIndex),
  );

  const cardRefs = useRef<(Group | null)[]>([]);
  const sliderValueRef = useRef(sliderValue);
  const dragState = useRef<{ startX: number; startValue: number } | null>(
    null,
  );

  const textures = useMemo(
    () => albumCovers.map((src) => new TextureLoader().load(src)),
    [],
  );

  /**
   * Canvas mounts via a separate R3F renderer pass, so these refs can still
   * be null the first time the activeIndex effect below runs. Placing each
   * card synchronously the moment its own ref attaches (memoized so it only
   * fires once per card, not on every re-render) avoids the "crammed at
   * origin until the next scroll" flash that races against that effect.
   */
  const cardRefCallbacks = useMemo(
    () =>
      albumCovers.map((_, i) => (el: Group | null) => {
        cardRefs.current[i] = el;
        if (el) {
          const { x, z, rotationY } = slideTarget(i, initialIndex);
          el.position.set(x, 0, z);
          el.rotation.set(0, rotationY, 0);

          const face = el.getObjectByName("face") as Mesh | undefined;
          const material = face?.material as MeshBasicMaterial | undefined;
          material?.color.copy(i === initialIndex ? ACTIVE_COLOR : INACTIVE_COLOR);
        }
      }),
    [initialIndex],
  );
  const backgroundTexture = useMemo(
    () => new TextureLoader().load("/assets/images/background.png"),
    [],
  );

  const commitValue = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    sliderValueRef.current = clamped;
    setSliderValue(clamped);
    setActiveIndex(valueToIndex(clamped));
  };

  useEffect(() => {
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const { x, z, rotationY } = slideTarget(i, activeIndex);

      gsap.to(card.position, {
        x,
        z,
        duration: 1.8,
        ease: "expo.out",
        overwrite: true,
      });
      gsap.to(card.rotation, {
        y: rotationY,
        duration: 0.9,
        ease: "expo.out",
        overwrite: true,
      });

      const face = card.getObjectByName("face") as Mesh | undefined;
      const material = face?.material as MeshBasicMaterial | undefined;
      if (material) {
        const target = i === activeIndex ? ACTIVE_COLOR : INACTIVE_COLOR;
        gsap.to(material.color, {
          r: target.r,
          g: target.g,
          b: target.b,
          duration: 0.9,
          ease: "expo.out",
          overwrite: true,
        });
      }
    });
  }, [activeIndex]);

  useEffect(() => {
    const el = document.getElementById("coverflow-container");
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      commitValue(sliderValueRef.current + e.deltaY * 0.0005);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    commitValue(e.target.valueAsNumber);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, startValue: sliderValueRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const deltaX = e.clientX - dragState.current.startX;
    const sensitivity = window.innerWidth * 2;
    commitValue(dragState.current.startValue - deltaX / sensitivity);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    e.currentTarget.style.cursor = "grab";
  };

  return (
    <div className="w-full h-dvh bg-black relative overflow-hidden">
      <div
        id="coverflow-container"
        className="w-full h-full cursor-grab touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Canvas camera={{ position: [0, 0, 900], fov: 30, near: 0.1, far: 2000 }}>
          <mesh position={[0, 0, -500]}>
            <planeGeometry args={[3000, 1000]} />
            <meshBasicMaterial map={backgroundTexture} />
          </mesh>
          {textures.map((texture, i) => (
            <Card key={i} texture={texture} ref={cardRefCallbacks[i]} />
          ))}
        </Canvas>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-12 w-4/5 z-10">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderValue}
          onChange={handleSliderChange}
          className="coverflow-range w-full"
        />
      </div>
    </div>
  );
}
