import React, { useMemo } from 'react';
import { Services } from 'components-react/service-provider';
import { useVuex } from 'components-react/hooks';
import { useModule } from 'slap';
import { SourceSelectorModule } from './SourceSelector';

interface IDualOutputSourceSelector {
  nodeId: string;
}
export function DualOutputSourceSelector(p: IDualOutputSourceSelector) {
  const {
    toggleVisibility,
    makeActive,
    horizontalActive,
    verticalActive,
    isDualOutputLoading,
  } = useModule(SourceSelectorModule);
  const { DualOutputService } = Services;

  const v = useVuex(() => ({
    verticalNodeId:
      DualOutputService.views.verticalNodeIds && horizontalActive
        ? DualOutputService.views.activeSceneNodeMap[p.nodeId]
        : p.nodeId,
    isHorizontalVisible: DualOutputService.views.getIsHorizontalVisible(p.nodeId),
    isVerticalVisible: DualOutputService.views.getIsVerticalVisible(p.nodeId),
  }));

  const showHorizontalToggle = useMemo(() => {
    return !isDualOutputLoading && horizontalActive;
  }, [!isDualOutputLoading, horizontalActive]);

  const showVerticalToggle = useMemo(() => {
    return !isDualOutputLoading && v?.verticalNodeId && verticalActive;
  }, [!isDualOutputLoading, v?.verticalNodeId, verticalActive]);

  return (
    <>
      {showHorizontalToggle && (
        <i
          onClick={() => {
            toggleVisibility(p.nodeId);
            makeActive(p.nodeId);
          }}
          className={`${
            v.isHorizontalVisible ? 'icon-desktop' : 'icon-desktop-hide'
          } horizontal-source-icon`}
        />
      )}

      {showVerticalToggle && (
        <i
          onClick={() => {
            toggleVisibility(v.verticalNodeId);
            makeActive(v.verticalNodeId);
          }}
          className={`${
            v.isVerticalVisible ? 'icon-phone-case' : 'icon-phone-case-hide'
          } vertical-source-icon`}
        />
      )}
    </>
  );
}
