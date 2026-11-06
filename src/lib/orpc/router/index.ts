import { base } from "../base";

export const ping = base.route({ method: "GET", path: "/ping" }).handler(() => ({
  ok: true,
  at: new Date().toISOString(),
}));

export default {
  ping,
};
