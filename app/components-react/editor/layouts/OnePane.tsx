import React, { useRef } from 'react';
import cx from 'classnames';
import useLayout, { LayoutProps } from './hooks';
import ResizeBar from 'components-react/root/ResizeBar';
import styles from './Layouts.m.less';

export function OnePane(p: React.PropsWithChildren<LayoutProps>) {
  const componentRef = useRef<HTMLDivElement>(null);

  const { mins, bars, resizes, calculateMax, setBar } = useLayout(
    componentRef.current,
    ['2', ['1', ['3', '4', '5']]],
    false,
    p.childrenMins,
    p.onTotalWidth,
  );

  return (
    <div className={cx(styles.columns, styles.sidePadded)} ref={componentRef}>
      <div style={{ width: `${100 - resizes.bar1 * 100}%` }} className={styles.cell}>
        {p.children!['2']}
      </div>
      <ResizeBar
        position="left"
        value={bars.bar1}
        onInput={(value: number) => setBar('bar1', value)}
        max={calculateMax(mins.rest)}
        min={mins.bar1}
      >
        <div
          className={styles.rows}
          style={{ width: `${resizes.bar1 * 100}%`, paddingTop: '16px' }}
        >
          <div className={styles.cell} style={{ height: '100%' }}>
            {p.children!['1']}
          </div>
          <div className={styles.segmented}>
            <div className={styles.cell}>{p.children!['3']}</div>
            <div className={styles.cell}>{p.children!['4']}</div>
            <div className={styles.cell}>{p.children!['5']}</div>
          </div>
        </div>
      </ResizeBar>
    </div>
  );
}
