'use client';
import { Button, ButtonProps, Tooltip, useToast } from '@chakra-ui/react';
import { LockIcon } from '@chakra-ui/icons';

interface PlanGatedButtonProps extends ButtonProps {
  enabled: boolean;
  upgradeMessage: string;
}

// A Button that's only usable on certain plans — full-strength and normal when `enabled`,
// dimmed with a lock icon and a tooltip when not, showing an upgrade toast instead of
// running `onClick`. Used for features gated purely on the frontend (no dedicated API
// endpoint to check a plan against) — see PlanLimits.csvImportEnabled/dataImportEnabled/
// dataExportEnabled in api/src/lib/planLimits.ts for why those specific flags work this way.
export function PlanGatedButton({ enabled, upgradeMessage, onClick, leftIcon, children, ...rest }: PlanGatedButtonProps) {
  const toast = useToast();

  return (
    <Tooltip label={upgradeMessage} isDisabled={enabled}>
      <Button
        {...rest}
        leftIcon={enabled ? leftIcon : <LockIcon boxSize={3} />}
        opacity={enabled ? 1 : 0.6}
        onClick={(e) => {
          if (enabled) {
            onClick?.(e);
          } else {
            toast({ title: 'Upgrade required', description: upgradeMessage, status: 'info', duration: 4000, isClosable: true });
          }
        }}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
