import { Landing } from "@/components/site/landing";
// Workspace alias sanity import — verifies @workspace/* resolution at build time.
// Remove when the first real consumer lands.
import "@workspace/shared";

export default function Home() {
  return <Landing />;
}
