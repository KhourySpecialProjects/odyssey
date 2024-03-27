export interface PaginationByPage {
  page: number;
  pageSize: number;
  withCount?: boolean;
}

export interface PaginationByOffset {
  start: number;
  limit: number;
  withCount?: boolean;
}

export interface StrapiBaseRequestParams {
  fields?: Array<string>;
  populate?: string | Array<string> | Record<string, unknown>;
}

export interface StrapiRequestParams extends StrapiBaseRequestParams {
  sort?: string | Array<string>;
  pagination?: PaginationByOffset | PaginationByPage;
  filters?: Record<string, unknown>;
}

export interface StrapiMediaParams {
  name: String;
  alternativeText?: String;
  caption?: String;
  width?: Integer;
  height?: Integer;
  formats?: JSON<any>;
  hash: String;
  ext?: String;
  mime: String;
  size: Decimal;
  url: String;
  previewUrl?: String;
  provider: String;
  provider_metadata?: JSON;
  createdAt?: DateTime;
  updatedAt?: DateTime;
}
