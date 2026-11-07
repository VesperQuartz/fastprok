import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { orpc } from "@/lib/orpc/client";

export type BrowserAlertPermission = "checking" | NotificationPermission | "unsupported";

type BrowserNotificationsValue = {
  permission: BrowserAlertPermission;
  supported: boolean;
  enable: () => Promise<NotificationPermission | "unsupported">;
};

const permissionListeners = new Set<() => void>();

const notifyPermissionChange = () => {
  for (const listener of permissionListeners) {
    listener();
  }
};

const subscribeToPermission = (onChange: () => void) => {
  permissionListeners.add(onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    permissionListeners.delete(onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
};

const readPermission = (): BrowserAlertPermission => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
};

const readServerPermission = (): BrowserAlertPermission => "checking";

const BrowserNotificationsContext = createContext<BrowserNotificationsValue>({
  permission: "checking",
  supported: false,
  enable: async () => "unsupported",
});

export const useBrowserNotifications = () => useContext(BrowserNotificationsContext);

type Baseline = {
  id: string;
  createdAt: string;
};

export const BrowserNotificationsProvider = ({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) => {
  const permission = useSyncExternalStore(
    subscribeToPermission,
    readPermission,
    readServerPermission,
  );
  const baseline = useRef<Baseline | null>(null);
  const list = useQuery(
    orpc.notifications.list.queryOptions({
      refetchInterval: 15_000,
      refetchIntervalInBackground: true,
      enabled: Boolean(userId),
    }),
  );

  useEffect(() => {
    baseline.current = null;
  }, [userId]);

  useEffect(() => {
    const items = list.data?.items;

    if (!userId || !items || items.length === 0) {
      return;
    }

    const newest = items[0];

    if (!newest) {
      return;
    }

    const current = baseline.current;

    if (!current) {
      baseline.current = { id: newest.id, createdAt: newest.createdAt };
      return;
    }

    if (permission !== "granted") {
      baseline.current = { id: newest.id, createdAt: newest.createdAt };
      return;
    }

    const index = items.findIndex((item) => item.id === current.id);
    const fresh =
      index >= 0
        ? items.slice(0, index)
        : items.filter((item) => item.createdAt > current.createdAt);

    baseline.current = { id: newest.id, createdAt: newest.createdAt };

    for (const item of fresh
      .filter((item) => !item.readAt && item.type !== "request.sent")
      .slice(0, 3)
      .reverse()) {
      try {
        const notification = new Notification(item.title, {
          body: item.body,
          icon: "/procurement-mark.png",
          tag: item.id,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          window.location.assign(`/api/notifications/${item.id}/open`);
        };
      } catch (cause) {
        console.warn("Could not show a browser notification", cause);
      }
    }
  }, [list.data?.items, permission, userId]);

  const enable = async (): Promise<NotificationPermission | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    const result = await Notification.requestPermission();
    notifyPermissionChange();

    if (result === "granted") {
      const newest = list.data?.items?.at(0);
      baseline.current = newest ? { id: newest.id, createdAt: newest.createdAt } : null;
    }

    return result;
  };

  return (
    <BrowserNotificationsContext.Provider
      value={{
        permission,
        supported: permission !== "unsupported" && permission !== "checking",
        enable,
      }}
    >
      {children}
    </BrowserNotificationsContext.Provider>
  );
};
