import MiniBars from "./MiniBars";
import StatTile from "./StatTile";
import EmptyState from "./EmptyState";
import { fmtInt, fmtDelta } from "@/lib/format";
import { TARGETS } from "@/lib/targets";
import { avgNonNull, expenditure } from "@/lib/energy";
import type { DayRow } from "@/lib/data";

export type EnergyBalanceCardProps = { days: DayRow[] }; // ascending, gap-aware

// "Jun 16" from a YYYY-MM-DD string. UTC, deterministic (no Date.now()).
function monthDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export default function EnergyBalanceCard({ days }: EnergyBalanceCardProps) {
  const expVals = days.map(expenditure);
  const intakeVals = days.map((d) => d.kcal);
  const balanceVals = days.map((d) => d.energyBalance);

  const hasExpenditure = expVals.some((v) => v != null);
  const hasIntake = intakeVals.some((v) => v != null);
  const balancePresent = balanceVals.filter((v): v is number => v != null);

  // Caption: span of the window.
  const caption =
    days.length > 0
      ? `${monthDay(days[0].date)} – ${monthDay(days[days.length - 1].date)}`
      : "No data yet";

  function header() {
    return (
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Energy Balance</h2>
        <p className="muted" style={{ fontSize: 12 }}>
          {caption}
        </p>
      </div>
    );
  }

  // Nothing on either side of the ledger.
  if (!hasExpenditure && !hasIntake) {
    return (
      <section className="card">
        {header()}
        <EmptyState message="Sync Garmin and log meals to see your energy balance." />
      </section>
    );
  }

  // --- Headline stats -------------------------------------------------------

  const avgBalance = avgNonNull(balanceVals);
  const avgExpenditure = avgNonNull(days.map((d) => d.totalKcal));
  const todayIntake = days.length > 0 ? days[days.length - 1].kcal : null;

  const avgDeficitTile =
    avgBalance == null ? (
      <StatTile
        label="Avg deficit"
        value="—"
        sub="Log meals + sync Garmin"
      />
    ) : (
      <StatTile
        label="Avg deficit"
        value={`${fmtDelta(avgBalance, { unit: " kcal/day" })}`}
        delta={
          avgBalance < 0
            ? { text: "deficit", tone: "good" }
            : { text: "surplus", tone: "warn" }
        }
      />
    );

  const expenditureTile = (
    <StatTile
      label="Expenditure (avg)"
      value={avgExpenditure == null ? "—" : `${fmtInt(avgExpenditure)} kcal`}
      sub="Garmin TDEE"
      spark={days.map((d) => d.totalKcal)}
      sparkColor="var(--accent-2)"
    />
  );

  const intakeTile = (
    <StatTile
      label="Intake (target)"
      value={`${fmtInt(TARGETS.kcal)} kcal target`}
      sub={todayIntake != null ? `Today: ${fmtInt(todayIntake)} kcal` : undefined}
    />
  );

  const statRow = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        marginBottom: 14,
      }}
    >
      {avgDeficitTile}
      {expenditureTile}
      {intakeTile}
    </div>
  );

  // --- Expenditure breakdown bars -------------------------------------------
  // One bar per day. Days that are a *true* logged deficit (intake present and
  // energyBalance < 0) get the brighter accent; the rest use accent-2.
  const expenditureBars = days.map((d) => {
    const value = expenditure(d);
    const trueDeficit = d.kcal != null && d.energyBalance != null && d.energyBalance < 0;
    return {
      value,
      color: trueDeficit ? "var(--accent)" : "var(--accent-2)",
      label: monthDay(d.date),
    };
  });

  return (
    <section className="card">
      {header()}
      {statRow}

      <div className="label" style={{ marginBottom: 6 }}>
        Daily expenditure
      </div>
      <MiniBars
        bars={expenditureBars}
        baseline={0}
        ariaLabel="Daily energy expenditure"
      />

      {/* Only show the deficit ledger when there are at least two real
          (both-sides-present) days — otherwise it reads as a broken chart. */}
      {balancePresent.length >= 2 && (
        <>
          <div className="label" style={{ marginTop: 14, marginBottom: 6 }}>
            Energy balance (intake − expenditure)
          </div>
          <MiniBars
            bars={days.map((d) => ({
              value: d.energyBalance,
              color: d.energyBalance == null ? undefined : d.energyBalance < 0 ? "var(--good)" : "var(--warn)",
              label: monthDay(d.date),
            }))}
            baseline={0}
            ariaLabel="Daily energy balance"
          />
        </>
      )}
    </section>
  );
}
