export class MeetConfigError extends Error {
  constructor(message = 'Google Meet integration is not configured.') {
    super(message);
    this.name = 'MeetConfigError';
    Object.setPrototypeOf(this, MeetConfigError.prototype);
  }
}

export class MeetAuthError extends Error {
  constructor(message = 'Google Meet authentication failed.') {
    super(message);
    this.name = 'MeetAuthError';
    Object.setPrototypeOf(this, MeetAuthError.prototype);
  }
}

export class MeetSpaceError extends Error {
  constructor(message = 'Google Meet space creation or retrieval failed.') {
    super(message);
    this.name = 'MeetSpaceError';
    Object.setPrototypeOf(this, MeetSpaceError.prototype);
  }
}

export class MeetWebhookError extends Error {
  constructor(message = 'Invalid Google Meet webhook or Pub/Sub payload.') {
    super(message);
    this.name = 'MeetWebhookError';
    Object.setPrototypeOf(this, MeetWebhookError.prototype);
  }
}

export class MeetDuplicateError extends Error {
  constructor(message = 'A meeting session already exists for this class instance.') {
    super(message);
    this.name = 'MeetDuplicateError';
    Object.setPrototypeOf(this, MeetDuplicateError.prototype);
  }
}

