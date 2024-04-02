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

export interface DropletsLearningObjective extends Schema.Component {
  collectionName: 'components_droplets_learning_objective';
  info: {
    displayName: 'Learning Objective';
    description: '';
  };
  attributes: {
    objective: Attribute.String & Attribute.Required;
  };
}

export interface DropletsQuiz extends Schema.Component {
  collectionName: 'components_droplets_quizzes';
  info: {
    displayName: 'Quiz';
  };
  attributes: {
    questions: Attribute.Component<'quizzes.question', true> &
      Attribute.Required;
  };
}

export interface DropletsResource extends Schema.Component {
  collectionName: 'components_droplets_resources';
  info: {
    displayName: 'Resource';
  };
  attributes: {
    label: Attribute.String;
    url: Attribute.String & Attribute.Required;
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

export interface QuizzesAnswerOption extends Schema.Component {
  collectionName: 'components_quiz_answer_option';
  info: {
    displayName: 'Quiz Answer Option';
    description: '';
  };
  attributes: {
    isCorrect: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    content: Attribute.String & Attribute.Required;
  };
}

export interface QuizzesQuestion extends Schema.Component {
  collectionName: 'components_quiz_questions';
  info: {
    displayName: 'Quiz Question';
    icon: 'question';
    description: '';
  };
  attributes: {
    content: Attribute.RichText &
      Attribute.Required &
      Attribute.CustomField<
        'plugin::ckeditor.CKEditor',
        {
          output: 'HTML';
          preset: 'rich';
        }
      >;
    answerOptions: Attribute.Component<'quizzes.answer-option', true> &
      Attribute.Required;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'droplets.callout': DropletsCallout;
      'droplets.expandable': DropletsExpandable;
      'droplets.generic': DropletsGeneric;
      'droplets.learning-objective': DropletsLearningObjective;
      'droplets.quiz': DropletsQuiz;
      'droplets.resource': DropletsResource;
      'droplets.video': DropletsVideo;
      'quizzes.answer-option': QuizzesAnswerOption;
      'quizzes.question': QuizzesQuestion;
    }
  }
}
