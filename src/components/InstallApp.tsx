import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIsInstalled(standalone || iosStandalone === true);

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const install = async () => {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void install()}
        aria-label="Install A to Z on this device"
        title="Install app"
      >
        <Download aria-hidden="true" />
        <span className="hidden sm:inline">Install app</span>
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Install A to Z</DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-left leading-6">
              <span className="block">
                On iPhone or iPad, open the browser Share menu and choose “Add to Home Screen”.
              </span>
              <span className="block">
                On Android, open the browser menu and choose “Install app” or “Add to Home screen”.
              </span>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}