import type { Schema, Attribute } from '@strapi/strapi';

export interface DropletsCallout extends Schema.Component {
  collectionName: 'components_droplets_callouts';
  info: {
    displayName: 'Callout';
    icon: 'volumeUp';
    description: '';
  };
  attributes: {
    content: Attribute.Blocks & Attribute.Required;
    type: Attribute.Enumeration<['info', 'warning']>;
  };
}

export interface DropletsExpandable extends Schema.Component {
  collectionName: 'components_droplets_expandables';
  info: {
    displayName: 'Expandable';
    icon: 'archive';
  };
  attributes: {
    title: Attribute.String & Attribute.Required;
    content: Attribute.RichText &
      Attribute.Required &
      Attribute.CustomField<
        'plugin::ckeditor.CKEditor',
        {
          output: 'HTML';
          preset: 'rich';
        }
      >;
  };
}

export interface DropletsGeneric extends Schema.Component {
  collectionName: 'components_droplets_generics';
  info: {
    displayName: 'Generic';
    icon: 'pencil';
    description: '';
  };
  attributes: {
    content: Attribute.RichText &
      Attribute.CustomField<
        'plugin::ckeditor.CKEditor',
        {
          output: 'HTML';
          preset: 'rich';
        }
      >;
  };
}

export interface DropletsVideo extends Schema.Component {
  collectionName: 'components_droplets_videos';
  info: {
    displayName: 'Video';
    icon: 'play';
  };
  attributes: {
    url: Attribute.String & Attribute.Required;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'droplets.callout': DropletsCallout;
      'droplets.expandable': DropletsExpandable;
      'droplets.generic': DropletsGeneric;
      'droplets.video': DropletsVideo;
    }
  }
}
