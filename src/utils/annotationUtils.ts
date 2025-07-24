import { Annotation } from '../App';

export function exportAnnotations(filename: string, annotations: Annotation[]) {
  const exportData = {
    image_filename: filename,
    annotations: annotations.map(({ x, y, width, height, tag }) => ({ x, y, width, height, tag })),
  };
  return JSON.stringify(exportData, null, 2);
}

export function iou(boxA: { x: number; y: number; width: number; height: number }, boxB: { x: number; y: number; width: number; height: number }) {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;
  return interArea / (boxAArea + boxBArea - interArea);
} 