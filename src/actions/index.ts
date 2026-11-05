import { createServerFn } from "@tanstack/react-start";

export const todos = [
  { id: 1, name: "Get groceries" },
  { id: 2, name: "Buy a new phone" },
  { id: 3, name: "Finish the project" },
];

export const listTodo = createServerFn({ method: "GET" }).handler(() => {
  return todos;
});
