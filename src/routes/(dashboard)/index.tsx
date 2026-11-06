import { createFileRoute } from "@tanstack/react-router";

const App = () => {
  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="font-semibold text-2xl">Procurement Agent</h1>
        <p className="mt-2 text-muted-foreground">
          Requests, vendor quotes, and agent decisions in one place.
        </p>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/(dashboard)/")({
  component: App,
});
