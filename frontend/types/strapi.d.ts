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

export interface TextNode {
  text: string;
  type: 'text';
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

export interface LinkNode {
  url: string;
  type: 'link';
  children: BlockNode[]; //should be TextNode[]
}

export interface ListItemNode {
  type: 'list-item';
  children: BlockNode[]; //should be (TextNode | LinkNode)[]
}

export interface ImageFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: null | string;
  size: number;
  width: number;
  height: number;
}

export interface ImageNode {
  type: 'image';
  image: {
      ext: string;
      url: string;
      hash: string;
      mime: string;
      name: string;
      size: number;
      width: number;
      height: number;
      caption: string;
      formats: {
          large?: ImageFormat;
          small?: ImageFormat;
          medium?: ImageFormat;
          thumbnail?: ImageFormat;
      };
      provider: string;
      createdAt: string;
      updatedAt: string;
      previewUrl: null | string;
      alternativeText: string;
      provider_metadata: null | any;
  };
  children: BlockNode[]; //should be TextNode[]
}

export interface ListNode {
  type: 'list';
  format: 'unordered' | 'ordered';
  children: BlockNode[];
}

export interface HeadingNode {
  type: 'heading';
  level: number;
  children: BlockNode[];
}

export interface ParagraphNode {
  type: 'paragraph';
  children: BlockNode[];
}

export interface QuoteNode {
  type: 'quote';
  children: BlockNode[];
}

export type BlockNode = TextNode | LinkNode | ListItemNode | ImageNode | ListNode | HeadingNode | ParagraphNode | QuoteNode;


