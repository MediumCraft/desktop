import { PersistentStatefulService, InitAfter, Inject, ViewHandler, mutation } from 'services/core';
import {
  TDisplayPlatforms,
  TDualOutputPlatformSettings,
  DualOutputPlatformSettings,
  EDualOutputPlatform,
  TDualOutputDisplayType,
  IDualOutputPlatformSetting,
} from './dual-output-data';
import { ScenesService, SceneItem, IPartialSettings } from 'services/scenes';
import { TDisplayType, VideoSettingsService } from 'services/settings-v2/video';
import { StreamingService } from 'services/streaming';
import { SceneCollectionsService } from 'services/scene-collections';
import { TPlatform } from 'services/platforms';
import { Subject } from 'rxjs';

interface IDualOutputServiceState {
  convertedDefaultDisplay: TDisplayType;
  displays: TDisplayType[];
  platformSettings: TDualOutputPlatformSettings;
  dualOutputMode: boolean;
  nodeMaps: { [display in TDisplayType as string]: Dictionary<string> };
}

class DualOutputViews extends ViewHandler<IDualOutputServiceState> {
  @Inject() private scenesService: ScenesService;
  @Inject() private videoSettingsService: VideoSettingsService;
  @Inject() private streamingService: StreamingService;

  get dualOutputMode() {
    return this.state.dualOutputMode;
  }

  get convertedDefaultDisplay() {
    return this.state.convertedDefaultDisplay;
  }

  get platformSettings() {
    return this.state.platformSettings;
  }

  get platformSettingsList(): IDualOutputPlatformSetting[] {
    return Object.values(this.state.platformSettings);
  }

  get hasDualOutputScenes() {
    if (!this.state.nodeMaps) return false;
    for (const display in this.state.nodeMaps) {
      if (!this.state.nodeMaps.hasOwnProperty(display)) {
        return false;
      }
    }
    return true;
  }

  get showDualOutputDisplays() {
    return this.state.dualOutputMode && this.hasDualOutputScenes;
  }

  get dualOutputNodeIds() {
    return this.getNodeIds(['vertical']);
  }

  get displays() {
    return this.state.displays;
  }

  get activeDisplayPlatforms() {
    const enabledPlatforms = this.streamingService.views.enabledPlatforms;
    return Object.entries(this.state.platformSettings).reduce(
      (displayPlatforms: TDisplayPlatforms, [key, val]: [string, IDualOutputPlatformSetting]) => {
        if (val && enabledPlatforms.includes(val.platform)) {
          displayPlatforms[val.display].push(val.platform);
        }
        return displayPlatforms;
      },
      { horizontal: [], vertical: [] },
    );
  }

  get nodeMaps() {
    return this.state.nodeMaps;
  }

  getNodeIds(displays: TDisplayType[]) {
    return displays.reduce((ids: string[], display: TDisplayType) => {
      const nodeMap = this.state.nodeMaps[display];
      const aggregatedIds = Object.values(nodeMap).concat(ids);

      return aggregatedIds;
    }, []);
  }

  getPlatformDisplay(platform: TPlatform) {
    return this.state.platformSettings[platform].display;
  }

  getPlatformContext(platform: TPlatform) {
    const display = this.getPlatformDisplay(platform);
    return this.videoSettingsService.contexts[display];
  }

  getPlatformContextData(platform: TPlatform) {
    const display = this.getPlatformDisplay(platform);
    return {
      display,
      displayId: display === 'vertical' ? 1 : 0,
    };
  }

  getDisplayNodeMap(display: TDisplayType) {
    return this.state.nodeMaps[display];
  }

  getDisplayNodeId(display: TDisplayType, defaultNodeId: string) {
    return this.state.nodeMaps[display][defaultNodeId];
  }

  getDisplayNodeVisibility(display: TDisplayType, defaultNodeId: string) {
    const nodeId = this.getDisplayNodeId(display, defaultNodeId);
    return this.scenesService.views.getNodeVisibility(nodeId);
  }

