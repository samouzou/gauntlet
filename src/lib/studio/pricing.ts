/**
 * Credit costs by studio mode.
 * Video is billed per second (1 credit = 1 second; Omni renders 10-second parts).
 * Images are cheap exploration at 1 credit each.
 */
export type PricedMode =
  | 'text_to_image'
  | 'image_to_image'
  | 'text_to_video'
  | 'image_to_video'
  | 'video_edit'
  | 'edit_upload'
  | 'video_extend'
  | 'character';

export const SEGMENT_SECONDS = 10;
export const VIDEO_LENGTHS = [10, 20, 30, 40] as const;
export type VideoLength = (typeof VIDEO_LENGTHS)[number];

export const CREDIT_COSTS = {
  text_to_image: 1,
  image_to_image: 1,
  character: 1,
  text_to_video: SEGMENT_SECONDS,
  image_to_video: SEGMENT_SECONDS,
  video_edit: SEGMENT_SECONDS,
  edit_upload: SEGMENT_SECONDS,
  video_extend: SEGMENT_SECONDS,
} as const satisfies Record<PricedMode, number>;

export function creditCost(mode: PricedMode): number {
  return CREDIT_COSTS[mode];
}

export function formatCredits(n: number): string {
  return n === 1 ? '1 credit' : `${n} credits`;
}

export function creditLabel(mode: PricedMode): string {
  return formatCredits(creditCost(mode));
}

/** Total credits for a video of the given length. */
export function videoLengthCost(seconds: number): number {
  return Math.ceil(seconds / SEGMENT_SECONDS) * SEGMENT_SECONDS;
}
