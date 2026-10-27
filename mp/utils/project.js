const PUBLIC_PROJECT_STATUSES = ['online', 'coming', 'full'];
const { withinScope } = require('./commercial.js');

function isPublicProject(project) {
  return Boolean(
    project &&
    PUBLIC_PROJECT_STATUSES.includes(project.status) && withinScope(project)
  );
}

module.exports = {
  PUBLIC_PROJECT_STATUSES,
  isPublicProject
};
