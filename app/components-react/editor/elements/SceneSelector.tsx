import React, { useState, useRef, useMemo } from 'react';
import cx from 'classnames';
import { Dropdown, Tooltip as AntdTooltip, Tree, message } from 'antd';
import Tooltip from 'components-react/shared/Tooltip';
import { DownOutlined } from '@ant-design/icons';
import * as remote from '@electron/remote';
import { Menu } from 'util/menus/Menu';
import { getOS } from 'util/operating-systems';
import { Services } from 'components-react/service-provider';
import { useVuex } from 'components-react/hooks';
import HelpTip from 'components-react/shared/HelpTip';
import Scrollable from 'components-react/shared/Scrollable';
import { useTree, IOnDropInfo } from 'components-react/hooks/useTree';
import { $t } from 'services/i18n';
import { EDismissable } from 'services/dismissables';
import { ERenderingMode } from '../../../../obs-api';
import styles from './SceneSelector.m.less';
import useBaseElement from './hooks';
import { IScene } from 'services/scenes';
import { ISceneCollectionsManifestEntry } from 'services/scene-collections';

function SceneSelector() {
  const {
    ScenesService,
    SceneCollectionsService,
    TransitionsService,
    SourceFiltersService,
    ProjectorService,
    EditorCommandsService,
    StreamingService,
    DualOutputService,
  } = Services;

  const v = useVuex(() => ({
    isHorizontal: DualOutputService.views.activeDisplays.horizontal,
    isVertical: DualOutputService.views.activeDisplays.vertical,
    toggleDisplay: DualOutputService.actions.toggleDisplay,
    studioMode: TransitionsService.views.studioMode,
    isMidStreamMode: StreamingService.views.isMidStreamMode,
    showDualOutput: DualOutputService.views.dualOutputMode,
    selectiveRecording: StreamingService.state.selectiveRecording,
  }));

  const { treeSort } = useTree(true);

  const [showDropdown, setShowDropdown] = useState(false);
  const { scenes, activeSceneId, activeScene, collections, activeCollection } = useVuex(() => ({
    scenes: ScenesService.views.scenes.map(scene => ({
      title: <TreeNode scene={scene} removeScene={removeScene} />,
      key: scene.id,
      selectable: true,
      isLeaf: true,
    })),
    activeScene: ScenesService.views.activeScene,
    activeSceneId: ScenesService.views.activeSceneId,
    activeCollection: SceneCollectionsService.activeCollection,
    collections: SceneCollectionsService.collections,
  }));

  const horizontalTooltip = useMemo(
    () => (v.isHorizontal ? $t('Hide horizontal display.') : $t('Show horizontal display.')),
    [v.isHorizontal],
  );

  const verticalTooltip = useMemo(
    () => (v.isVertical ? $t('Hide vertical display.') : $t('Show vertical display.')),
    [v.isVertical],
  );

  function showContextMenu(info: { event: React.MouseEvent }) {
    info.event.preventDefault();
    info.event.stopPropagation();
    const menu = new Menu();
    menu.append({
      label: $t('Duplicate'),
      click: () => ScenesService.actions.showDuplicateScene(activeSceneId),
    });
    menu.append({
      label: $t('Rename'),
      click: () => ScenesService.actions.showNameScene({ rename: activeSceneId }),
    });
    menu.append({
      label: $t('Remove'),
      click: () => removeScene(activeScene),
    });
    menu.append({
      label: $t('Filters'),
      click: () => SourceFiltersService.actions.showSourceFilters(activeSceneId),
    });
    menu.append({
      label: $t('Create Scene Projector'),
      click: () =>
        ProjectorService.actions.createProjector(ERenderingMode.OBS_MAIN_RENDERING, activeSceneId),
    });
    menu.popup();
  }

  function makeActive(selectedKeys: string[]) {
    ScenesService.actions.makeSceneActive(selectedKeys[0]);
  }

  function handleSort(info: IOnDropInfo) {
    const newState = treeSort(info, scenes);
    ScenesService.actions.setSceneOrder(newState.map(node => node.key as string));
  }

  function addScene() {
    ScenesService.actions.showNameScene();
  }

  function showTransitions() {
    TransitionsService.actions.showSceneTransitions();
  }

  function manageCollections() {
    SceneCollectionsService.actions.showManageWindow();
  }

  function removeScene(scene: IScene | null) {
    if (!scene) return;
    const name = scene.name;
    remote.dialog
      .showMessageBox(remote.getCurrentWindow(), {
        title: 'Streamlabs Desktop',
        type: 'warning',
        message: $t('Are you sure you want to remove %{sceneName}?', { sceneName: name }),
        buttons: [$t('Cancel'), $t('OK')],
      })
      .then(({ response }) => {
        if (!response) return;
        if (!ScenesService.canRemoveScene()) {
          remote.dialog.showMessageBox({
            title: 'Streamlabs Desktop',
            message: $t('There needs to be at least one scene.'),
          });
          return;
        }

        EditorCommandsService.actions.executeCommand('RemoveSceneCommand', scene.id);
      });
  }

  function loadCollection(id: string) {
    if (SceneCollectionsService.getCollection(id)?.operatingSystem !== getOS()) return;

    SceneCollectionsService.actions.load(id);
    setShowDropdown(false);
  }

  function showStudioModeErrorMessage() {
    message.error({
      content: $t('Cannot toggle dual output in Studio Mode.'),
      className: styles.toggleError,
    });
  }

  function showToggleDisplayErrorMessage() {
    message.error({
      content: $t('Cannot change displays while live.'),
      className: styles.toggleError,
    });
  }

  function showSelectiveRecordingMessage() {
    message.error({
      content: $t('Selective Recording can only be used with horizontal sources.'),
      className: styles.toggleError,
    });
  }

  const DropdownMenu = (
    <div className={cx(styles.dropdownContainer, 'react')}>
      <div className={styles.dropdownItem} onClick={manageCollections} style={{ marginTop: '6px' }}>
        <i className="icon-edit" style={{ marginRight: '6px' }} />
        {$t('Manage Scene Collections')}
      </div>
      <hr style={{ borderColor: 'var(--border)' }} />
      <span className={styles.whisper}>{$t('Your Scene Collections')}</span>
      <Scrollable style={{ height: 'calc(100% - 60px)' }}>
        {collections.map(collection => (
          <div
            key={collection.id}
            onClick={() => loadCollection(collection.id)}
            className={cx(styles.dropdownItem, {
              [styles.osMismatch]: getOS() !== collection.operatingSystem,
            })}
            data-name={collection.name}
          >
            <i
              className={cx(
                'fab',
                collection.operatingSystem === 'win32' ? 'fa-windows' : 'fa-apple',
              )}
            />
            {collection.name}
          </div>
        ))}
      </Scrollable>
    </div>
  );

  return (
    <>
      <div className={styles.topContainer} id="sceneSelector">
        <Dropdown
          overlay={DropdownMenu}
          trigger={['click']}
          getPopupContainer={() => document.getElementById('sceneSelector')!}
          visible={showDropdown}
          onVisibleChange={setShowDropdown}
          placement="bottomLeft"
        >
          <span className={styles.activeSceneContainer} data-name="SceneSelectorDropdown">
            <DownOutlined style={{ marginRight: '4px' }} />
            <span className={styles.activeScene}>{activeCollection?.name}</span>
          </span>
        </Dropdown>
        <AntdTooltip title={$t('Add a new Scene.')} placement="bottomLeft">
          <i className="icon-add-circle icon-button icon-button--lg" onClick={addScene} />
        </AntdTooltip>

        {v.showDualOutput && (
          <Tooltip
            id="toggle-horizontal-tooltip"
            title={horizontalTooltip}
            className={styles.displayToggle}
            placement="bottomRight"
          >
            <i
              id="horizontal-display-toggle"
              onClick={() => {
                if (v.isMidStreamMode) {
                  showToggleDisplayErrorMessage();
                } else if (v.studioMode && v.isVertical) {
                  showStudioModeErrorMessage();
                } else {
                  v.toggleDisplay(!v.isHorizontal, 'horizontal');
                }
              }}
              className={cx('icon-desktop icon-button icon-button--lg', {
                active: v.isHorizontal,
              })}
            />
          </Tooltip>
        )}

        {v.showDualOutput && (
          <Tooltip
            id="toggle-vertical-tooltip"
            title={verticalTooltip}
            className={styles.displayToggle}
            placement="bottomRight"
            disabled={v.selectiveRecording}
          >
            <i
              id="vertical-display-toggle"
              onClick={() => {
                if (v.isMidStreamMode) {
                  showToggleDisplayErrorMessage();
                } else if (v.studioMode && v.isHorizontal) {
                  showStudioModeErrorMessage();
                } else if (v.selectiveRecording) {
                  showSelectiveRecordingMessage();
                } else {
                  v.toggleDisplay(!v.isVertical, 'vertical');
                }
              }}
              className={cx('icon-phone-case icon-button icon-button--lg', {
                active: v.isVertical && !v.selectiveRecording,
                disabled: v.selectiveRecording,
              })}
            />
          </Tooltip>
        )}

        <AntdTooltip title={$t('Edit Scene Transitions.')} placement="bottomRight">
          <i className="icon-transition icon-button icon-button--lg" onClick={showTransitions} />
        </AntdTooltip>
      </div>
      <Scrollable style={{ height: '100%' }} className={styles.scenesContainer}>
        <Tree
          draggable
          treeData={scenes}
          onDrop={handleSort}
          onSelect={makeActive}
          onRightClick={showContextMenu}
          selectedKeys={[activeSceneId]}
        />
      </Scrollable>
      <HelpTip
        title={$t('Scene Collections')}
        dismissableKey={EDismissable.SceneCollectionsHelpTip}
        position={{ top: '-8px', left: '102px' }}
      >
        <div>
          {$t(
            'This is where your Scene Collections live. Clicking the title will dropdown a menu where you can view & manage.',
          )}
        </div>
      </HelpTip>
    </>
  );
}

function TreeNode(p: { scene: IScene; removeScene: (scene: IScene) => void }) {
  return (
    <div className={styles.sourceTitleContainer} data-name={p.scene.name} data-role="scene">
      <span className={styles.sourceTitle}>{p.scene.name}</span>
      <AntdTooltip title={$t('Remove Scene.')} placement="left">
        <i onClick={() => p.removeScene(p.scene)} className="icon-trash" />
      </AntdTooltip>
    </div>
  );
}

export default function SceneSelectorElement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { renderElement } = useBaseElement(
    <SceneSelector />,
    { x: 200, y: 120 },
    containerRef.current,
  );

  return (
    <div
      ref={containerRef}
      data-name="SceneSelector"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {renderElement()}
    </div>
  );
}
