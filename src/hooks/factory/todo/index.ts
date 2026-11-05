import { queryOptions } from "@tanstack/react-query";
import { todos } from "@/actions";

export const todoQueryOption = {
  all: () => ["todo_list"],
  filter: (query: string | undefined) =>
    queryOptions({
      queryKey: [...todoQueryOption.all(), query],
      initialData: todos,
      select: (data) => (query ? data.filter((todo) => todo.name.includes(query)) : data),
    }),
};
