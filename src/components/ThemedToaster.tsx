import { Toaster } from "sonner";
import { useTheme } from "../context/theme";

/** Toasts follow the theme and sit above the mobile "View Cart" bar. */
export function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      theme={theme}
      gap={10}
      mobileOffset={{ bottom: 96 }}
      toastOptions={{
        classNames: {
          toast: "bg-ink-800! border-edge/10! text-cream! rounded-2xl! font-sans! shadow-2xl!",
          title: "font-semibold!",
          description: "text-cream/55!",
          actionButton: "bg-brand! text-coal! font-semibold! rounded-full! px-3!",
          cancelButton: "bg-edge/10! text-cream! rounded-full! px-3!",
        },
      }}
    />
  );
}
