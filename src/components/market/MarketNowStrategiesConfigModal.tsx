"use client";

import { ConfigPaneModal } from "@/components/config/ConfigPaneModal";
import { EvaluateStrategiesSettingsPanel } from "@/components/gestion/EvaluateStrategiesSettingsPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  configured?: boolean;
  onSaved?: (effectiveIds: string[]) => void;
};

export function MarketNowStrategiesConfigModal({
  open,
  onClose,
  configured = true,
  onSaved,
}: Props) {
  return (
    <ConfigPaneModal
      open={open}
      onClose={onClose}
      title="Estrategias a evaluar"
      subtitle="Config AWS · PRE · NOW · POST"
    >
      <EvaluateStrategiesSettingsPanel
        configured={configured}
        embedded
        onSaved={onSaved}
      />
    </ConfigPaneModal>
  );
}
