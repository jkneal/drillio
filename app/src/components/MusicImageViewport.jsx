import { useEffect, useRef, useState } from 'react';
import { constrainImageView, zoomImageAt } from '../utils/imageViewportGeometry';

export default function MusicImageViewport({ src, alt, resetKey, annotationMode, onError,
  onTap, onDrawStart, onDrawMove, onDrawEnd, onDrawCancel, onDeleteHighlight, children }) {
  const viewportRef = useRef(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const moved = useRef(false);
  const pinched = useRef(false);
  const annotationTarget = useRef(null);
  const annotationStarted = useRef(false);
  const handlers = useRef(null);
  const previousLayout = useRef(null);
  const fit = Math.min(size.width / natural.width, size.height / natural.height);
  const image = { width: natural.width * fit, height: natural.height * fit };

  const updateView = next => {
    const bounded = constrainImageView(next, size, image);
    viewRef.current = bounded;
    setView(bounded);
  };
  const localPoint = e => {
    const rect = viewportRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const zoomAt = (zoom, anchor) => updateView(zoomImageAt(viewRef.current, zoom, anchor));
  const insideImage = point => {
    const current = viewRef.current;
    return point.x >= current.x && point.x <= current.x + image.width * current.zoom
      && point.y >= current.y && point.y <= current.y + image.height * current.zoom;
  };
  const beginGesture = () => {
    const points = [...pointers.current.values()];
    const point = points.length > 1 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
    gesture.current = { point, view: { ...viewRef.current }, distance: points.length > 1 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 0 };
  };

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const image = { width: natural.width * fit, height: natural.height * fit };
    const previous = previousLayout.current;
    let nextView = { zoom: 1, x: 0, y: 0 };
    if (previous && previous.resetKey === resetKey && previous.natural === natural) {
      const current = viewRef.current;
      const centerX = (previous.size.width / 2 - current.x) / (previous.image.width * current.zoom);
      const centerY = (previous.size.height / 2 - current.y) / (previous.image.height * current.zoom);
      nextView = { zoom: current.zoom, x: size.width / 2 - centerX * image.width * current.zoom, y: size.height / 2 - centerY * image.height * current.zoom };
    }
    const next = constrainImageView(nextView, size, image);
    previousLayout.current = { size, natural, image, resetKey };
    viewRef.current = next;
    setView(next);
    pointers.current.clear();
    gesture.current = null;
  }, [size, natural, fit, resetKey]);

  useEffect(() => {
    handlers.current = e => {
      e.preventDefault();
      e.stopPropagation();
      if (!loaded) return;
      onDrawCancel();
      zoomAt(viewRef.current.zoom * Math.exp(-e.deltaY * 0.002), localPoint(e));
    };
  });
  useEffect(() => {
    const viewport = viewportRef.current;
    const wheel = e => handlers.current?.(e);
    const preventNativeZoom = e => e.preventDefault();
    viewport.addEventListener('wheel', wheel, { passive: false });
    viewport.addEventListener('gesturestart', preventNativeZoom, { passive: false });
    viewport.addEventListener('gesturechange', preventNativeZoom, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', wheel);
      viewport.removeEventListener('gesturestart', preventNativeZoom);
      viewport.removeEventListener('gesturechange', preventNativeZoom);
    };
  }, []);

  const onPointerDown = e => {
    if (!loaded || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('button, input')) return;
    if (!pointers.current.size) {
      moved.current = false;
      pinched.current = false;
      annotationTarget.current = e.target.closest('[data-highlight-id]')?.getAttribute('data-highlight-id');
      annotationStarted.current = false;
    }
    const point = localPoint(e);
    pointers.current.set(e.pointerId, point);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size > 1) {
      moved.current = true;
      pinched.current = true;
      onDrawCancel();
    } else if (annotationMode === 'highlight' && insideImage(point)) {
      annotationStarted.current = true;
      onDrawStart(e);
    }
    beginGesture();
  };

  const onPointerMove = e => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, localPoint(e));
    const points = [...pointers.current.values()];
    const start = gesture.current;
    if (points.length > 1) {
      const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      updateView(zoomImageAt(start.view, start.view.zoom * distance / (start.distance || distance), start.point, midpoint));
    } else {
      const dx = points[0].x - start.point.x, dy = points[0].y - start.point.y;
      if (Math.hypot(dx, dy) > 6) moved.current = true;
      if (annotationMode === 'highlight' && !pinched.current && annotationStarted.current) onDrawMove(e);
      else if (moved.current) updateView({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
    }
  };

  const onPointerEnd = e => {
    if (!pointers.current.has(e.pointerId)) return;
    if (e.type === 'pointerup' && pointers.current.size === 1 && !pinched.current) {
      if (annotationMode === 'highlight') {
        if (!moved.current && annotationTarget.current) { onDrawCancel(); onDeleteHighlight(Number(annotationTarget.current)); }
        else if (annotationStarted.current) onDrawEnd(e);
      } else if (annotationMode === 'note' && !moved.current && insideImage(localPoint(e))) onTap(e);
    } else onDrawCancel();
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (pointers.current.size) beginGesture();
    else gesture.current = null;
  };

  return <div ref={viewportRef} className="music-image-viewport" tabIndex={0}
    aria-label="Music image. Pinch or scroll to zoom; drag to pan. Use plus, minus, or arrow keys."
    data-annotating={Boolean(annotationMode)}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd}
    onPointerCancel={onPointerEnd} onLostPointerCapture={onPointerEnd}
    onClickCapture={e => { if (moved.current && !e.target.closest('button, input')) { e.preventDefault(); e.stopPropagation(); } }}
    onKeyDown={e => {
      if (e.target !== e.currentTarget) return;
      if (['+', '=', '-'].includes(e.key)) {
        e.preventDefault();
        zoomAt(viewRef.current.zoom * (e.key === '-' ? 1 / 1.4 : 1.4), { x: size.width / 2, y: size.height / 2 });
      }
      const arrows = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] };
      if (arrows[e.key]) { e.preventDefault(); updateView({ ...viewRef.current, x: viewRef.current.x + arrows[e.key][0], y: viewRef.current.y + arrows[e.key][1] }); }
    }}>
    <div className="music-image-content" style={{ width: image.width, height: image.height,
      visibility: loaded ? 'visible' : 'hidden', transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
      <img src={src} alt={alt} draggable={false} onError={onError}
        onLoad={e => { setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight }); setLoaded(true); }} />
      {children}
    </div>
    {!loaded && <p className="music-image-loading" role="status">Loading music…</p>}
  </div>;
}
