export const buildFrontendUrl = (path: string, frontendUrl: string) => {
  return URL.parse(path, frontendUrl)?.toString() ?? '#';
};

export const getProductRequestUrl = (id: string, frontendUrl: string) => {
  return buildFrontendUrl(`/admin/product-requests/${id}`, frontendUrl);
};

export const getAssetsUrl = (frontendUrl: string) => {
  return buildFrontendUrl('/assets', frontendUrl);
};
