'use strict';
// Import is explicitly initiated in options/index.html, never during rendering.
class MarkdownImporter {
    constructor(API, name, config) {
        this.API = API;
        this.name = name;
        this.config = config;
    }
}
module.exports = MarkdownImporter;
