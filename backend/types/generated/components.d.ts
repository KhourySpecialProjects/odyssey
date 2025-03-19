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
    type: Attribute.Enumeration<['info', 'warning']> &
      Attribute.Required &
      Attribute.DefaultTo<'info'>;
    color: Attribute.String &
      Attribute.Required &
      Attribute.DefaultTo<'bg-sky-50'>;
    iconEnabled: Attribute.Boolean & Attribute.DefaultTo<true>;
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

export interface DropletsOpenEndedQuiz extends Schema.Component {
  collectionName: 'components_droplets_open_ended_quizs';
  info: {
    displayName: 'Open Ended Quiz';
  };
  attributes: {
    questions: Attribute.Component<'quizzes.open-ended-question', true>;
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
    description: '';
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

export interface QuizzesOpenEndedQuestion extends Schema.Component {
  collectionName: 'components_quizzes_open_ended_questions';
  info: {
    displayName: 'Open Ended Question';
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
    correctAnswer: Attribute.String;
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
      'droplets.open-ended-quiz': DropletsOpenEndedQuiz;
      'droplets.quiz': DropletsQuiz;
      'droplets.resource': DropletsResource;
      'droplets.video': DropletsVideo;
      'quizzes.answer-option': QuizzesAnswerOption;
      'quizzes.open-ended-question': QuizzesOpenEndedQuestion;
      'quizzes.question': QuizzesQuestion;
    }
  }
}
