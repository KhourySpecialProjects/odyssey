import './CodeEditorComponent.css';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import * as React from 'react';
import { NodeViewProps } from '@tiptap/core';

interface CodeBlockProps extends NodeViewProps {
  node: NodeViewProps['node'] & {
    attrs: {
      language: string;
    };
  };
  extension: NodeViewProps['extension'] & {
    options: {
      lowlight: {
        listLanguages: () => string[];
      };
    };
  };
}

const CodeEditorComponent: React.FC<CodeBlockProps> = ({ 
  node: { attrs: { language: defaultLanguage } },
  updateAttributes,
  extension 
}) => {
  return (
    <NodeViewWrapper className="code-block">
      <select 
        contentEditable={false} 
        defaultValue={defaultLanguage} 
        onChange={(event) => updateAttributes({ language: event.target.value })}
        className="text-sm rounded-md px-2 py-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="null">
          auto
        </option>
        <option disabled>
          —
        </option>
        {extension.options.lowlight.listLanguages().map((lang: string, index: number) => (
          <option key={index} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

export { CodeEditorComponent };