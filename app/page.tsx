import { Suspense } from "react";
import { Studio } from "@/components/studio";

export default function Page() {
  return (
    <Suspense fallback={<p className="px-8 py-6 text-[13px] text-ash">Opening the desk.</p>}>
      <Studio />
    </Suspense>
  );
}
