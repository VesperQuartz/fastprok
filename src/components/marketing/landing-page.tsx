import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Robot01Icon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Robot01Icon,
    title: "Describe the need",
    body: "Write one paragraph. Vultr inference turns it into a structured request.",
  },
  {
    icon: Search01Icon,
    title: "Vendors quote",
    body: "Rules match vendors by category, region, lead time, and reliability.",
  },
  {
    icon: CheckmarkCircle02Icon,
    title: "You approve",
    body: "Quotes are ranked deterministically. An approver makes the final call.",
  },
];

export const LandingPage = () => (
  <div className="min-h-svh bg-[#f6f7f9]">
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[#f6f7f9]/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src="/procurement-mark.png" alt="" className="size-9 shrink-0 object-contain" />
          <span className="truncate font-semibold">Procurement Agent</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link to="/login" />}>
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link to="/register" />}>
            Create account
          </Button>
        </nav>
      </div>
    </header>

    <main>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
        <div>
          <h1 className="font-semibold text-4xl tracking-tight text-balance sm:text-5xl">
            Procurement that never stalls.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
            Describe a need. The agent finds vendors, chases quotes, and ranks every offer.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link to="/login" />}>
              Try the demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link to="/register" />}
            >
              Create an account
            </Button>
          </div>
          <p className="mt-3 text-muted-foreground text-xs">No sign-up needed for the demo.</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl shadow-slate-950/10">
          <img
            src="/procurement-hero.png"
            alt="A shopping cart with a green approval check"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="border-y border-border/70 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 className="font-semibold text-2xl tracking-tight text-balance">
            From paragraph to purchase decision
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm text-pretty">
            Three steps. The agent does the chasing; a human makes the call.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-border/70 bg-background p-5"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <HugeiconsIcon icon={step.icon} strokeWidth={1.8} className="size-4" />
                </span>
                <h3 className="mt-4 font-medium">{step.title}</h3>
                <p className="mt-1 text-muted-foreground text-sm text-pretty">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight text-balance">
            Rules decide. AI explains.
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground text-sm text-pretty">
            The ranking is repeatable. The model only writes the explanation from the scored
            numbers.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Deterministic scoring for cost, speed, reliability, and warranty.",
              "AI reasons quote the scored data and never change the ranking.",
              "Only an organization approver can approve a purchase.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border/70 bg-white p-6">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4 text-blue-600" />
            <h3 className="font-medium">Built on Vultr</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <span className="font-medium">Cloud Compute</span>
              <span className="block text-muted-foreground">Runs the app on a Vultr VM.</span>
            </li>
            <li>
              <span className="font-medium">Managed PostgreSQL</span>
              <span className="block text-muted-foreground">
                Stores every request, quote, and decision.
              </span>
            </li>
            <li>
              <span className="font-medium">Serverless Inference</span>
              <span className="block text-muted-foreground">
                Structures requests and explains rankings.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="border-t border-border/70 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-2xl tracking-tight">Ready to run a purchase?</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Start with the demo, or create your organization account.
            </p>
          </div>
          <Button size="lg" nativeButton={false} render={<Link to="/login" />}>
            Try the demo
          </Button>
        </div>
      </section>
    </main>

    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>Procurement Agent · Vultr Agent Rush 2026</p>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link to="/register" className="hover:text-foreground">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  </div>
);