  getDualOutputNodeIds(sceneItemId: string) {
    return [
      this.state.nodeMaps['horizontal'][sceneItemId],
      this.state.nodeMaps['vertical'][sceneItemId],
    ];
  }
}

@InitAfter('UserService')
@InitAfter('ScenesService')
@InitAfter('SceneCollectionsService')
@InitAfter('VideoSettingsService')
export class DualOutputService extends PersistentStatefulService<IDualOutputServiceState> {
  @Inject() private scenesService: ScenesService;
  @Inject() private sceneCollectionsService: SceneCollectionsService;
  @Inject() private videoSettingsService: VideoSettingsService;
  @Inject() private streamingService: StreamingService;

  static defaultState: IDualOutputServiceState = {
    convertedDefaultDisplay: 'horizontal',
    displays: ['horizontal', 'vertical'],
    platformSettings: DualOutputPlatformSettings,
    dualOutputMode: false,
    nodeMaps: null,
  };

  sceneItemsDestroyed = new Subject();

  get views() {
    return new DualOutputViews(this.state);
  }

  init() {
    super.init();

    this.sceneCollectionsService.collectionInitialized.subscribe(() => {
      if (this.state.dualOutputMode) {
        this.mapSceneNodes(this.state.displays);
      }
    });

    this.scenesService.sceneRemoved.subscribe(() => {
      if (this.state.dualOutputMode) {
        this.setDualOutputMode(false);
      }
    });

    this.scenesService.sceneSwitched.subscribe(() => {
      if (this.state.dualOutputMode && this.views.hasDualOutputScenes) {
        this.restoreScene(this.state.convertedDefaultDisplay);
        this.mapSceneNodes(this.state.displays, this.scenesService.views.activeSceneId);
      }
    });
  }

  /**
   * Create/destroy nodes for dual output when toggling on/off
   */

  async toggleDualOutputMode(status: boolean) {
    if (!this.scenesService.views.hasSceneItems(this.scenesService.views.activeSceneId)) {
      this.state.displays.forEach(async display => {
        this.videoSettingsService.establishVideoContext(display);
        this.SET_EMPTY_NODE_MAP(display);
      });

      this.setDualOutputMode(status);
      return true;
    }

    try {
      if (!status) {
        this.restoreScene(this.state.convertedDefaultDisplay);
        this.setDualOutputMode(status);
        return true;
      } else {
        const created = this.mapSceneNodes(this.state.displays);
        if (created) {
          this.setDualOutputMode(status);
          return true;
        }
      }
      return false;
    } catch (error: unknown) {
      console.error('Error toggling Dual Output mode: ', error);
      return false;
    }
  }

  setDualOutputMode(status: boolean) {
    this.TOGGLE_DUAL_OUTPUT_MODE(status);
    this.streamingService.actions.setDualOutputMode(!this.streamingService.state.dualOutputMode);
  }

  mapSceneNodes(displays: TDisplayType[], sceneId?: string) {
    const sceneToMapId = sceneId ?? this.scenesService.views.activeSceneId;
    return displays.reduce((created: boolean, display: TDisplayType, index) => {
      const isFirstDisplay = index === 0;
      this.videoSettingsService.establishVideoContext(display);
      const nodesCreated = this.createOutputNodes(sceneToMapId, display, isFirstDisplay);
      if (!nodesCreated) {
        created = false;
      }
      return created;
    }, true);
  }

  createOutputNodes(sceneId: string, display: TDisplayType, isFirstDisplay: boolean) {
    const sceneNodes = this.scenesService.views.getSceneItemsBySceneId(sceneId);
    if (!sceneNodes) return false;
    return sceneNodes.reduce((created: boolean, sceneItem: SceneItem) => {
      const nodeCreatedId = this.createOrAssignOutputNode(
        sceneItem,
        display,
        isFirstDisplay,
        sceneId,
      );
      if (!nodeCreatedId) {
        created = false;
      }
      return created;
    }, true);
  }

