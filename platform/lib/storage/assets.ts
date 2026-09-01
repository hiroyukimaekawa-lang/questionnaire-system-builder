export const ASSET_BUCKET='questionnaire-assets';
export const ACCEPTED_ASSET_TYPES=['image/png','image/jpeg','image/webp'] as const;
export const MAX_ASSET_BYTES=5*1024*1024;
export function validateAsset(file:File){if(file.size>MAX_ASSET_BYTES)return '画像は5MB以下にしてください。';if(!(ACCEPTED_ASSET_TYPES as readonly string[]).includes(file.type))return 'PNG、JPG、WEBPのみ使用できます。';return null;}
