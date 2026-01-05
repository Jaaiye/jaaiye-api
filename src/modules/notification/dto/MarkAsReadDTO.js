/**
 * Mark As Read DTO
 * Application layer - data transfer object
 * Supports flexible marking: all, ids array, or single id
 */

const { ValidationError } = require('../../common/errors');

class MarkAsReadDTO {
  constructor(body) {
    this.all = body.all === true;
    this.ids = Array.isArray(body.ids) ? body.ids : undefined;
    this.id = body.id;

    this.validate();
  }

  validate() {
    const hasAll = this.all === true;
    const hasIds = Array.isArray(this.ids) && this.ids.length > 0;
    const hasId = this.id !== undefined && this.id !== null;

    if (!hasAll && !hasIds && !hasId) {
      throw new ValidationError('Provide one of: all=true, ids=[...], or id');
    }
  }

  getFilter(userId) {
    const filter = { user: userId };

    if (this.all) {
      return filter;
    }

    if (this.ids && this.ids.length > 0) {
      filter._id = { $in: this.ids };
      return filter;
    }

    if (this.id) {
      filter._id = this.id;
      return filter;
    }

    return filter;
  }
}

module.exports = MarkAsReadDTO;

