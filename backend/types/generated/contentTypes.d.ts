import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::permission'
    >;
    adminUserOwner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<['content-api', 'admin']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'content-api'>;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON & Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordTokenExpiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAccessRequestAccessRequest
  extends Struct.CollectionTypeSchema {
  collectionName: 'access_requests';
  info: {
    description: '';
    displayName: 'Access Request';
    pluralName: 'access-requests';
    singularName: 'access-request';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    affiliation: Schema.Attribute.Enumeration<
      ['undergraduateStudent', 'graduateStudent', 'faculty', 'staff', 'other']
    > &
      Schema.Attribute.Required;
    college: Schema.Attribute.Enumeration<
      [
        'BV',
        'CAMD',
        'COE',
        'CPS',
        'COS',
        'CSSH',
        'DMSB',
        'KCCS',
        'MI',
        'LAW',
        'other',
      ]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    familyName: Schema.Attribute.String & Schema.Attribute.Required;
    givenName: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::access-request.access-request'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAnnouncementAnnouncement
  extends Struct.CollectionTypeSchema {
  collectionName: 'announcements';
  info: {
    description: '';
    displayName: 'Announcement';
    pluralName: 'announcements';
    singularName: 'announcement';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorized_user: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    content: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplet: Schema.Attribute.Relation<'manyToOne', 'api::droplet.droplet'>;
    firstCreated: Schema.Attribute.DateTime & Schema.Attribute.Required;
    group: Schema.Attribute.Relation<'manyToOne', 'api::group.group'>;
    kudosGiven: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::announcement.announcement'
    > &
      Schema.Attribute.Private;
    playlist: Schema.Attribute.Relation<'manyToOne', 'api::playlist.playlist'>;
    publishedAt: Schema.Attribute.DateTime;
    readAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<
      ['playlist', 'droplet', 'friend', 'system', 'group', 'kudos']
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAuthorizedUserRoleAuthorizedUserRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'authorized_user_roles';
  info: {
    description: '';
    displayName: 'Authorized User Role';
    pluralName: 'authorized-user-roles';
    singularName: 'authorized-user-role';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorizedUsers: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::authorized-user-role.authorized-user-role'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAuthorizedUserAuthorizedUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'authorized_users';
  info: {
    description: '';
    displayName: 'Authorized User';
    pluralName: 'authorized-users';
    singularName: 'authorized-user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    announcements: Schema.Attribute.Relation<
      'oneToMany',
      'api::announcement.announcement'
    >;
    archived_groups: Schema.Attribute.Relation<
      'manyToMany',
      'api::group.group'
    >;
    bio: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 400;
      }>;
    blocked: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    created_playlists: Schema.Attribute.Relation<
      'manyToMany',
      'api::playlist.playlist'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    creationRequest: Schema.Attribute.Relation<
      'oneToOne',
      'api::creation-request.creation-request'
    >;
    droplets: Schema.Attribute.Relation<'manyToMany', 'api::droplet.droplet'>;
    dropletsFavorited: Schema.Attribute.Relation<
      'manyToMany',
      'api::droplet.droplet'
    >;
    due_dates: Schema.Attribute.Relation<'oneToMany', 'api::due-date.due-date'>;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    enrollments: Schema.Attribute.Relation<
      'oneToMany',
      'api::enrollment.enrollment'
    >;
    firstName: Schema.Attribute.String;
    firstTime: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    friendships: Schema.Attribute.Relation<
      'manyToMany',
      'api::friendship.friendship'
    >;
    gaveKudos: Schema.Attribute.Relation<
      'manyToMany',
      'api::announcement.announcement'
    >;
    github: Schema.Attribute.String;
    groupAdmin: Schema.Attribute.Relation<'manyToMany', 'api::group.group'>;
    groupManager: Schema.Attribute.Relation<'manyToMany', 'api::group.group'>;
    groups: Schema.Attribute.Relation<'manyToMany', 'api::group.group'>;
    groupsCreated: Schema.Attribute.Relation<'oneToMany', 'api::group.group'>;
    highlights: Schema.Attribute.Relation<
      'oneToMany',
      'api::highlight.highlight'
    >;
    isEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    isPublic: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lastName: Schema.Attribute.String;
    linkedin: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::authorized-user.authorized-user'
    > &
      Schema.Attribute.Private;
    playlists: Schema.Attribute.Relation<
      'manyToMany',
      'api::playlist.playlist'
    >;
    playlists_archived: Schema.Attribute.Relation<
      'manyToMany',
      'api::playlist.playlist'
    >;
    profilePhoto: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    received_requests: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    reviewers: Schema.Attribute.Relation<'manyToMany', 'api::droplet.droplet'>;
    roles: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user-role.authorized-user-role'
    >;
    sent_requests: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    timeZone: Schema.Attribute.Enumeration<
      [
        'America/New_York  ',
        'America/Chicago  ',
        'America/Denver  ',
        'America/Phoenix  ',
        'America/Los_Angeles  ',
        'America/Anchorage  ',
        'America/Honolulu  ',
        'America/Bogota  ',
        'America/Lima  ',
        'America/Caracas  ',
        'America/Santiago  ',
        'America/Argentina/Buenos_Aires  ',
        'America/Sao_Paulo  ',
        'Europe/London  ',
        'Europe/Berlin  ',
        'Europe/Paris  ',
        'Europe/Madrid  ',
        'Europe/Rome  ',
        'Europe/Athens  ',
        'Europe/Istanbul  ',
        'Europe/Moscow  ',
        'Asia/Dubai  ',
        'Asia/Kolkata  ',
        'Asia/Shanghai  ',
        'Asia/Tokyo  ',
        'Asia/Seoul  ',
        'Asia/Bangkok  ',
        'Asia/Singapore  ',
        'Asia/Jakarta  ',
        'Asia/Hong_Kong  ',
        'Australia/Sydney  ',
        'Australia/Melbourne  ',
        'Australia/Brisbane  ',
        'Pacific/Auckland  ',
        'Pacific/Fiji  ',
        'Africa/Cairo  ',
        'Africa/Johannesburg  ',
        'Africa/Lagos  ',
        'Africa/Nairobi  ',
      ]
    > &
      Schema.Attribute.DefaultTo<'America/New_York  '>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    was_blocked: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    website: Schema.Attribute.String;
  };
}

export interface ApiCreationRequestCreationRequest
  extends Struct.CollectionTypeSchema {
  collectionName: 'creation_requests';
  info: {
    description: '';
    displayName: 'Creation Request';
    pluralName: 'creation-requests';
    singularName: 'creation-request';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dropletIdea: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::creation-request.creation-request'
    > &
      Schema.Attribute.Private;
    motivation: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'oneToOne',
      'api::authorized-user.authorized-user'
    >;
    voyageNode: Schema.Attribute.Relation<
      'manyToOne',
      'api::voyage-node.voyage-node'
    >;
  };
}

export interface ApiDatasetDataset extends Struct.CollectionTypeSchema {
  collectionName: 'datasets';
  info: {
    description: '';
    displayName: 'Dataset';
    pluralName: 'datasets';
    singularName: 'dataset';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    columnCount: Schema.Attribute.Integer;
    columnNames: Schema.Attribute.JSON;
    columnTypes: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplet: Schema.Attribute.Relation<'manyToOne', 'api::droplet.droplet'> &
      Schema.Attribute.Required;
    fileSize: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 104857600;
          min: 0;
        },
        number
      >;
    fileUrl: Schema.Attribute.String & Schema.Attribute.Required;
    format: Schema.Attribute.Enumeration<['csv', 'json', 'xlsx']> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::dataset.dataset'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    rowCount: Schema.Attribute.Integer;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDropletLessonDropletLesson
  extends Struct.CollectionTypeSchema {
  collectionName: 'droplet_lessons';
  info: {
    description: '';
    displayName: 'DropletLesson';
    pluralName: 'droplet-lessons';
    singularName: 'droplet-lesson';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplet: Schema.Attribute.Relation<'manyToOne', 'api::droplet.droplet'>;
    lesson: Schema.Attribute.Relation<'manyToOne', 'api::lesson.lesson'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::droplet-lesson.droplet-lesson'
    > &
      Schema.Attribute.Private;
    orderIndex: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDropletDroplet extends Struct.CollectionTypeSchema {
  collectionName: 'droplets';
  info: {
    description: '';
    displayName: 'Droplet';
    pluralName: 'droplets';
    singularName: 'droplet';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    afterReview: Schema.Attribute.Text;
    announcements: Schema.Attribute.Relation<
      'oneToMany',
      'api::announcement.announcement'
    >;
    authorized_users: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    averageRating: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    datasets: Schema.Attribute.Relation<'oneToMany', 'api::dataset.dataset'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    difficulty: Schema.Attribute.Enumeration<
      ['beginner', 'intermediate', 'advanced']
    > &
      Schema.Attribute.Required;
    droplet_lessons: Schema.Attribute.Relation<
      'oneToMany',
      'api::droplet-lesson.droplet-lesson'
    >;
    enrollments: Schema.Attribute.Relation<
      'oneToMany',
      'api::enrollment.enrollment'
    >;
    focusArea: Schema.Attribute.Enumeration<
      ['personal', 'professional', 'technical']
    > &
      Schema.Attribute.Required;
    funFact: Schema.Attribute.Text;
    groups: Schema.Attribute.Relation<'manyToMany', 'api::group.group'>;
    inReview: Schema.Attribute.Boolean;
    isHidden: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    learningObjectives: Schema.Attribute.Component<
      'droplets.learning-objective',
      true
    > &
      Schema.Attribute.Required;
    lessons: Schema.Attribute.Relation<'manyToMany', 'api::lesson.lesson'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::droplet.droplet'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    nextSteps: Schema.Attribute.Component<'droplets.resource', true>;
    originalDropletId: Schema.Attribute.Integer;
    overview: Schema.Attribute.RichText &
      Schema.Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'light';
        }
      >;
    postrequisites: Schema.Attribute.Relation<
      'manyToMany',
      'api::droplet.droplet'
    >;
    prerequisites: Schema.Attribute.Relation<
      'manyToMany',
      'api::droplet.droplet'
    >;
    presentationEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    reviewDroplet: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['draft', 'edit', 'published']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
    type: Schema.Attribute.Enumeration<['knowledge', 'skill']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usersFavorited: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
  };
}

export interface ApiDueDateDueDate extends Struct.CollectionTypeSchema {
  collectionName: 'due_dates';
  info: {
    description: '';
    displayName: 'Due Date';
    pluralName: 'due-dates';
    singularName: 'due-date';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorized_user: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplet: Schema.Attribute.Relation<'oneToOne', 'api::droplet.droplet'>;
    dueDate: Schema.Attribute.DateTime;
    group: Schema.Attribute.Relation<'oneToOne', 'api::group.group'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::due-date.due-date'
    > &
      Schema.Attribute.Private;
    playlist: Schema.Attribute.Relation<'oneToOne', 'api::playlist.playlist'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiEnrollmentEnrollment extends Struct.CollectionTypeSchema {
  collectionName: 'enrollments';
  info: {
    description: '';
    displayName: 'Enrollment';
    pluralName: 'enrollments';
    singularName: 'enrollment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorizedUser: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    completionDate: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplet: Schema.Attribute.Relation<'manyToOne', 'api::droplet.droplet'>;
    dueDate: Schema.Attribute.DateTime;
    isArchived: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isComplete: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    isFirstTime: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::enrollment.enrollment'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Relation<'oneToMany', 'api::note.note'>;
    publishedAt: Schema.Attribute.DateTime;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    viewedLessons: Schema.Attribute.Relation<
      'manyToMany',
      'api::lesson.lesson'
    >;
  };
}

export interface ApiFriendshipFriendship extends Struct.CollectionTypeSchema {
  collectionName: 'friendships';
  info: {
    description: '';
    displayName: 'Friendship';
    pluralName: 'friendships';
    singularName: 'friendship';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorized_users: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::friendship.friendship'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGalleryGallery extends Struct.CollectionTypeSchema {
  collectionName: 'galleries';
  info: {
    description: '';
    displayName: 'Gallery';
    pluralName: 'galleries';
    singularName: 'gallery';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    items: Schema.Attribute.Component<'galleries.gallery-item', true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::gallery.gallery'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID & Schema.Attribute.Required;
    subtitle: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGroupGroup extends Struct.CollectionTypeSchema {
  collectionName: 'groups';
  info: {
    description: '';
    displayName: 'Group';
    pluralName: 'groups';
    singularName: 'group';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    admins: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    announcements: Schema.Attribute.Relation<
      'oneToMany',
      'api::announcement.announcement'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    creator: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    description: Schema.Attribute.Text;
    dropletDueDates: Schema.Attribute.JSON;
    droplets: Schema.Attribute.Relation<'manyToMany', 'api::droplet.droplet'>;
    groupName: Schema.Attribute.String & Schema.Attribute.Required;
    isArchived: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::group.group'> &
      Schema.Attribute.Private;
    managers: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    members: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    playlistDueDates: Schema.Attribute.JSON;
    playlists: Schema.Attribute.Relation<
      'manyToMany',
      'api::playlist.playlist'
    >;
    publishedAt: Schema.Attribute.DateTime;
    semester: Schema.Attribute.Enumeration<
      [
        'Open Membership',
        'Spring 2025',
        'Summer 1 2025',
        'Summer 2 2025',
        'Summer 2025',
        'Fall 2025',
        'Spring 2026',
        'Summer 1 2026',
        'Summer 2 2026',
        'Summer 2026',
        'Fall 2026',
        'Spring 2027',
        'Summer 1 2027',
        'Summer 2 2027',
        'Summer 2027',
        'Fall 2027',
      ]
    > &
      Schema.Attribute.DefaultTo<'Open Membership'>;
    slug: Schema.Attribute.UID<'groupName'> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users_archived: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    voyages: Schema.Attribute.Relation<'manyToMany', 'api::voyage.voyage'>;
  };
}

export interface ApiHighlightHighlight extends Struct.CollectionTypeSchema {
  collectionName: 'highlights';
  info: {
    description: '';
    displayName: 'Highlight';
    pluralName: 'highlights';
    singularName: 'highlight';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorized_user: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    blockId: Schema.Attribute.Integer;
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'yellow'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    lesson: Schema.Attribute.Relation<'manyToOne', 'api::lesson.lesson'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::highlight.highlight'
    > &
      Schema.Attribute.Private;
    note: Schema.Attribute.Relation<'oneToOne', 'api::note.note'>;
    position: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    text: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    yLevel: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
  };
}

export interface ApiLessonLesson extends Struct.CollectionTypeSchema {
  collectionName: 'lessons';
  info: {
    description: '';
    displayName: 'Lesson';
    pluralName: 'lessons';
    singularName: 'lesson';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    blocks: Schema.Attribute.DynamicZone<
      [
        'droplets.generic',
        'droplets.video',
        'droplets.quiz',
        'droplets.callout',
        'droplets.expandable',
        'droplets.open-ended-quiz',
      ]
    >;
    blocksV2: Schema.Attribute.JSON;
    blocksVersion: Schema.Attribute.Enumeration<['v1', 'v2']> &
      Schema.Attribute.DefaultTo<'v1'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplet_lessons: Schema.Attribute.Relation<
      'oneToMany',
      'api::droplet-lesson.droplet-lesson'
    >;
    droplets: Schema.Attribute.Relation<'manyToMany', 'api::droplet.droplet'>;
    enrollments: Schema.Attribute.Relation<
      'manyToMany',
      'api::enrollment.enrollment'
    >;
    highlights: Schema.Attribute.Relation<
      'oneToMany',
      'api::highlight.highlight'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lesson.lesson'
    > &
      Schema.Attribute.Private;
    lockedAt: Schema.Attribute.DateTime;
    lockedBy: Schema.Attribute.Relation<
      'oneToOne',
      'api::authorized-user.authorized-user'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    notes: Schema.Attribute.Relation<'oneToMany', 'api::note.note'>;
    orderIndex: Schema.Attribute.Integer;
    originalLessonId: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    type: Schema.Attribute.Enumeration<
      ['general', 'setup', 'activity', 'caseStudy']
    > &
      Schema.Attribute.DefaultTo<'general'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiNoteNote extends Struct.CollectionTypeSchema {
  collectionName: 'notes';
  info: {
    description: '';
    displayName: 'Note';
    pluralName: 'notes';
    singularName: 'note';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    content: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enrollment: Schema.Attribute.Relation<
      'manyToOne',
      'api::enrollment.enrollment'
    >;
    highlight: Schema.Attribute.Relation<
      'oneToOne',
      'api::highlight.highlight'
    >;
    lesson: Schema.Attribute.Relation<'manyToOne', 'api::lesson.lesson'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::note.note'> &
      Schema.Attribute.Private;
    positionY: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlaylistPlaylist extends Struct.CollectionTypeSchema {
  collectionName: 'playlists';
  info: {
    description: '';
    displayName: 'Playlist';
    pluralName: 'playlists';
    singularName: 'playlist';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    announcements: Schema.Attribute.Relation<
      'oneToMany',
      'api::announcement.announcement'
    >;
    authorized_users: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    authors: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    droplets: Schema.Attribute.Relation<'oneToMany', 'api::droplet.droplet'>;
    duration: Schema.Attribute.Enumeration<['short', 'medium', 'long']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'medium'>;
    groups: Schema.Attribute.Relation<'manyToMany', 'api::group.group'>;
    isArchived: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isPublic: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::playlist.playlist'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users_archived: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
  };
}

export interface ApiReportReport extends Struct.CollectionTypeSchema {
  collectionName: 'reports';
  info: {
    description: '';
    displayName: 'Report';
    pluralName: 'reports';
    singularName: 'report';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    fullName: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::report.report'
    > &
      Schema.Attribute.Private;
    path: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    time: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['bug']> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTagTag extends Struct.CollectionTypeSchema {
  collectionName: 'tags';
  info: {
    description: '';
    displayName: 'Tag';
    pluralName: 'tags';
    singularName: 'tag';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplets: Schema.Attribute.Relation<'manyToMany', 'api::droplet.droplet'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiVoyageEnrollmentVoyageEnrollment
  extends Struct.CollectionTypeSchema {
  collectionName: 'voyage_enrollments';
  info: {
    displayName: 'VoyageEnrollment';
    pluralName: 'voyage-enrollments';
    singularName: 'voyage-enrollment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorizedUser: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    completionPercentage: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enrolledAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::voyage-enrollment.voyage-enrollment'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    voyage: Schema.Attribute.Relation<'manyToOne', 'api::voyage.voyage'>;
  };
}

export interface ApiVoyageNodeCompletionVoyageNodeCompletion
  extends Struct.CollectionTypeSchema {
  collectionName: 'voyage_node_completions';
  info: {
    displayName: 'VoyageNodeCompletion';
    pluralName: 'voyage-node-completions';
    singularName: 'voyage-node-completion';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authorizedUser: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    completedAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::voyage-node-completion.voyage-node-completion'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    voyageEnrollment: Schema.Attribute.Relation<
      'manyToOne',
      'api::voyage-enrollment.voyage-enrollment'
    >;
    voyageNode: Schema.Attribute.Relation<
      'manyToOne',
      'api::voyage-node.voyage-node'
    >;
  };
}

export interface ApiVoyageNodeVoyageNode extends Struct.CollectionTypeSchema {
  collectionName: 'voyage_nodes';
  info: {
    displayName: 'VoyageNode';
    pluralName: 'voyage-nodes';
    singularName: 'voyage-node';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branchType: Schema.Attribute.Enumeration<['required', 'optional']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'required'>;
    childNodes: Schema.Attribute.Relation<
      'oneToMany',
      'api::voyage-node.voyage-node'
    >;
    claimedBy: Schema.Attribute.Relation<
      'manyToOne',
      'api::authorized-user.authorized-user'
    >;
    claimStatus: Schema.Attribute.Enumeration<
      ['unclaimed', 'claimed', 'authored']
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    droplet: Schema.Attribute.Relation<'manyToOne', 'api::droplet.droplet'>;
    isMainPath: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::voyage-node.voyage-node'
    > &
      Schema.Attribute.Private;
    nodeType: Schema.Attribute.Enumeration<['playlist', 'droplet']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'playlist'>;
    orderIndex: Schema.Attribute.Integer & Schema.Attribute.Required;
    parentNode: Schema.Attribute.Relation<
      'manyToOne',
      'api::voyage-node.voyage-node'
    >;
    playlist: Schema.Attribute.Relation<'manyToOne', 'api::playlist.playlist'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    voyage: Schema.Attribute.Relation<'manyToOne', 'api::voyage.voyage'>;
  };
}

export interface ApiVoyageVoyage extends Struct.CollectionTypeSchema {
  collectionName: 'voyages';
  info: {
    displayName: 'Voyage';
    pluralName: 'voyages';
    singularName: 'voyage';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authors: Schema.Attribute.Relation<
      'manyToMany',
      'api::authorized-user.authorized-user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    groups: Schema.Attribute.Relation<'manyToMany', 'api::group.group'>;
    isArchived: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isSequential: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::voyage.voyage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['draft', 'published']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    voyage_nodes: Schema.Attribute.Relation<
      'oneToMany',
      'api::voyage-node.voyage-node'
    >;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::access-request.access-request': ApiAccessRequestAccessRequest;
      'api::announcement.announcement': ApiAnnouncementAnnouncement;
      'api::authorized-user-role.authorized-user-role': ApiAuthorizedUserRoleAuthorizedUserRole;
      'api::authorized-user.authorized-user': ApiAuthorizedUserAuthorizedUser;
      'api::creation-request.creation-request': ApiCreationRequestCreationRequest;
      'api::dataset.dataset': ApiDatasetDataset;
      'api::droplet-lesson.droplet-lesson': ApiDropletLessonDropletLesson;
      'api::droplet.droplet': ApiDropletDroplet;
      'api::due-date.due-date': ApiDueDateDueDate;
      'api::enrollment.enrollment': ApiEnrollmentEnrollment;
      'api::friendship.friendship': ApiFriendshipFriendship;
      'api::gallery.gallery': ApiGalleryGallery;
      'api::group.group': ApiGroupGroup;
      'api::highlight.highlight': ApiHighlightHighlight;
      'api::lesson.lesson': ApiLessonLesson;
      'api::note.note': ApiNoteNote;
      'api::playlist.playlist': ApiPlaylistPlaylist;
      'api::report.report': ApiReportReport;
      'api::tag.tag': ApiTagTag;
      'api::voyage-enrollment.voyage-enrollment': ApiVoyageEnrollmentVoyageEnrollment;
      'api::voyage-node-completion.voyage-node-completion': ApiVoyageNodeCompletionVoyageNodeCompletion;
      'api::voyage-node.voyage-node': ApiVoyageNodeVoyageNode;
      'api::voyage.voyage': ApiVoyageVoyage;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