  createOrAssignOutputNode(
    sceneItem: SceneItem,
    display: TDisplayType,
    isFirstDisplay: boolean,
    sceneId?: string,
  ) {
    if (isFirstDisplay) {
      // if it's the first display, just assign the scene item's output to a context
      const context = this.videoSettingsService.contexts[display];

      if (!context) return null;

      sceneItem.setSettings({ output: context }, display);

      // in preparation for unlimited display profiles
      // create a node map entry even though the key and value are the same
      this.SET_NODE_MAP_ITEM(display, sceneItem.id, sceneItem.id);
      return sceneItem.id;
    } else {
      // if it's not the first display, copy the scene item
      const scene = this.scenesService.views.getScene(sceneId);
      const copiedSceneItem = scene.addSource(sceneItem.sourceId);
      const context = this.videoSettingsService.contexts[display];

      if (!copiedSceneItem || !context) return null;

      const settings: IPartialSettings = { ...sceneItem.getSettings(), output: context };
      copiedSceneItem.setSettings(settings, display);

      this.SET_NODE_MAP_ITEM(display, sceneItem.id, copiedSceneItem.id);
      return sceneItem.id;
    }
  }

  restoreScene(display: TDisplayType) {
    if (this.state.nodeMaps) {
      const nodesMap = this.state.nodeMaps[display];
      const nodesToReassign = Object.keys(nodesMap);

      const sceneNodes = this.scenesService.views.getSceneItemsBySceneId(
        this.scenesService.views.activeSceneId,
      );

      const defaultContext = this.videoSettingsService.contexts.default;

      sceneNodes.forEach((sceneItem: SceneItem) => {
        if (nodesToReassign.includes(sceneItem.id)) {
          const setting: IPartialSettings = { output: defaultContext };
          sceneItem.setSettings(setting, display);
        } else {
          sceneItem.remove();
        }
      });
    }

    this.videoSettingsService.resetToDefaultContext();

    this.state.nodeMaps = null;
  }

  /**
   * Helper functions for adding and removing scene items in dual output mode
   */

  removeDualOutputNodes(nodeId: string) {
    this.REMOVE_DUAL_OUTPUT_NODES(nodeId);
  }

  restoreNodesToMap(sceneItemId: string, nodeData: { id: string; display: TDisplayType }[]) {
    nodeData.forEach(node => {
      this.SET_NODE_MAP_ITEM(node.display, sceneItemId, node.id);
    });
  }

  /**
   * Settings for platforms to displays
   */

  updatePlatformSetting(platform: EDualOutputPlatform | string, display: TDualOutputDisplayType) {
    this.UPDATE_PLATFORM_SETTING(platform, display);
  }

  @mutation()
  private UPDATE_PLATFORM_SETTING(
    platform: EDualOutputPlatform | string,
    display: TDualOutputDisplayType,
  ) {
    this.state.platformSettings[platform] = {
      ...this.state.platformSettings[platform],
      display,
    };
  }

  @mutation()
  private TOGGLE_DUAL_OUTPUT_MODE(status: boolean) {
    this.state.dualOutputMode = status;
  }

  @mutation()
  private SET_EMPTY_NODE_MAP(display: TDisplayType) {
    if (!this.state.nodeMaps) {
      this.state.nodeMaps = {};
    }
    this.state.nodeMaps[display] = {};
  }

  @mutation()
  private SET_NODE_MAP_ITEM(
    display: TDisplayType,
    originalSceneNodeId: string,
    copiedSceneNodeId: string,
  ) {
    if (!this.state.nodeMaps) {
      this.state.nodeMaps = {};
    }
    this.state.nodeMaps[display] = {
      ...this.state.nodeMaps[display],
      [originalSceneNodeId]: copiedSceneNodeId,
    };
  }

  @mutation()
  private REMOVE_DUAL_OUTPUT_NODES(nodeId: string) {
    // remove nodes from scene

    let newMap = {};
    for (const display in this.state.nodeMaps) {
      newMap = {
        ...newMap,
        [display]: Object.entries(this.state.nodeMaps[display]).filter(
          ([key, val]) => key !== nodeId,
        ),
      };
    }
    this.state.nodeMaps = newMap;
  }
}
