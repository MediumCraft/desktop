import React, { CSSProperties, PropsWithChildren, HTMLAttributes } from 'react';
import { Tooltip as AntdTooltip } from 'antd';
import styles from './Tooltip.m.less';
import cx from 'classnames';

type TTipPosition =
  | 'topLeft'
  | 'top'
  | 'topRight'
  | 'leftTop'
  | 'left'
  | 'leftBottom'
  | 'bottomLeft'
  | 'bottom'
  | 'bottomRight'
  | 'rightTop'
  | 'right'
  | 'rightBottom';

interface ITooltipTipProps {
  title: string;
  className?: HTMLAttributes<HTMLElement> | string;
  style?: CSSProperties;
  lightShadow?: boolean;
  placement?: TTipPosition;
  content?: HTMLElement | boolean;
  disabled?: boolean;
}

export default function Tooltip(props: PropsWithChildren<ITooltipTipProps>) {
  const { title, className, style, lightShadow, placement = 'bottom', content, disabled } = props;

  return (
    <div className={cx(styles.tooltipWrapper, className)}>
      <div className={cx(styles.tooltipArrow)} />
      {disabled ? (
        <>
          {content}
          {{ ...props }.children}
        </>
      ) : (
        <AntdTooltip
          className={cx({ [styles.lightShadow]: lightShadow })}
          placement={placement}
          title={title}
          style={style}
          getPopupContainer={triggerNode => triggerNode}
          mouseLeaveDelay={0.3}
          trigger={['hover', 'focus', 'click']}
        >
          {content}
          {{ ...props }.children}
        </AntdTooltip>
      )}
    </div>
  );
}
