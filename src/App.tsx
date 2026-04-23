import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { boardConfig, applyTableLayout, type RodConfig, type SerializableScene } from './boardConfig';
import { BoardCanvas } from './components/BoardCanvas';
import { BoardMenu } from './components/BoardMenu';
import { TableConfigForm } from './components/TableConfigForm';
import { clamp, decodeScene, encodeScene, type Point } from './geometry';
import { buildFigureRenderMetrics } from './lib/figureRenderModel';
import { buildRodMotionBounds, getMaxRodExtension, getRodGeometry } from './lib/rodLayout';
import { buildTableLayoutFromDraft, defaultTableDraft, type StoredTableLayout, type SvgLayerData, type TableDraft } from './lib/tableLayout';
import { getSerializableScene, useBoardStore } from './store/boardStore';

type DragState =
  | {
      kind: 'ball';
      pointerId: number;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: 'rod';
      pointerId: number;
      rodId: RodConfig['id'];
      offsetY: number;
    }
  | null;

type FigureStateKey = 'unten' | 'nachVorn' | 'nachHinten';

type FigurePlacement = {
  bounds: {
    width: number;
    height: number;
  };
  anchor: {
    x: number;
    y: number;
  };
  anchorBounds?: {
    width: number;
    height: number;
  };
};

function pointFromEvent(event: Pick<React.PointerEvent, 'clientX' | 'clientY'>, svg: SVGSVGElement | null): Point {
  if (!svg) {
    return { x: 0, y: 0 };
  }

  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * boardConfig.width,
    y: ((event.clientY - rect.top) / rect.height) * boardConfig.height,
  };
}

function findMatchingOption(options: string[], terms: string[], fallbackIndex = 0) {
  const normalizedTerms = terms.map((term) => term.toLowerCase());
  return (
    options.find((option) => normalizedTerms.some((term) => option.toLowerCase().includes(term))) ||
    options[fallbackIndex] ||
    ''
  );
}

function findMatchingGeometry(options: string[], terms: string[]) {
  return findMatchingOption(options, terms, 0);
}

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type SvgTransform = {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
};

function getSvgNodeName(node: Element, fallback: string) {
  const namespacedLabel =
    node.getAttribute('inkscape:label') ||
    node.getAttribute('sodipodi:label') ||
    Array.from(node.attributes).find((attribute) => attribute.localName.toLowerCase() === 'label')?.value ||
    '';

  return (namespacedLabel || node.getAttribute('label') || node.getAttribute('id') || fallback).trim();
}

function mergeBounds(current: Bounds | null, next: Bounds | null): Bounds | null {
  if (!current) {
    return next;
  }

  if (!next) {
    return current;
  }

  return {
    minX: Math.min(current.minX, next.minX),
    minY: Math.min(current.minY, next.minY),
    maxX: Math.max(current.maxX, next.maxX),
    maxY: Math.max(current.maxY, next.maxY),
  };
}

