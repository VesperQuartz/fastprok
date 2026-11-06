import "@orpc/openapi/extensions/route";

import { oc } from "@orpc/contract";

export const clientContract = {
  ping: oc.route({ method: "GET", path: "/ping" }),
  me: oc.route({ method: "GET", path: "/me" }),
  account: {
    provision: oc.route({ method: "POST", path: "/account/provision" }),
  },
  requests: {
    create: oc.route({ method: "POST", path: "/requests" }),
    list: oc.route({ method: "GET", path: "/requests" }),
    get: oc.route({ method: "GET", path: "/requests/{requestId}" }),
    quoteList: oc.route({ method: "GET", path: "/requests/{requestId}/quotes" }),
    timeline: oc.route({ method: "GET", path: "/requests/{requestId}/timeline" }),
    approve: oc.route({ method: "POST", path: "/requests/{requestId}/approve" }),
  },
  vendor: {
    inbox: oc.route({ method: "GET", path: "/vendor/requests" }),
    get: oc.route({ method: "GET", path: "/vendor/requests/{requestId}" }),
    submit: oc.route({ method: "POST", path: "/vendor/requests/{requestId}/quote" }),
  },
  agent: {
    tick: oc.route({ method: "POST", path: "/agent/tick" }),
  },
  notifications: {
    list: oc.route({ method: "GET", path: "/notifications" }),
  },
};
