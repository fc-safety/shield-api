export type FrontendUrlOptions = {
  query?: Record<string, string>;
};

export const buildFrontendUrl = (
  path: string,
  frontendUrl: string,
  options: FrontendUrlOptions = {},
) => {
  const url = URL.parse(path, frontendUrl);
  if (!url) {
    return '#';
  }
  if (options.query) {
    url.search = new URLSearchParams(options.query).toString();
  }
  return url.toString();
};

export const getProductRequestUrl = (
  id: string,
  frontendUrl: string,
  options?: FrontendUrlOptions,
) => {
  return buildFrontendUrl(
    `/admin/product-requests/${id}`,
    frontendUrl,
    options,
  );
};

function getAssetsUrl(frontendUrl: string, assetId: string): string;
function getAssetsUrl(
  frontendUrl: string,
  options?: FrontendUrlOptions,
): string;
function getAssetsUrl(
  frontendUrl: string,
  optionsOrAssetId?: FrontendUrlOptions | string,
): string {
  if (typeof optionsOrAssetId === 'string') {
    return buildFrontendUrl(`/assets/${optionsOrAssetId}`, frontendUrl);
  }
  return buildFrontendUrl('/assets', frontendUrl, optionsOrAssetId);
}

export { getAssetsUrl };