function parseSvgTransform(transform: string | null): SvgTransform {
  const parsed: SvgTransform = { tx: 0, ty: 0, sx: 1, sy: 1 };

  if (!transform) {
    return parsed;
  }

  const translateMatch = transform.match(/translate\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/i);
  if (translateMatch) {
    parsed.tx = Number(translateMatch[1]) || 0;
    parsed.ty = Number(translateMatch[2]) || 0;
  }

  const scaleMatch = transform.match(/scale\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/i);
  if (scaleMatch) {
    parsed.sx = Number(scaleMatch[1]) || 1;
    parsed.sy = Number(scaleMatch[2]) || parsed.sx;
  }

  const matrixMatch = transform.match(/matrix\(([-\d., eE]+)\)/i);
  if (matrixMatch) {
    const values = matrixMatch[1]
      .split(/[ ,]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (values.length === 6) {
      parsed.sx *= values[0] || 1;
      parsed.sy *= values[3] || 1;
      parsed.tx += values[4] || 0;
      parsed.ty += values[5] || 0;
    }
  }

  return parsed;
}

function combineSvgTransforms(parent: SvgTransform, child: SvgTransform): SvgTransform {
  return {
    sx: parent.sx * child.sx,
    sy: parent.sy * child.sy,
    tx: parent.tx + child.tx * parent.sx,
    ty: parent.ty + child.ty * parent.sy,
  };
}

function applyTransformToBounds(bounds: Bounds | null, transform: SvgTransform): Bounds | null {
  if (!bounds) {
    return null;
  }

  const x1 = bounds.minX * transform.sx + transform.tx;
  const x2 = bounds.maxX * transform.sx + transform.tx;
  const y1 = bounds.minY * transform.sy + transform.ty;
  const y2 = bounds.maxY * transform.sy + transform.ty;

  return {
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
  };
}

function createBoundsFromPairs(values: number[]): Bounds | null {
  if (values.length < 2) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < values.length - 1; index += 2) {
    const x = values[index];
    const y = values[index + 1];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

function getNodeBounds(node: Element, inheritedTransform: SvgTransform = { tx: 0, ty: 0, sx: 1, sy: 1 }): Bounds | null {
  const tagName = node.tagName.toLowerCase();
  const currentTransform = combineSvgTransforms(inheritedTransform, parseSvgTransform(node.getAttribute('transform')));

  if (tagName === 'g' || tagName === 'svg') {
    return Array.from(node.children).reduce<Bounds | null>(
      (accumulator, child) => mergeBounds(accumulator, getNodeBounds(child as Element, currentTransform)),
      null,
    );
  }

  if (tagName === 'rect') {
    const x = Number(node.getAttribute('x') || 0);
    const y = Number(node.getAttribute('y') || 0);
    const width = Number(node.getAttribute('width') || 0);
    const height = Number(node.getAttribute('height') || 0);
    return applyTransformToBounds({ minX: x, minY: y, maxX: x + width, maxY: y + height }, currentTransform);
  }

  if (tagName === 'circle') {
    const cx = Number(node.getAttribute('cx') || 0);
    const cy = Number(node.getAttribute('cy') || 0);
    const r = Number(node.getAttribute('r') || 0);
    return applyTransformToBounds({ minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r }, currentTransform);
  }

  if (tagName === 'ellipse') {
    const cx = Number(node.getAttribute('cx') || 0);
    const cy = Number(node.getAttribute('cy') || 0);
    const rx = Number(node.getAttribute('rx') || 0);
    const ry = Number(node.getAttribute('ry') || 0);
    return applyTransformToBounds({ minX: cx - rx, minY: cy - ry, maxX: cx + rx, maxY: cy + ry }, currentTransform);
  }

  if (tagName === 'line') {
    const x1 = Number(node.getAttribute('x1') || 0);
    const y1 = Number(node.getAttribute('y1') || 0);
    const x2 = Number(node.getAttribute('x2') || 0);
    const y2 = Number(node.getAttribute('y2') || 0);
    return applyTransformToBounds({ minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) }, currentTransform);
  }

  if (tagName === 'polygon' || tagName === 'polyline') {
    const points = (node.getAttribute('points') || '')
      .trim()
      .split(/\s+|,/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return applyTransformToBounds(createBoundsFromPairs(points), currentTransform);
  }

  if (tagName === 'path') {
    const numbers = ((node.getAttribute('d') || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return applyTransformToBounds(createBoundsFromPairs(numbers), currentTransform);
  }

  return null;
}

function getRenderedSvgBounds(root: Element): Bounds | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '-10000px';
  host.style.width = '1px';
  host.style.height = '1px';
  host.style.opacity = '0';
  host.style.pointerEvents = 'none';

  const measurementRoot = (root.cloneNode(true) as Element);
  revealSvgNode(measurementRoot);

  const svgRoot = measurementRoot.tagName.toLowerCase() === 'svg'
    ? (measurementRoot as SVGSVGElement)
    : (() => {
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        wrapper.appendChild(measurementRoot);
        return wrapper;
      })();

  const normalizedViewBox = svgRoot.getAttribute('viewBox') || svgRoot.getAttribute('viewbox');
  if (normalizedViewBox) {
    svgRoot.setAttribute('viewBox', normalizedViewBox);
  }
  svgRoot.setAttribute('width', '1000');
  svgRoot.setAttribute('height', '1000');

  host.appendChild(svgRoot);
  document.body.appendChild(host);

  const selectors = 'g, path, rect, circle, ellipse, polygon, polyline, line, use';
  const bounds = Array.from(svgRoot.querySelectorAll(selectors)).reduce<Bounds | null>((accumulator, element) => {
    if (element.closest('defs, marker, clipPath, mask, pattern, symbol')) {
      return accumulator;
    }

    try {
      const box = (element as SVGGraphicsElement).getBBox();
      if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || (box.width === 0 && box.height === 0)) {
        return accumulator;
      }

      return mergeBounds(accumulator, {
        minX: box.x,
        minY: box.y,
        maxX: box.x + box.width,
        maxY: box.y + box.height,
      });
    } catch {
      return accumulator;
    }
  }, null);

  document.body.removeChild(host);
  return bounds;
}

function revealSvgNode(node: Element) {
  node.removeAttribute('display');
  node.removeAttribute('visibility');
  node.removeAttribute('hidden');
  node.setAttribute('opacity', '1');

  const style = node.getAttribute('style');
  if (style) {
    node.setAttribute(
      'style',
      style
        .replace(/display\s*:\s*none;?/gi, '')
        .replace(/visibility\s*:\s*hidden;?/gi, '')
        .replace(/opacity\s*:\s*0;?/gi, ''),
    );
  }

  Array.from(node.children).forEach((child) => revealSvgNode(child as Element));
}

function stripSvgTextMetadata(svgMarkup: string) {
  return svgMarkup
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
}

function sanitizeSvgMarkup(svgMarkup: string) {
  const cleaned = stripSvgTextMetadata(svgMarkup).replace(/<\?xml[\s\S]*?\?>/gi, '').trim();
  let seenDefaultXmlns = false;

  return cleaned.replace(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, () => {
    if (seenDefaultXmlns) {
      return '';
    }

    seenDefaultXmlns = true;
    return ' xmlns="http://www.w3.org/2000/svg"';
  });
}

function normalizeFieldSvgMarkup(svgMarkup: string) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return sanitizeSvgMarkup(svgMarkup);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizeSvgMarkup(svgMarkup), 'image/svg+xml');
    const root = doc.querySelector('svg');

    if (!root) {
      return svgMarkup;
    }

    revealSvgNode(root);
    const intrinsicWidth = Number.parseFloat(root.getAttribute('width') || '');
    const intrinsicHeight = Number.parseFloat(root.getAttribute('height') || '');
    root.removeAttribute('viewbox');
    root.removeAttribute('viewBox');
    if (Number.isFinite(intrinsicWidth) && Number.isFinite(intrinsicHeight) && intrinsicWidth > 0 && intrinsicHeight > 0) {
      root.setAttribute('viewBox', `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
    } else {
      const normalizedViewBox = root.getAttribute('viewBox') || root.getAttribute('viewbox');
      if (normalizedViewBox) {
        root.setAttribute('viewBox', normalizedViewBox);
      }
    }
    root.setAttribute('width', '100%');
    root.setAttribute('height', '100%');
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    return new XMLSerializer().serializeToString(root);
  } catch {
    return svgMarkup;
  }
}

function normalizeSvgMarkup(svgMarkup: string, preserveAspectRatio: string, autoFit = false, paddingRatio = 0.02, minPadding = 1) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return sanitizeSvgMarkup(svgMarkup);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizeSvgMarkup(svgMarkup), 'image/svg+xml');
    const root = doc.querySelector('svg');

    if (!root) {
      return svgMarkup;
    }

    revealSvgNode(root);
    const normalizedViewBox = root.getAttribute('viewBox') || root.getAttribute('viewbox');
    const originalWidth = Number.parseFloat(root.getAttribute('width') || '');
    const originalHeight = Number.parseFloat(root.getAttribute('height') || '');
    root.removeAttribute('viewbox');
    root.removeAttribute('viewBox');
    if (normalizedViewBox) {
      root.setAttribute('viewBox', normalizedViewBox);
    }
    root.setAttribute('width', '100%');
    root.setAttribute('height', '100%');
    root.setAttribute('preserveAspectRatio', preserveAspectRatio);

    if (autoFit) {
      const intrinsicWidth = originalWidth;
      const intrinsicHeight = originalHeight;
      const intrinsicBounds =
        preserveAspectRatio === 'none' && Number.isFinite(intrinsicWidth) && Number.isFinite(intrinsicHeight) && intrinsicWidth > 0 && intrinsicHeight > 0
          ? { minX: 0, minY: 0, maxX: intrinsicWidth, maxY: intrinsicHeight }
          : null;
      const bounds = intrinsicBounds ?? getNodeBounds(root) ?? getRenderedSvgBounds(root);
      if (bounds) {
        const paddingX = Math.max((bounds.maxX - bounds.minX) * paddingRatio, minPadding);
        const paddingY = Math.max((bounds.maxY - bounds.minY) * paddingRatio, minPadding);
        root.setAttribute(
          'viewBox',
          `${bounds.minX - paddingX} ${bounds.minY - paddingY} ${Math.max(bounds.maxX - bounds.minX + paddingX * 2, 1)} ${Math.max(bounds.maxY - bounds.minY + paddingY * 2, 1)}`,
        );
      }
    }

    return new XMLSerializer().serializeToString(root);
  } catch {
    return svgMarkup;
  }
}

function getSvgAspectRatio(svgMarkup: string) {
  if (!svgMarkup || typeof DOMParser === 'undefined') {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizeSvgMarkup(svgMarkup), 'image/svg+xml');
    const root = doc.querySelector('svg');

    if (!root) {
      return null;
    }

    revealSvgNode(root);
    const occupiedNode = findSvgNodeByName(root, 'floor') ?? findSvgNodeByName(root, 'field') ?? findSvgNodeByName(root, 'spielfeld') ?? root;
    const occupiedBounds = getNodeBounds(occupiedNode) ?? getRenderedSvgBounds(occupiedNode);
    if (occupiedBounds) {
      const width = occupiedBounds.maxX - occupiedBounds.minX;
      const height = occupiedBounds.maxY - occupiedBounds.minY;
      if (width > 0 && height > 0) {
        return width / height;
      }
    }

    const widthAttribute = root.getAttribute('width') || '';
    const heightAttribute = root.getAttribute('height') || '';
    const width = widthAttribute.includes('%') ? NaN : Number.parseFloat(widthAttribute);
    const height = heightAttribute.includes('%') ? NaN : Number.parseFloat(heightAttribute);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return width / height;
    }

    const viewBox = (root.getAttribute('viewBox') || root.getAttribute('viewbox') || '').trim().split(/[\s,]+/).map((value) => Number(value));
    if (viewBox.length === 4 && Number.isFinite(viewBox[2]) && Number.isFinite(viewBox[3]) && viewBox[2] > 0 && viewBox[3] > 0) {
      return viewBox[2] / viewBox[3];
    }
  } catch {
    return null;
  }

  return null;
}

function findSvgNodeByName(root: Element, targetName: string) {
  const normalizedTarget = targetName.trim().toLowerCase();
  if (!normalizedTarget) {
    return null;
  }

  const nodes = [
    root,
    ...Array.from(root.querySelectorAll('g, path, rect, circle, ellipse, polygon, polyline, line, use')),
  ] as Element[];

  return (
    nodes.find((node) => getSvgNodeName(node, '').toLowerCase() === normalizedTarget) ||
    nodes.find((node) => getSvgNodeName(node, '').toLowerCase().includes(normalizedTarget)) ||
    null
  );
}

function getFigurePlacement(svgMarkup: string, anchorGroup: string): FigurePlacement {
  const fallback: FigurePlacement = {
    bounds: { width: 10, height: 20 },
    anchor: { x: 0.5, y: 0.5 },
    anchorBounds: { width: 10, height: 10 },
  };

  if (!svgMarkup || typeof DOMParser === 'undefined') {
    return fallback;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(stripSvgTextMetadata(svgMarkup), 'image/svg+xml');
    const root = doc.querySelector('svg');

    if (!root) {
      return fallback;
    }

    revealSvgNode(root);
    const assetBounds = getRenderedSvgBounds(root) ?? getNodeBounds(root);
    if (!assetBounds) {
      return fallback;
    }

    const width = Math.max(assetBounds.maxX - assetBounds.minX, 1);
    const height = Math.max(assetBounds.maxY - assetBounds.minY, 1);
    const anchorNode = findSvgNodeByName(root, anchorGroup);
    const anchorBounds = anchorNode ? getNodeBounds(anchorNode) : null;

    return {
      bounds: { width, height },
      anchor: {
        x: anchorBounds ? clamp(((anchorBounds.minX + anchorBounds.maxX) / 2 - assetBounds.minX) / width, 0, 1) : 0.5,
        y: anchorBounds ? clamp(((anchorBounds.minY + anchorBounds.maxY) / 2 - assetBounds.minY) / height, 0, 1) : 0.5,
      },
      anchorBounds: anchorBounds
        ? {
            width: Math.max(anchorBounds.maxX - anchorBounds.minX, 1),
            height: Math.max(anchorBounds.maxY - anchorBounds.minY, 1),
          }
        : undefined,
    };
  } catch {
    return fallback;
  }
}

function extractSvgLayerData(svgMarkup: string): Record<string, SvgLayerData> {
  const fallbackOptions = ['Torso', 'Fuß', 'Verbindungssteg'];
  const fallbackPreview = normalizeSvgMarkup(svgMarkup || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>', 'xMidYMid meet');

  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return {
      unten: { preview: fallbackPreview, geometryOptions: fallbackOptions },
      'nach vorn': { preview: fallbackPreview, geometryOptions: fallbackOptions },
      'nach hinten': { preview: fallbackPreview, geometryOptions: fallbackOptions },
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizeSvgMarkup(svgMarkup), 'image/svg+xml');
    const root = doc.querySelector('svg');

    if (!root) {
      throw new Error('Missing svg root');
    }

    const serializer = new XMLSerializer();
    const layerNodes = Array.from(root.children).filter((child) => child.tagName.toLowerCase() === 'g') as Element[];
    const usableLayers = layerNodes.length > 0 ? layerNodes : [root];

    return Object.fromEntries(
      usableLayers.map((node, index) => {
        const layerName = getSvgNodeName(node, `Layer ${index + 1}`);
        const geometryNodes = Array.from(
          node.querySelectorAll('g, path, rect, circle, ellipse, polygon, polyline, line, use'),
        );
        const geometryOptions = Array.from(
          new Set(
            geometryNodes.map((child, childIndex) => getSvgNodeName(child, `${child.tagName.toLowerCase()} ${childIndex + 1}`)).filter(Boolean),
          ),
        );

        const previewDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null);
        const previewRoot = previewDoc.documentElement;
        previewRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        previewRoot.setAttribute('width', '100%');
        previewRoot.setAttribute('height', '100%');
        previewRoot.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        const previewNode = node.cloneNode(true) as Element;
        revealSvgNode(previewNode);
        previewRoot.appendChild(previewNode);

        const bounds = getNodeBounds(previewNode) ?? getRenderedSvgBounds(previewNode);
        if (bounds) {
          const paddingX = Math.max((bounds.maxX - bounds.minX) * 0.08, 2);
          const paddingY = Math.max((bounds.maxY - bounds.minY) * 0.08, 2);
          previewRoot.setAttribute(
            'viewBox',
            `${bounds.minX - paddingX} ${bounds.minY - paddingY} ${Math.max(bounds.maxX - bounds.minX + paddingX * 2, 1)} ${Math.max(bounds.maxY - bounds.minY + paddingY * 2, 1)}`,
          );
        } else if (root.getAttribute('viewBox')) {
          previewRoot.setAttribute('viewBox', root.getAttribute('viewBox') || '0 0 100 100');
        } else {
          previewRoot.setAttribute('viewBox', '0 0 100 100');
        }

        return [
          layerName,
          {
            preview: normalizeSvgMarkup(serializer.serializeToString(previewRoot), 'xMidYMid meet', true, 0.08, 2),
            geometryOptions: geometryOptions.length > 0 ? geometryOptions : fallbackOptions,
            bounds: bounds
              ? {
                  width: Math.max(bounds.maxX - bounds.minX, 1),
                  height: Math.max(bounds.maxY - bounds.minY, 1),
                }
              : undefined,
          },
        ];
      }),
    );
  } catch {
    return {
      unten: { preview: fallbackPreview, geometryOptions: fallbackOptions },
      'nach vorn': { preview: fallbackPreview, geometryOptions: fallbackOptions },
      'nach hinten': { preview: fallbackPreview, geometryOptions: fallbackOptions },
    };
  }
}

function buildLayerDataFromStoredAsset(svgMarkup: string, anchorGroup: string, collisionGroup: string): SvgLayerData {
  const fallbackOptions = ['Verbindungssteg', 'Torso', 'Fuß'];
  const normalizedPreview = svgMarkup ? normalizeSvgMarkup(svgMarkup, 'xMidYMid meet', true, 0.08, 2) : '';
  const extractedLayer = Object.values(extractSvgLayerData(svgMarkup))[0];
  const previewMarkup = extractedLayer?.preview || normalizedPreview;
  const geometryOptions = Array.from(
    new Set([anchorGroup, collisionGroup, ...(extractedLayer?.geometryOptions ?? fallbackOptions)].filter(Boolean)),
  );
  const placement = getFigurePlacement(previewMarkup, anchorGroup);

  return {
    preview: previewMarkup,
    geometryOptions,
    bounds: extractedLayer?.bounds ?? placement.bounds,
  };
}

function buildConfiguratorStateFromLayout(layout: Pick<typeof boardConfig, 'legacy' | 'settings' | 'assets'>): {
  tableDraft: TableDraft;
  svgPreviews: Record<string, string>;
  figureLayerOptions: string[];
  figureLayerData: Record<string, SvgLayerData>;
} {
  const settings = layout.settings;
  const rows = settings?.configuration.rows;
  const figureStates = settings?.figures.states;

  const tableDraft: TableDraft = {
    ...defaultTableDraft,
    name: layout.legacy.name || defaultTableDraft.name,
    manufacturer: settings?.manufacturer || defaultTableDraft.manufacturer,
    fieldLength: settings?.field.lengthCm ?? defaultTableDraft.fieldLength,
    fieldWidth: settings?.field.widthCm ?? defaultTableDraft.fieldWidth,
    goalWidth: settings?.field.goalWidthCm ?? defaultTableDraft.goalWidth,
    rows: {
      goalkeeper: { ...defaultTableDraft.rows.goalkeeper, ...(rows?.goalkeeper ?? {}) },
      defense: { ...defaultTableDraft.rows.defense, ...(rows?.defense ?? {}) },
      midfield: { ...defaultTableDraft.rows.midfield, ...(rows?.midfield ?? {}) },
      offense: { ...defaultTableDraft.rows.offense, ...(rows?.offense ?? {}) },
    },
    figureWidth: settings?.figures.widthCm ?? defaultTableDraft.figureWidth,
    playerOneColor: settings?.figures.colors.player1 ?? defaultTableDraft.playerOneColor,
    playerTwoColor: settings?.figures.colors.player2 ?? defaultTableDraft.playerTwoColor,
    ballSize: settings?.ball.sizeCm ?? defaultTableDraft.ballSize,
    ballColor: settings?.ball.color ?? defaultTableDraft.ballColor,
    figureLayerBottom: figureStates?.unten.layer || defaultTableDraft.figureLayerBottom,
    figureLayerForward: figureStates?.nachVorn.layer || defaultTableDraft.figureLayerForward,
    figureLayerBackward: figureStates?.nachHinten.layer || defaultTableDraft.figureLayerBackward,
    bottomAnchorGroup: figureStates?.unten.anchorGroup || defaultTableDraft.bottomAnchorGroup,
    bottomCollisionGroup: figureStates?.unten.collisionGroup || defaultTableDraft.bottomCollisionGroup,
    forwardAnchorGroup: figureStates?.nachVorn.anchorGroup || defaultTableDraft.forwardAnchorGroup,
    forwardCollisionGroup: figureStates?.nachVorn.collisionGroup || defaultTableDraft.forwardCollisionGroup,
    backwardAnchorGroup: figureStates?.nachHinten.anchorGroup || defaultTableDraft.backwardAnchorGroup,
    backwardCollisionGroup: figureStates?.nachHinten.collisionGroup || defaultTableDraft.backwardCollisionGroup,
  };

  const fieldAssetId = settings?.field.assetId || layout.legacy.sourceAsset;
  const fieldSvg = fieldAssetId ? normalizeFieldSvgMarkup(layout.assets[fieldAssetId] || '') : '';
  const figureEntries = [
    {
      layerName: tableDraft.figureLayerBottom,
      assetId: figureStates?.unten.assetId || 'figure.bottom',
      anchorGroup: tableDraft.bottomAnchorGroup,
      collisionGroup: tableDraft.bottomCollisionGroup,
    },
    {
      layerName: tableDraft.figureLayerForward,
      assetId: figureStates?.nachVorn.assetId || 'figure.forward',
      anchorGroup: tableDraft.forwardAnchorGroup,
      collisionGroup: tableDraft.forwardCollisionGroup,
    },
    {
      layerName: tableDraft.figureLayerBackward,
      assetId: figureStates?.nachHinten.assetId || 'figure.backward',
      anchorGroup: tableDraft.backwardAnchorGroup,
      collisionGroup: tableDraft.backwardCollisionGroup,
    },
  ];

  const figureLayerData = Object.fromEntries(
    figureEntries.map(({ layerName, assetId, anchorGroup, collisionGroup }) => [
      layerName,
      buildLayerDataFromStoredAsset(layout.assets[assetId] || '', anchorGroup, collisionGroup),
    ]),
  );
  const figureLayerOptions = Array.from(new Set(figureEntries.map(({ layerName }) => layerName).filter(Boolean)));

  return {
    tableDraft,
    svgPreviews: {
      field: fieldSvg,
      figureSource: figureEntries.map(({ assetId }) => layout.assets[assetId] || '').find(Boolean) || '',
    },
    figureLayerOptions: figureLayerOptions.length > 0 ? figureLayerOptions : ['unten', 'nach vorn', 'nach hinten'],
    figureLayerData,
  };
}

function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const selectedTable = boardConfig.legacy.name;
  const [configDrawerOpened, setConfigDrawerOpened] = useState(false);
  const [configStep, setConfigStep] = useState(0);
  const [svgPreviews, setSvgPreviews] = useState<Record<string, string>>({});
  const [tableDraft, setTableDraft] = useState(defaultTableDraft);
  const [snapshotName, setSnapshotName] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [figureLayerOptions, setFigureLayerOptions] = useState(['unten', 'nach vorn', 'nach hinten']);
  const [figureLayerData, setFigureLayerData] = useState<Record<string, SvgLayerData>>({});

  const updateRowConfig = (
    row: 'goalkeeper' | 'defense' | 'midfield' | 'offense',
    field: 'position' | 'playerCount' | 'spacing' | 'outerStop' | 'rodLength' | 'rodDiameter',
    value: string | number,
  ) => {
    setTableDraft((current) => ({
      ...current,
      rows: {
        ...current.rows,
        [row]: {
          ...current.rows[row],
          [field]: Number(value) || 0,
        },
      },
    }));
  };

  const handleSvgDrop = (key: string) => (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const svgMarkup = String(reader.result || '');
      const isFieldUpload = key === 'field';
      const normalizedMarkup = isFieldUpload
        ? normalizeFieldSvgMarkup(svgMarkup)
        : normalizeSvgMarkup(svgMarkup, 'xMidYMid meet', false, 0.02, 0);
      setSvgPreviews((current) => ({ ...current, [key]: normalizedMarkup }));

      if (key === 'figureSource') {
        const layerData = extractSvgLayerData(svgMarkup);
        const options = Object.keys(layerData);
        const bottomLayer = findMatchingOption(options, ['down', 'unten'], 0);
        const forwardLayer = findMatchingOption(options, ['front', 'vorn', 'forward'], 1);
        const backwardLayer = findMatchingOption(options, ['back', 'hinten', 'backward'], 2);
        const bottomGeometry = layerData[bottomLayer]?.geometryOptions ?? ['Mount', 'Hit'];
        const forwardGeometry = layerData[forwardLayer]?.geometryOptions ?? ['Mount', 'Hit'];
        const backwardGeometry = layerData[backwardLayer]?.geometryOptions ?? ['Mount', 'Hit'];

        setFigureLayerData(layerData);
        setFigureLayerOptions(options);
        setTableDraft((current) => ({
          ...current,
          figureLayerBottom: options.includes(current.figureLayerBottom) ? current.figureLayerBottom : bottomLayer,
          figureLayerForward: options.includes(current.figureLayerForward) ? current.figureLayerForward : forwardLayer,
          figureLayerBackward: options.includes(current.figureLayerBackward) ? current.figureLayerBackward : backwardLayer,
          bottomAnchorGroup: findMatchingGeometry(bottomGeometry, ['mount']) || current.bottomAnchorGroup,
          bottomCollisionGroup: findMatchingGeometry(bottomGeometry, ['hit']) || current.bottomCollisionGroup,
          forwardAnchorGroup: findMatchingGeometry(forwardGeometry, ['mount']) || current.forwardAnchorGroup,
          forwardCollisionGroup: findMatchingGeometry(forwardGeometry, ['hit']) || current.forwardCollisionGroup,
          backwardAnchorGroup: findMatchingGeometry(backwardGeometry, ['mount']) || current.backwardAnchorGroup,
          backwardCollisionGroup: findMatchingGeometry(backwardGeometry, ['hit']) || current.backwardCollisionGroup,
        }));
      }
    };
    reader.readAsText(file);
  };

  const previewPaddingX = 10;
  const previewPaddingY = 10;
  const frameThickness = 2;
  const gripThickness = 4;
  const gripLength = 13;
  const colorSwatches = ['#2e2e2e', '#868e96', '#fa5252', '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886', '#40c057', '#82c91e', '#fab005', '#fd7e14'];
  const previewRodExtension = Math.max(
    ...Object.values(tableDraft.rows).map((row) => Math.max((row.rodLength - tableDraft.fieldWidth) / 2, 0)),
    0,
  );
  const fieldPreviewWidth = tableDraft.fieldLength + previewPaddingX * 2;
  const fieldPreviewHeight = tableDraft.fieldWidth + previewPaddingY * 2;
  const rodPreviewWidth = fieldPreviewWidth;
  const rodPreviewHeight = tableDraft.fieldWidth + previewPaddingY * 2 + previewRodExtension * 2;
  const previewFieldX = previewPaddingX;
  const fieldPreviewY = previewPaddingY;
  const rodPreviewFieldY = previewPaddingY + previewRodExtension;
  const previewFieldWidth = tableDraft.fieldLength;
  const previewFieldHeight = tableDraft.fieldWidth;

  const buildPreviewFigurePositions = (row: { playerCount: number; spacing: number }) =>
    Array.from({ length: row.playerCount }, (_, index) =>
      clamp(
        tableDraft.fieldWidth / 2 + (index - (row.playerCount - 1) / 2) * row.spacing,
        2,
        Math.max(tableDraft.fieldWidth - 2, 2),
      ),
    );

  const renderFieldPreviewBase = (viewWidth: number, viewHeight: number, fieldTop: number, showBaseField = true) => {
    const goalHeight = (tableDraft.goalWidth / Math.max(tableDraft.fieldWidth, 1)) * previewFieldHeight;
    const goalY = fieldTop + (previewFieldHeight - goalHeight) / 2;
    const goalDepth = Math.max(frameThickness / 2, 1);

    return (
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="foosboard-table-preview" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={viewWidth} height={viewHeight} rx="2" fill="#d9d9d9" />
        {showBaseField ? <rect x={previewFieldX} y={fieldTop} width={previewFieldWidth} height={previewFieldHeight} fill="#69db7c" /> : null}
        <rect x={previewFieldX - goalDepth} y={goalY} width={goalDepth} height={goalHeight} fill="#ffffff" />
        <rect x={previewFieldX + previewFieldWidth} y={goalY} width={goalDepth} height={goalHeight} fill="#ffffff" />
      </svg>
    );
  };

  const getGeometryOptionsForLayer = (layerName: string) => figureLayerData[layerName]?.geometryOptions ?? ['Verbindungssteg', 'Torso', 'Fuß'];
  const getLayerPreview = (layerName: string) => figureLayerData[layerName]?.preview || '';
  const getLayerBounds = (layerName: string) => figureLayerData[layerName]?.bounds;
  const hasFieldUpload = Boolean(svgPreviews.field);
  const fieldSvgAspectRatio = useMemo(() => getSvgAspectRatio(svgPreviews.field), [svgPreviews.field]);
  const expectedFieldAspectRatio = tableDraft.fieldLength / Math.max(tableDraft.fieldWidth, 1);
  const fieldAspectWarning = useMemo(() => {
    if (!svgPreviews.field || !fieldSvgAspectRatio) {
      return '';
    }

    const mismatch = Math.abs(fieldSvgAspectRatio - expectedFieldAspectRatio) / Math.max(expectedFieldAspectRatio, 1e-6);
    if (mismatch <= 0.05) {
      return '';
    }

    return `Hinweis: Das hochgeladene Spielfeld-SVG hat ein Seitenverhältnis von ${fieldSvgAspectRatio.toFixed(2)}:1, erwartet sind ${expectedFieldAspectRatio.toFixed(2)}:1.`;
  }, [expectedFieldAspectRatio, fieldSvgAspectRatio, svgPreviews.field]);
  const tableExportData = useMemo(
    () => buildTableLayoutFromDraft(tableDraft, svgPreviews, figureLayerData),
    [tableDraft, svgPreviews, figureLayerData],
  );

  const handleOpenConfig = () => {
    const configuratorState = buildConfiguratorStateFromLayout(boardConfig as typeof boardConfig & { settings: StoredTableLayout['settings'] });
    setTableDraft(configuratorState.tableDraft);
    setSvgPreviews(configuratorState.svgPreviews);
    setFigureLayerOptions(configuratorState.figureLayerOptions);
    setFigureLayerData(configuratorState.figureLayerData);
    setConfigDrawerOpened(true);
  };

  const handleSaveTableConfiguration = () => {
    window.localStorage.setItem('foosboard.tableLayout', JSON.stringify(tableExportData));
    applyTableLayout(tableExportData);
    resetScene();
    setConfigDrawerOpened(false);
  };

  const handleDownloadJson = () => {
    const filename = `${`${tableDraft.manufacturer}-${tableDraft.name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'foosboard-table'}.json`;
    const blob = new Blob([JSON.stringify(tableExportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const bottomFigurePreview = getLayerPreview(tableDraft.figureLayerBottom);
  const forwardFigurePreview = getLayerPreview(tableDraft.figureLayerForward);
  const backwardFigurePreview = getLayerPreview(tableDraft.figureLayerBackward);
  const bottomFigurePlacement = useMemo(
    () => getFigurePlacement(bottomFigurePreview, tableDraft.bottomAnchorGroup),
    [bottomFigurePreview, tableDraft.bottomAnchorGroup],
  );
  const forwardFigurePlacement = useMemo(
    () => getFigurePlacement(forwardFigurePreview, tableDraft.forwardAnchorGroup),
    [forwardFigurePreview, tableDraft.forwardAnchorGroup],
  );
  const backwardFigurePlacement = useMemo(
    () => getFigurePlacement(backwardFigurePreview, tableDraft.backwardAnchorGroup),
    [backwardFigurePreview, tableDraft.backwardAnchorGroup],
  );
  const bottomFigureBounds = getLayerBounds(tableDraft.figureLayerBottom) ?? bottomFigurePlacement.bounds;
  const forwardFigureBounds = getLayerBounds(tableDraft.figureLayerForward) ?? forwardFigurePlacement.bounds;
  const backwardFigureBounds = getLayerBounds(tableDraft.figureLayerBackward) ?? backwardFigurePlacement.bounds;
  const ball = useBoardStore((state) => state.ball);
  const rods = useBoardStore((state) => state.rods);
  const shots = useBoardStore((state) => state.shots);
  const snapshots = useBoardStore((state) => state.snapshots);
  const activeTool = useBoardStore((state) => state.activeTool);
  const activeShotColor = useBoardStore((state) => state.activeShotColor);
  const setBall = useBoardStore((state) => state.setBall);
  const moveRod = useBoardStore((state) => state.moveRod);
  const cycleRodTilt = useBoardStore((state) => state.cycleRodTilt);
  const addShot = useBoardStore((state) => state.addShot);
  const removeShot = useBoardStore((state) => state.removeShot);
  const setActiveTool = useBoardStore((state) => state.setActiveTool);
  const saveSnapshot = useBoardStore((state) => state.saveSnapshot);
  const resetScene = useBoardStore((state) => state.resetScene);
  const hydrateScene = useBoardStore((state) => state.hydrateScene);

  const fieldBounds = useMemo(
    () => ({
      left: boardConfig.fieldX,
      top: boardConfig.fieldY,
      right: boardConfig.fieldX + boardConfig.fieldWidth,
      bottom: boardConfig.fieldY + boardConfig.fieldHeight,
    }),
    [boardConfig.fieldX, boardConfig.fieldY, boardConfig.fieldWidth, boardConfig.fieldHeight],
  );

  useEffect(() => {
    const applyHashScene = () => {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const token = params.get('scene');
      if (!token) {
        // Ohne Share-Link soll das Board immer neutral starten,
        // unabhängig von einem eventuell persistierten letzten Zustand.
        resetScene();
        return;
      }

      const scene = decodeScene<Partial<SerializableScene>>(token);
      if (scene) {
        hydrateScene(scene);
      }
    };

    applyHashScene();
    window.addEventListener('hashchange', applyHashScene);
    return () => window.removeEventListener('hashchange', applyHashScene);
  }, [hydrateScene, resetScene]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const svg = svgRef.current;
      if (!drag || !svg || drag.pointerId !== event.pointerId) {
        return;
      }

      const rect = svg.getBoundingClientRect();
      const point = {
        x: ((event.clientX - rect.left) / rect.width) * boardConfig.width,
        y: ((event.clientY - rect.top) / rect.height) * boardConfig.height,
      };

      if (drag.kind === 'ball') {
        setBall({
          x: clamp(point.x - drag.offsetX, fieldBounds.left, fieldBounds.right),
          y: clamp(point.y - drag.offsetY, fieldBounds.top, fieldBounds.bottom),
        });
      } else {
        const rodBounds = buildRodMotionBounds(drag.rodId);
        moveRod(drag.rodId, clamp(point.y - drag.offsetY, rodBounds.minY, rodBounds.maxY));
      }
    };

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [fieldBounds, moveRod, setBall]);

  const handleBoardPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event, svgRef.current);

    if (activeTool === 'move') {
      setBall({
        x: clamp(point.x, fieldBounds.left, fieldBounds.right),
        y: clamp(point.y, fieldBounds.top, fieldBounds.bottom),
      });
      return;
    }

    addShot({
      kind: activeTool === 'pass' ? 'pass' : 'shot',
      color: activeShotColor,
      target: point,
    });
  };

  const startBallDrag = (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const point = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>, svg);
    dragRef.current = {
      kind: 'ball',
      pointerId: event.pointerId,
      offsetX: point.x - ball.x,
      offsetY: point.y - ball.y,
    };
  };

  const startRodDrag = (rodId: RodConfig['id'], event: React.PointerEvent<SVGElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const point = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>, svg);
    dragRef.current = {
      kind: 'rod',
      pointerId: event.pointerId,
      rodId,
      offsetY: point.y - rods[rodId].y,
    };
  };

  const handleSaveSnapshot = () => {
    saveSnapshot(snapshotName);
    setSnapshotName('');
  };

  const handleShare = () => {
    const scene = getSerializableScene(useBoardStore.getState());
    const hash = `scene=${encodeScene(scene)}`;
    window.location.hash = hash;
    setShareLink(`${window.location.origin}${window.location.pathname}#${hash}`);
  };

  const goalTop = boardConfig.centerY - boardConfig.goalWidth / 2;
  const liveFieldWidthCm = boardConfig.settings?.field.widthCm ?? tableDraft.fieldWidth;
  const liveGripLengthCm = boardConfig.settings?.configuration.gripLengthCm ?? 7;
  const liveGripWidthCm = boardConfig.settings?.configuration.gripWidthCm ?? 3;
  const liveFigureWidthCm = boardConfig.settings?.figures.widthCm ?? tableDraft.figureWidth;
  const liveRowConfigs = boardConfig.settings?.configuration.rows ?? defaultTableDraft.rows;
  const liveRodExtension = getMaxRodExtension(liveRowConfigs, liveFieldWidthCm, boardConfig.fieldHeight);
  const liveGripLength = Math.max((liveGripLengthCm / Math.max(liveFieldWidthCm, 1)) * boardConfig.fieldHeight, 18);
  const liveGripThickness = Math.max((liveGripWidthCm / Math.max(liveFieldWidthCm, 1)) * boardConfig.fieldHeight, 10);
  const liveFieldAssetId = boardConfig.settings?.field.assetId || boardConfig.legacy.sourceAsset;
  const savedFieldAsset = useMemo(
    () => (liveFieldAssetId ? normalizeFieldSvgMarkup(boardConfig.assets[liveFieldAssetId] || '') : ''),
    [liveFieldAssetId, boardConfig.assets],
  );
  const figureStates = boardConfig.settings?.figures.states;
  const liveFigureStates = useMemo(() => {
    const buildState = (stateKey: FigureStateKey) => {
      const state = figureStates?.[stateKey];
      const assetMarkup = state?.assetId ? boardConfig.assets[state.assetId] || '' : '';
      const layerPreview = assetMarkup && state?.layer ? extractSvgLayerData(assetMarkup)[state.layer]?.preview || '' : '';
      const markup = layerPreview || (assetMarkup ? normalizeSvgMarkup(assetMarkup, 'xMidYMid meet', true, 0.08, 0) : '');
      const placement = getFigurePlacement(markup, state?.anchorGroup || '');
      const metrics = buildFigureRenderMetrics({
        state: {
          markup,
          bounds: placement.bounds,
          anchor: placement.anchor,
          referenceWidth: placement.anchorBounds?.width || placement.bounds.width,
        },
        figureWidthCm: liveFigureWidthCm,
        fieldWidthCm: liveFieldWidthCm,
        viewFieldHeight: boardConfig.fieldHeight,
        minWidth: 10,
        minHeight: 10,
      });

      return {
        markup,
        width: metrics.width,
        height: metrics.height,
        anchor: metrics.anchor,
      };
    };

    return {
      unten: buildState('unten'),
      nachVorn: buildState('nachVorn'),
      nachHinten: buildState('nachHinten'),
    };
  }, [boardConfig.assets, boardConfig.fieldHeight, figureStates, liveFigureWidthCm, liveFieldWidthCm]);
  const previewFigureStates = {
    unten: {
      markup: bottomFigurePreview || liveFigureStates.unten.markup,
      bounds: bottomFigurePreview ? bottomFigureBounds : liveFigureStates.unten.bounds,
      anchor: bottomFigurePreview ? bottomFigurePlacement.anchor : liveFigureStates.unten.anchor,
      referenceWidth: bottomFigurePlacement.anchorBounds?.width || (bottomFigurePreview ? bottomFigureBounds.width : liveFigureStates.unten.bounds.width),
    },
    nachVorn: {
      markup: forwardFigurePreview || liveFigureStates.nachVorn.markup,
      bounds: forwardFigurePreview ? forwardFigureBounds : liveFigureStates.nachVorn.bounds,
      anchor: forwardFigurePreview ? forwardFigurePlacement.anchor : liveFigureStates.nachVorn.anchor,
      referenceWidth: forwardFigurePlacement.anchorBounds?.width || (forwardFigurePreview ? forwardFigureBounds.width : liveFigureStates.nachVorn.bounds.width),
    },
    nachHinten: {
      markup: backwardFigurePreview || liveFigureStates.nachHinten.markup,
      bounds: backwardFigurePreview ? backwardFigureBounds : liveFigureStates.nachHinten.bounds,
      anchor: backwardFigurePreview ? backwardFigurePlacement.anchor : liveFigureStates.nachHinten.anchor,
      referenceWidth: backwardFigurePlacement.anchorBounds?.width || (backwardFigurePreview ? backwardFigureBounds.width : liveFigureStates.nachHinten.bounds.width),
    },
  };
  const previewFigureMarkup = previewFigureStates.unten.markup;
  const previewFigureState = previewFigureStates.unten;
  const liveRodHandleWidth = Math.max(liveFigureStates.unten.width * 1.2, liveGripThickness * 4, 40);
  const liveRodHandleHeight = Math.max(liveFigureStates.unten.height * 1.4, 56);

  useEffect(() => {
    const testWindow = window as Window & { __foosboardStore?: typeof useBoardStore };
    testWindow.__foosboardStore = useBoardStore;

    return () => {
      delete testWindow.__foosboardStore;
    };
  }, []);

  return (
    <AppShell padding={0}>
      <BoardMenu selectedTable={selectedTable} onOpenConfig={handleOpenConfig} />

      <TableConfigForm
        opened={configDrawerOpened}
        onClose={() => setConfigDrawerOpened(false)}
        isMobile={Boolean(isMobile)}
        configStep={configStep}
        setConfigStep={setConfigStep}
        tableDraft={tableDraft}
        setTableDraft={setTableDraft}
        updateRowConfig={updateRowConfig}
        handleSvgDrop={handleSvgDrop}
        svgPreviews={svgPreviews}
        hasFieldUpload={hasFieldUpload}
        fieldAspectWarning={fieldAspectWarning}
        fieldPreviewWidth={fieldPreviewWidth}
        fieldPreviewHeight={fieldPreviewHeight}
        rodPreviewWidth={rodPreviewWidth}
        rodPreviewHeight={rodPreviewHeight}
        previewFieldX={previewFieldX}
        fieldPreviewY={fieldPreviewY}
        rodPreviewFieldY={rodPreviewFieldY}
        previewFieldWidth={previewFieldWidth}
        previewFieldHeight={previewFieldHeight}
        rodExtension={previewRodExtension}
        frameThickness={frameThickness}
        gripThickness={gripThickness}
        gripLength={gripLength}
        colorSwatches={colorSwatches}
        figureLayerOptions={figureLayerOptions}
        getGeometryOptionsForLayer={getGeometryOptionsForLayer}
        getLayerPreview={getLayerPreview}
        previewFigureStates={previewFigureStates}
        previewFigureMarkup={previewFigureMarkup}
        previewFigureState={previewFigureState}
        onSave={handleSaveTableConfiguration}
        onDownloadJson={handleDownloadJson}
      />

      <AppShell.Main>
        <main className="foosboard-stage">
          <BoardCanvas
            svgRef={svgRef}
            ball={ball}
            showBall={false}
            rods={rods}
            savedFieldAsset={savedFieldAsset}
            goalTop={goalTop}
            liveRodExtension={liveRodExtension}
            liveGripLength={liveGripLength}
            liveGripThickness={liveGripThickness}
            liveRodHandleWidth={liveRodHandleWidth}
            liveRodHandleHeight={liveRodHandleHeight}
            liveFigureStates={liveFigureStates}
            onBoardPointerDown={handleBoardPointerDown}
            onStartBallDrag={startBallDrag}
            onStartRodDrag={startRodDrag}
            onCycleRodTilt={cycleRodTilt}
          />

      <section className="foosboard-hidden-ui" aria-label="Foosboard Steuerung">
        <h1>Foosboard</h1>
        <p>Refaktorierte Taktiktafel für Tischfußball</p>
        <p>Vorlage {boardConfig.width} x {boardConfig.height}</p>

        <div>
          <button type="button" onClick={() => setActiveTool('move')}>
            Ball
          </button>
          <button type="button" onClick={() => setActiveTool('shot')}>
            Schuss
          </button>
          <button type="button" onClick={() => setActiveTool('pass')}>
            Pass
          </button>
        </div>

        <div>
          <label htmlFor="snapshot-name">Snapshot-Name</label>
          <input
            id="snapshot-name"
            aria-label="Snapshot-Name"
            value={snapshotName}
            onChange={(event) => setSnapshotName(event.currentTarget.value)}
          />
          <button type="button" onClick={handleSaveSnapshot}>
            Speichern
          </button>
        </div>

        <div>
          <button type="button" onClick={handleShare}>
            Teilen
          </button>
          <label htmlFor="share-link">Share-Link</label>
          <input id="share-link" aria-label="Share-Link" readOnly value={shareLink} />
        </div>

        <div>
          {boardConfig.rods.slice(0, 6).map((rod) => (
            <div key={rod.id}>
              <span>{rod.label}</span>
              <span>{rods[rod.id].tilt}</span>
              <button type="button" onClick={() => cycleRodTilt(rod.id)}>
                Kippen
              </button>
            </div>
          ))}
        </div>

        <div>
          {snapshots.map((snapshot) => (
            <div key={snapshot.id}>{snapshot.name}</div>
          ))}
        </div>

        <div>
          {shots.map((shot) => (
            <div key={shot.id}>
              <span>{shot.label}</span>
              <button type="button" aria-label="Linie löschen" onClick={() => removeShot(shot.id)}>
                Löschen
              </button>
            </div>
          ))}
        </div>
      </section>
        </main>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
