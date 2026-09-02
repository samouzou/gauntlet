/**
 * Credit costs by studio mode.
 * Images are cheap exploration; video (Omni) is the premium action.
 */
export type PricedMode =
  | 'text_to_image'
  | 'image_to_image'
  | 'text_to_video'
  | 'image_to_video'
  | 'video_edit'
  | 'edit_upload'
  | 'character';

export const CREDIT_COSTS = {
  text_to_image: 1,
  image_to_image: 1,
  character: 1,
  text_to_video: 3,
  image_to_video: 3,
  video_edit: 3,
  edit_upload: 3,
} as const satisfies Record<PricedMode, number>;

export function creditCost(mode: PricedMode): number {
  return CREDIT_COSTS[mode];
}

export function creditLabel(mode: PricedMode): string {
  const n = creditCost(mode);
  return n === 1 ? '1 credit' : `${n} credits`;
}
