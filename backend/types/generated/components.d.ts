import type { Schema, Struct } from '@strapi/strapi';

export interface DropletsCallout extends Struct.ComponentSchema {
  collectionName: 'components_droplets_callouts';
  info: {
    description: '';
    displayName: 'Callout';
    icon: 'volumeUp';
  };
  attributes: {
    color: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'bg-sky-50'>;
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    iconEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    type: Schema.Attribute.Enumeration<['info', 'warning']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'info'>;
  };
}

export interface DropletsDataset extends Struct.ComponentSchema {
  collectionName: 'components_droplets_datasets';
  info: {
    displayName: 'Dataset';
  };
  attributes: {
    fileSize: Schema.Attribute.Integer & Schema.Attribute.Required;
    fileType: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DropletsExpandable extends Struct.ComponentSchema {
  collectionName: 'components_droplets_expandables';
  info: {
    displayName: 'Expandable';
    icon: 'archive';
  };
  attributes: {
    content: Schema.Attribute.RichText &
      Schema.Attribute.Required &
      Schema.Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'rich';
        }
      >;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DropletsGeneric extends Struct.ComponentSchema {
  collectionName: 'components_droplets_generics';
  info: {
    description: '';
    displayName: 'Generic';
    icon: 'pencil';
  };
  attributes: {
    content: Schema.Attribute.RichText &
      Schema.Attribute.Required &
      Schema.Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'rich';
        }
      >;
  };
}

export interface DropletsLearningObjective extends Struct.ComponentSchema {
  collectionName: 'components_droplets_learning_objective';
  info: {
    description: '';
    displayName: 'Learning Objective';
  };
  attributes: {
    objective: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DropletsOpenEndedQuiz extends Struct.ComponentSchema {
  collectionName: 'components_droplets_open_ended_quizs';
  info: {
    displayName: 'Open Ended Quiz';
  };
  attributes: {
    questions: Schema.Attribute.Component<'quizzes.open-ended-question', true>;
  };
}

export interface DropletsQuiz extends Struct.ComponentSchema {
  collectionName: 'components_droplets_quizzes';
  info: {
    displayName: 'Quiz';
  };
  attributes: {
    questions: Schema.Attribute.Component<'quizzes.question', true> &
      Schema.Attribute.Required;
  };
}

export interface DropletsResource extends Struct.ComponentSchema {
  collectionName: 'components_droplets_resources';
  info: {
    displayName: 'Resource';
  };
  attributes: {
    label: Schema.Attribute.String;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DropletsVideo extends Struct.ComponentSchema {
  collectionName: 'components_droplets_videos';
  info: {
    description: '';
    displayName: 'Video';
    icon: 'play';
  };
  attributes: {
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface GalleriesGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_galleries_gallery_items';
  info: {
    description: '';
    displayName: 'GalleryItem';
    icon: 'layer';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image_urls: Schema.Attribute.JSON;
    title: Schema.Attribute.String;
  };
}

export interface QuizzesAnswerOption extends Struct.ComponentSchema {
  collectionName: 'components_quiz_answer_option';
  info: {
    description: '';
    displayName: 'Quiz Answer Option';
  };
  attributes: {
    content: Schema.Attribute.String & Schema.Attribute.Required;
    isCorrect: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface QuizzesOpenEndedQuestion extends Struct.ComponentSchema {
  collectionName: 'components_quizzes_open_ended_questions';
  info: {
    displayName: 'Open Ended Question';
  };
  attributes: {
    content: Schema.Attribute.RichText &
      Schema.Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'rich';
        }
      >;
    correctAnswer: Schema.Attribute.String;
  };
}

export interface QuizzesQuestion extends Struct.ComponentSchema {
  collectionName: 'components_quiz_questions';
  info: {
    description: '';
    displayName: 'Quiz Question';
    icon: 'question';
  };
  attributes: {
    answerOptions: Schema.Attribute.Component<'quizzes.answer-option', true> &
      Schema.Attribute.Required;
    content: Schema.Attribute.RichText &
      Schema.Attribute.Required &
      Schema.Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'rich';
        }
      >;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'droplets.callout': DropletsCallout;
      'droplets.dataset': DropletsDataset;
      'droplets.expandable': DropletsExpandable;
      'droplets.generic': DropletsGeneric;
      'droplets.learning-objective': DropletsLearningObjective;
      'droplets.open-ended-quiz': DropletsOpenEndedQuiz;
      'droplets.quiz': DropletsQuiz;
      'droplets.resource': DropletsResource;
      'droplets.video': DropletsVideo;
      'galleries.gallery-item': GalleriesGalleryItem;
      'quizzes.answer-option': QuizzesAnswerOption;
      'quizzes.open-ended-question': QuizzesOpenEndedQuestion;
      'quizzes.question': QuizzesQuestion;
    }
  }
}
