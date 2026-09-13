export const MAX_IMAGE_ZOOM = 16;

export function constrainImageView(view, viewport, image) {
  const zoom = Math.max(1, Math.min(MAX_IMAGE_ZOOM, view.zoom));
  const width = image.width * zoom, height = image.height * zoom;
  return {
    zoom,
    x: width <= viewport.width ? (viewport.width - width) / 2 : Math.min(0, Math.max(viewport.width - width, view.x)),
    y: height <= viewport.height ? (viewport.height - height) / 2 : Math.min(0, Math.max(viewport.height - height, view.y)),
  };
}

export function zoomImageAt(view, zoom, anchor, destination = anchor) {
  const nextZoom = Math.max(1, Math.min(MAX_IMAGE_ZOOM, zoom));
  const ratio = nextZoom / view.zoom;
  return {
    zoom: nextZoom,
    x: destination.x - (anchor.x - view.x) * ratio,
    y: destination.y - (anchor.y - view.y) * ratio,
  };
}
