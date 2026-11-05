import { createFileRoute } from "@tanstack/react-router";
import { authMiddleware } from "@/middleware/auth";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";

const App = () => {
  const todos = useQuery(orpc.listTodos.queryOptions({}));
  return (
    <div className="p-4 text-center ">
      <p className="font-bold text-xl m-1">Todos</p>
      <br />
      <pre>{JSON.stringify(todos.data, null, 4)}</pre>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/")({
  component: App,
  loader: async ({ context }) => {
    await context.queryClient.query(orpc.listTodos.queryOptions());
  },
  server: {
    middleware: [authMiddleware],
  },
});
