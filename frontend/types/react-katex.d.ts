declare module "react-katex" {
  import { FC } from "react";

  interface KatexProps {
    math: string;
    errorColor?: string;
    renderErrorInHtml?: boolean;
    settings?: Record<string, any>;
  }

  export const InlineMath: FC<KatexProps>;
  export const BlockMath: FC<KatexProps>;
}
