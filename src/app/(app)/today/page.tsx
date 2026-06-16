import { Suspense } from "react";
import {
  getMealsForLocalDate,
  getGarminDaily,
  getDailyMacros,
  getSessionVolumes,
  getWeights,
  getMeasurements,
  buildDaySpine,
  alignDays,
  type Meal,
  type Weight,
  type GarminDaily,
  type DailyMacros,
  type SessionVolume,
  type Measurement,
} from "@/lib/data";
import { localDateStr, prettyDate, daysBetween } from "@/lib/dates";
import { PROFILE } from "@/lib/targets";
import { withRollingAvg, weeklySlope } from "@/lib/trend";
import MealForm from "@/components/MealForm";
import MealItem from "@/components/MealItem";
import TodayHero from "@/components/TodayHero";
import WeekGlance from "@/components/WeekGlance";
import Verdict from "@/components/Verdict";
import CoachLine from "@/components/CoachLine";
import CutProgressCard from "@/components/CutProgressCard";
import RecoveryCard from "@/components/RecoveryCard";
import EnergyBalanceCard from "@/components/EnergyBalanceCard";
import CompositionCard from "@/components/CompositionCard";
import TrainingCard from "@/components/TrainingCard";
import { HeroSkeleton, GlanceSkeleton, DetailsSkeleton } from "@/components/skeletons";

export const dynamic = "force-dynamic";

// weekIndex from the span of logged weigh-ins (default 1).
function weekIndexOf(trend: { date: string }[]): number {
  if (trend.length === 0) return 1;
  return Math.floor(daysBetween(trend[0].date, trend[trend.length - 1].date) / 7) + 1;
}

// --- Streaming sections -----------------------------------------------------
// Each awaits only the promises it needs, inside its own Suspense boundary, so
// the static shell flushes immediately and sections fill in independently.
// Promises are started once in the page and shared, so nothing double-fetches.

async function HeroSection({ mealsP }: { mealsP: Promise<Meal[]> }) {
  const meals = await mealsP;
  return <TodayHero meals={meals} />;
}

async function GlanceSection({
  garminP,
  macrosP,
  volumesP,
  weightsP,
}: {
  garminP: Promise<GarminDaily[]>;
  macrosP: Promise<DailyMacros[]>;
  volumesP: Promise<SessionVolume[]>;
  weightsP: Promise<Weight[]>;
}) {
  const [garminDaily, dailyMacros, sessionVolumes, weights] = await Promise.all([
    garminP,
    macrosP,
    volumesP,
    weightsP,
  ]);
  const trend = withRollingAvg(weights.map((w) => ({ date: w.measured_on, weight: w.weight_kg })));
  const slope = weeklySlope(weights.map((w) => ({ date: w.measured_on, weight: w.weight_kg })));
  const dayRows = alignDays(buildDaySpine(30), { garminDaily, dailyMacros, trend });

  return (
    <>
      <WeekGlance trend={trend} slope={slope} dayRows={dayRows} sessions={sessionVolumes} />
      <CoachLine slope={slope} weekIndex={weekIndexOf(trend)} />
    </>
  );
}

async function VerdictSection({ weightsP }: { weightsP: Promise<Weight[]> }) {
  const weights = await weightsP;
  const points = weights.map((w) => ({ date: w.measured_on, weight: w.weight_kg }));
  return <Verdict slope={weeklySlope(points)} weighInCount={weights.length} />;
}

async function DetailsSection({
  mealsP,
  garminP,
  macrosP,
  volumesP,
  weightsP,
  measurementsP,
}: {
  mealsP: Promise<Meal[]>;
  garminP: Promise<GarminDaily[]>;
  macrosP: Promise<DailyMacros[]>;
  volumesP: Promise<SessionVolume[]>;
  weightsP: Promise<Weight[]>;
  measurementsP: Promise<Measurement[]>;
}) {
  const [meals, garminDaily, dailyMacros, sessionVolumes, weights, measurements] =
    await Promise.all([mealsP, garminP, macrosP, volumesP, weightsP, measurementsP]);

  const points = weights.map((w) => ({ date: w.measured_on, weight: w.weight_kg }));
  const trend = withRollingAvg(points);
  const slope = weeklySlope(points);
  const dayRows = alignDays(buildDaySpine(30), { garminDaily, dailyMacros, trend });

  return (
    <div className="stack-12">
      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 4 }}>Today&apos;s entries</h2>
        {meals.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, paddingTop: 8 }}>
            Nothing logged yet. Fasting until ~1-2pm is fine — protein + fiber + water when the cravings hit.
          </p>
        ) : (
          <div>
            {meals.map((m) => (
              <MealItem key={m.id} meal={m} />
            ))}
          </div>
        )}
      </section>

      <CutProgressCard
        trend={trend}
        slope={slope}
        startWeightKg={PROFILE.startWeightKg}
        goalWeightKg={PROFILE.goalWeightKg}
      />
      <RecoveryCard days={dayRows} />
      <EnergyBalanceCard days={dayRows} />
      <CompositionCard measurements={measurements} />
      <TrainingCard sessions={sessionVolumes} />
    </div>
  );
}

export default function TodayPage() {
  const today = localDateStr();

  // Kick off every query at shell-render time (concurrent), await none here so
  // the shell flushes immediately. Sections share these promises.
  const mealsP = getMealsForLocalDate(today);
  const garminP = getGarminDaily(30);
  const macrosP = getDailyMacros(30);
  const volumesP = getSessionVolumes(90);
  const weightsP = getWeights();
  const measurementsP = getMeasurements();

  return (
    <main className="stack-12">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 className="page-title">Today</h1>
          <p className="cap">{prettyDate(today)}</p>
        </div>
        <Suspense fallback={null}>
          <VerdictSection weightsP={weightsP} />
        </Suspense>
      </div>

      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection mealsP={mealsP} />
      </Suspense>

      <Suspense fallback={<GlanceSkeleton />}>
        <GlanceSection garminP={garminP} macrosP={macrosP} volumesP={volumesP} weightsP={weightsP} />
      </Suspense>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 10 }}>Log a meal</h2>
        <MealForm />
      </section>

      <div className="details-divider">Details</div>

      <Suspense fallback={<DetailsSkeleton />}>
        <DetailsSection
          mealsP={mealsP}
          garminP={garminP}
          macrosP={macrosP}
          volumesP={volumesP}
          weightsP={weightsP}
          measurementsP={measurementsP}
        />
      </Suspense>
    </main>
  );
}
