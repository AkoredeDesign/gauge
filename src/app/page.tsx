import Hero from "@/components/home/Hero/Hero";
import Range from "@/components/home/Range/Range";
import Calibration from "@/components/home/Calibration/Calibration";
import Service from "@/components/home/Service/Service";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Range />
      <Calibration />
      <Service />
    </main>
  );
}
