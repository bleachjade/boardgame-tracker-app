import { Box } from "lucide-react";
import { useTranslation } from "react-i18next";

type BoardGameDimensions = {
  width: number;
  length: number;
  depth: number;
};

export function BoardGame3DModel({
  dimensions,
  image,
  name,
}: {
  dimensions: BoardGameDimensions;
  image?: string;
  name: string;
}) {
  const { t } = useTranslation();
  const centimeters = {
    width: dimensions.width * 2.54,
    length: dimensions.length * 2.54,
    depth: dimensions.depth * 2.54,
  };
  const diagonal = Math.sqrt(centimeters.width ** 2 + centimeters.length ** 2);
  const scale = 170 / Math.max(centimeters.width, centimeters.length, centimeters.depth);
  const width = centimeters.width * scale;
  const length = centimeters.length * scale;
  const depth = Math.max(centimeters.depth * scale, 8);
  const sceneWidth = width + 64;
  const sceneHeight = length + 64;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
          <Box size={16} className="text-indigo-500" />
          {t("gameDetails.model3d")}
        </h4>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t("gameDetails.centimeters")}</span>
      </div>

      <div className="flex min-h-[240px] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-indigo-950/40 dark:to-slate-950">
        <div
          className="relative"
          style={{
            width: `${sceneWidth}px`,
            height: `${sceneHeight}px`,
            perspective: "900px",
          }}
        >
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${width}px`,
              height: `${length}px`,
              transform: "translate(-50%, -50%) rotateX(58deg) rotateZ(-28deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className="absolute rounded-lg bg-black/25 blur-md"
              style={{
                width: `${width}px`,
                height: `${length}px`,
                left: `${depth * 0.35}px`,
                top: `${depth * 0.35}px`,
                transform: "translateZ(-4px)",
              }}
            />

            {image ? (
              <img
                src={image}
                alt={`${name} box cover`}
                className="absolute left-0 top-0 h-full w-full rounded-md border-2 border-white/80 object-cover"
                style={{ transform: `translateZ(${depth / 2}px)`, backfaceVisibility: "hidden" }}
              />
            ) : (
              <div
                className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-md border-2 border-white/80 bg-slate-800 p-3 text-center text-xs font-black uppercase tracking-widest text-white/90"
                style={{ transform: `translateZ(${depth / 2}px)` }}
              >
                {name}
              </div>
            )}

            <div
              className="absolute left-0 top-0 rounded-md bg-slate-700"
              style={{
                width: `${width}px`,
                height: `${depth}px`,
                transform: `rotateX(90deg) translateZ(-${length-depth/2}px)`,
                transformOrigin: "center",
              }}
            />
            <div
              className="absolute left-0 top-0 rounded-md bg-slate-700"
              style={{
                width: `${depth}px`,
                height: `${length}px`,
                transform: `rotateY(90deg) translateZ(${(width / length) - depth/2}px)`,
                transformOrigin: "center",
              }}
            />
            </div>
          </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
          <span className="block font-black text-slate-900 dark:text-white">{centimeters.width.toFixed(1)}</span>
          <span className="text-slate-500">{t("gameDetails.width")}</span>
        </div>
        <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
          <span className="block font-black text-slate-900 dark:text-white">{centimeters.length.toFixed(1)}</span>
          <span className="text-slate-500">{t("gameDetails.length")}</span>
        </div>
        <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
          <span className="block font-black text-slate-900 dark:text-white">{centimeters.depth.toFixed(1)}</span>
          <span className="text-slate-500">{t("gameDetails.depth")}</span>
        </div>
        <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
          <span className="block font-black text-slate-900 dark:text-white">{diagonal.toFixed(1)}</span>
          <span className="text-slate-500">{t("gameDetails.diagonal")}</span>
        </div>
      </div>
    </div>
  );
}
