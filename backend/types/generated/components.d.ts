import type { Schema, Attribute } from '@strapi/strapi';

export interface DropletsGeneric extends Schema.Component {
  collectionName: 'components_droplets_generics';
  info: {
    displayName: 'Generic';
    icon: 'pencil';
  };
  attributes: {
    content: Attribute.Blocks & Attribute.Required;
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
      'droplets.generic': DropletsGeneric;
      'droplets.video': DropletsVideo;
    }
  }
}
