import React from 'react';
import { Services } from 'components-react/service-provider';
import { useVuex } from 'components-react/hooks';

// @@@ TODO: Refactor to use a module that extends the Source Selector Module for reactivity
// @@@ TODO: Refactor to expand this component to handle applying changes from updates to sources

export function DualOutputSourceSelector(p: {
  nodeId: string;
  toggleVisibility: (sceneNodeId: string) => void;
}) {
  const { DualOutputService, ScenesService } = Services;

  const v = useVuex(() => ({
    showDualOutputDisplays: DualOutputService.views.showDualOutputDisplays,
    horizontalNodeId: DualOutputService.views.getDisplayNodeId('horizontal', p.nodeId),
    verticalNodeId: DualOutputService.views.getDisplayNodeId('vertical', p.nodeId),
    isHorizontalVisible: DualOutputService.views.getDisplayNodeVisibility('horizontal', p.nodeId),
    isVerticalVisible: DualOutputService.views.getDisplayNodeVisibility('vertical', p.nodeId),
    // getSceneNode: ScenesService.views.getSceneNode,
  }));

  // function toggleVisibility(sceneId: string, sceneNodeId: string) {
  //   const selection = ScenesService.views.getScene(sceneId)?.getSelection(sceneNodeId);
  //   const visible = !selection?.isVisible();

  //   if (selection) {
  //     EditorCommandsService.actions.executeCommand('HideItemsCommand', selection, !visible);
  //   }
  // }

  return (
    <>
      {/* @@@ TODO: update font and font icons.*/}

      <i
        onClick={() => {
          p.toggleVisibility(v.horizontalNodeId);
        }}
        className={v.isVerticalVisible ? 'icon-phone-case' : 'icon-phone-case-hide'}
      />

      <i
        onClick={() => {
          p.toggleVisibility(v.verticalNodeId);
        }}
        className={v.isHorizontalVisible ? 'icon-desktop' : 'icon-desktop-hide'}
      />
    </>
  );
}
