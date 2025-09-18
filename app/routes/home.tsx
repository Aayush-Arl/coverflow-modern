import type { Route } from "./+types/home";
import CoverflowThreeJS from "~/pages/cover-flow/page";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cover Flow | Modern" },
    {
      name: "description",
      content: "A cover flow with slightly modern vibe built with Three.js",
    },
  ];
}

export default function Home() {
  return <CoverflowThreeJS />;
}
