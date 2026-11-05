import { TanStackDevtools } from "@tanstack/react-devtools";
import { AiDevtoolsPanel } from "@tanstack/react-ai-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TableDevtoolsPanel } from "@tanstack/react-table-devtools";

/**
 * Devtools shell for every TanStack library used in this app.
 *
 * The plugin panels are declared inline (rather than behind separate modules)
 * on purpose: the `@tanstack/devtools-vite` plugin scans this file for
 * `<TanStackDevtools plugins={[...]}>`, collects the components referenced by
 * each `render` prop, and strips them - together with the shell - from
 * production builds. Panels imported from elsewhere would survive the strip
 * and pull their runtime (e.g. the Solid based AI panel) into the server
 * bundle, where it crashes during SSR.
 */
export const Devtools = () => (
  <TanStackDevtools
    config={{
      position: "bottom-left",
      openHotkey: ["Meta", "Shift", "O"],
    }}
    plugins={[
      {
        name: "TanStack Router",
        id: "tanstack-router",
        defaultOpen: true,
        render: <TanStackRouterDevtoolsPanel />,
      },
      {
        name: "TanStack Query",
        id: "tanstack-query",
        defaultOpen: true,
        render: <ReactQueryDevtoolsPanel />,
      },
      {
        name: "TanStack Form",
        id: "tanstack-form",
        defaultOpen: true,
        render: <FormDevtoolsPanel />,
      },
      {
        name: "TanStack AI",
        id: "tanstack-ai",
        defaultOpen: true,
        render: <AiDevtoolsPanel />,
      },
      {
        name: "TanStack Table",
        id: "tanstack-table",
        render: <TableDevtoolsPanel />,
      },
    ]}
  />
);
